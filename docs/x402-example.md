# x402 Micropayment Example

SolSentry exposes its 9 curated agent endpoints behind the **standard x402
payment gateway** at the `/x402/v1/*` route prefix. This is the
[Solana Foundation x402 standard](https://x402.org/) (the same scheme the
`pay.sh` / `solana-foundation/pay-skills` listing probes): the client signs a
payment, sends it in an `X-PAYMENT` header, the server verifies + settles via a
facilitator, then returns the data.

> The free `/v1/*` routes (site, MCP tools, read endpoints) stay free and
> unauthenticated. Payment applies only to the `/x402/v1/*` mirror.

## Endpoints and prices

Prices are USDC on Solana mainnet, from the pricing catalog
(`core.pricing.X402_GATEWAY_CATALOG_USDC` — the single source of truth). The
402 challenge always carries the authoritative `amount` (in raw USDC units,
6 decimals); treat these as reference, not a hardcoded contract.

| Endpoint | Method | Price (USDC) |
|---|---|---|
| `/x402/v1/operator/{wallet}` | GET | $0.002 |
| `/x402/v1/token/{mint}` | GET | $0.003 |
| `/x402/v1/predictions/{mint}` | GET | $0.002 |
| `/x402/v1/contract-analysis/{program_id}` | GET | $0.01 |
| `/x402/v1/lookalike-check` | GET | $0.003 |
| `/x402/v1/tx-preview` | POST | $0.008 |
| `/x402/v1/holders/{mint}` | GET | $0.005 |
| `/x402/v1/drain-trace/{wallet}` | GET | $0.05 |
| `/x402/v1/dossier/{wallet}` | GET | $0.50 |

## Why x402 (and not API keys)

API keys require a signup flow, per-key rate limiting, rotation/revocation, and
a standing relationship between SolSentry and every consumer. x402 requires a
one-shot USDC transfer verified on-chain — zero account state on either side.
For an AI agent that queries SolSentry once mid-run and never creates an
account, that is dramatically lower friction.

## The 402 challenge

An unpaid request returns `402 Payment Required` with a `PAYMENT-REQUIRED`
header and a JSON body in the x402 v2 shape:

```jsonc
// GET /x402/v1/dossier/{wallet}   (no payment)
{
  "x402Version": 2,
  "error": "payment required",
  "resource": { "url": "/x402/v1/dossier/{wallet}" },
  "accepts": [
    {
      "scheme": "exact",
      "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",  // Solana mainnet (CAIP-2)
      "asset":   "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC mint
      "amount":  "500000",          // raw USDC (6 decimals) -> $0.50
      "payTo":   "<SolSentry treasury wallet>",
      "maxTimeoutSeconds": 300,
      "extra":   { "feePayer": "<facilitator fee payer>" }
    }
  ]
}
```

## Payment flow

```
1. Client → GET  /x402/v1/{tool}                (no payment)
2. Server → 402 Payment Required + accepts[]     (challenge above)
3. Client → build a payment for accepts[0] (exact/USDC/mainnet) and sign it
4. Client → re-request with  X-PAYMENT: <base64 payload>
5. Server → verifies + settles via the facilitator
6. Server → 200 OK + data  (+ X-PAYMENT-RESPONSE settlement receipt header)
```

Use the official x402 client tooling to build step 3 — the SVM `exact` scheme
constructs the partially-signed USDC transfer from the `accepts` entry (the
`feePayer` in `extra` is required). Do not hand-roll the payload.

### TypeScript (x402 client)

```ts
import { wrapFetchWithPayment } from "x402-fetch";
import { createSigner } from "x402/client"; // your Solana signer

const signer = createSigner("solana", process.env.SOLANA_PRIVATE_KEY!);
const fetchWithPay = wrapFetchWithPayment(fetch, signer);

// The wrapper handles the 402 → sign → retry loop transparently.
const res  = await fetchWithPay("https://api.solsentry.app/x402/v1/dossier/" + wallet);
const data = await res.json();
```

### Python (x402 client)

```python
from x402.clients.requests import x402_requests

session = x402_requests(account)  # a solders Keypair-backed account
r = session.get("https://api.solsentry.app/x402/v1/drain-trace/" + wallet)
r.raise_for_status()
data = r.json()
```

See `ops/tools/nansen_x402_probe.py` in the main repo for a from-scratch
reference (parse the 402, pick the `exact`/mainnet/USDC rail, pre-flight the
treasury balance, build + partial-sign, retry with the payment header).

## Free for verified victims

`drain-trace` is **free** for a wallet that previously *received* a SolSentry
drain alert (a confirmed victim). The `/v1/drain-trace/{wallet}` route serves
these without payment; the `/x402/v1/drain-trace/{wallet}` gateway is the paid
path for everyone else.

## Ledger transparency

x402 activity is aggregated at `GET /v1/x402/stats` (query counts, billed USDC,
unique clients, per-tool breakdown, treasury wallet). Individual payment events
are not exposed — only aggregates — so a consumer can verify the protocol is
operating without exposing query patterns.

## Facilitator note

The 402 *challenge* is built offline from the SDK scheme (no network call), so
unauthenticated probes never hit a facilitator. *Settlement* of a real payment
needs a facilitator that supports the network: Solana **mainnet** settlement
uses the CDP (Coinbase Developer Platform) facilitator; the public
`x402.org` facilitator only advertises Solana **devnet** (useful for free
devnet end-to-end testing before flipping mainnet creds on).

## See also

- [x402 protocol spec](https://x402.org/)
- [USDC on Solana](https://www.circle.com/usdc)
- [docs/openapi.yaml](openapi.yaml) — full API surface
- [docs/risk-scoring.md](risk-scoring.md) — how the data being paid for is generated
