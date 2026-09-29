# x402 Micropayment Example

SolSentry exposes 10 curated agent endpoints behind the **standard x402
payment gateway** at the `/x402/v1/*` route prefix. This is the
[Solana Foundation x402 standard](https://x402.org/) (the same scheme the
`pay.sh` / `solana-foundation/pay-skills` listing probes): the client signs a
payment, sends it in an `X-PAYMENT` header, the server verifies + settles via a
facilitator, then returns the data.

> The free `/v1/*` routes (site, MCP tools, read endpoints) stay free and
> unauthenticated. Paid access goes through the `/x402/v1/*` mirror. A few
> expensive `/v1/*` routes (for example dossier and drain-trace) can be
> payment-gated depending on server configuration, so agents that want to
> pay should use the `/x402/v1/*` path.

## Endpoints and prices

Prices are USDC on Solana mainnet, from the pricing catalog
(`core.pricing.X402_GATEWAY_CATALOG_USDC` — the single source of truth). The
price in the live 402 challenge is authoritative: its `amount` (raw USDC
units, 6 decimals) is what you pay. Treat the table below as a reference,
not a hardcoded contract, and prices can change.

| Endpoint | Method | Price (USDC) |
|---|---|---|
| `/x402/v1/operator/{wallet}` | GET | $0.008 |
| `/x402/v1/token/{mint}` | GET | $0.008 |
| `/x402/v1/predictions/{mint}` | GET | $0.004 |
| `/x402/v1/contract-analysis/{program_id}` | GET | $0.01 |
| `/x402/v1/lookalike-check` | GET | $0.004 |
| `/x402/v1/tx-preview` | POST | $0.008 |
| `/x402/v1/holders/{mint}` | GET | $0.007 |
| `/x402/v1/drain-trace/{wallet}` | GET | $0.05 |
| `/x402/v1/dossier/{wallet}` | GET | $0.50 |
| `/x402/v1/xwatch/{user_id}` | POST | $5.00 |

`xwatch` activates a 30-day watch on a numeric X user id; `user_id` must be
the numeric id, not the handle.

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

`drain-trace` is **free** only for a wallet that is confirmed on-chain as a
drained victim. The free path is
`GET /v1/drain-trace/{wallet}?verified=1`: the server first checks the wallet
on-chain, and only if it verifies as a victim does it run the trace without
payment (the response then carries `free_via_victimhood: true` and a
`victim_verdict`). If the check does not confirm the wallet as a victim, or
`verified=1` is not passed, the request goes through the normal payment
gate. Receiving a SolSentry alert is not what makes it free; on-chain
victimhood is. You can pre-check a wallet for free with
`GET /v1/victim-check/{wallet}`.

Everyone else pays through `/x402/v1/drain-trace/{wallet}`.

## Ledger transparency

x402 activity is aggregated at `GET /v1/x402/stats` (query counts, settled
USDC, unique clients, per-tool breakdown for public tools, treasury wallet).
Individual payment events are not exposed — only aggregates — so a consumer can verify the protocol is
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
