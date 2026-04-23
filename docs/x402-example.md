# x402 Micropayment Example

SolSentry's drain-trace endpoint (`/v1/drain-trace/{wallet}`) is the only
public endpoint that requires payment. Payment uses the [x402 protocol](https://x402.org/)
— HTTP 402 Payment Required, designed for AI agent micropayments.

This document shows the protocol headers, the payment flow, and a
reference implementation.

## Why x402 (and not API keys)

API keys require:
- A signup flow (email, password, billing form)
- Server-side rate limiting per key
- Key rotation and revocation infrastructure
- A relationship between SolSentry and every consumer

x402 requires:
- A USDC transfer on Solana
- Verification of that transfer on the next request
- Zero account state on either side

For AI agents that may run for minutes and want to query SolSentry once
without ever creating an account, x402 is dramatically lower friction.

## Protocol headers

Every drain-trace response includes these headers:

```
X-Payment-Required: true
X-Price-USDC: 0.001
X-Payment-Address: <SolSentry treasury wallet>
X-Payment-Network: solana-mainnet
X-Payment-Token: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
X-Payment-Protocol: x402
```

Where:
- `X-Price-USDC` is the per-query price ($0.001 USDC at time of writing)
- `X-Payment-Token` is the SPL mint for USDC on Solana mainnet
- `X-Payment-Protocol` identifies x402 specifically (vs. other 402 schemes)

## Payment flow

```
1. Client → GET /v1/drain-trace/{wallet}
2. Server → 402 Payment Required + X-Payment-* headers
3. Client → constructs USDC transfer to X-Payment-Address
4. Client → broadcasts transfer tx to Solana mainnet
5. Client → re-requests endpoint with X-Payment: <signed payload>
6. Server → verifies on-chain transfer matches expected amount + recipient
7. Server → 200 OK + drain trace data
```

## Free for verified victims

If the requesting wallet is one that previously **received** a drain
alert from SolSentry (i.e., it was identified as a victim before the
rug executed), drain-trace on **that wallet** is free. This is enforced
by the server checking the alert history for the wallet on each request.

To claim victim status, include the alert ID in the request:

```
X-Victim-Alert-ID: <uuid-from-original-alert>
```

The server verifies the alert ID belongs to the wallet being traced. If
verified, no payment is required for that wallet's trace.

## Reference TypeScript implementation

```typescript
import { SolSentryClient } from "@solsentry/mcp/client";

async function paidDrainTrace(wallet: string, victimAlertId?: string) {
  const sol = new SolSentryClient();

  // Try free first (in case caller is a verified victim)
  try {
    return await sol.get(`/v1/drain-trace/${wallet}`, {
      headers: victimAlertId ? { "X-Victim-Alert-ID": victimAlertId } : {},
    });
  } catch (err) {
    if (err.status !== 402) throw err;

    // Pay via x402: construct USDC transfer per the headers
    const paymentAddr = err.headers["x-payment-address"];
    const priceUsdc = parseFloat(err.headers["x-price-usdc"]);

    const txSignature = await sendUsdcOnSolana({
      to: paymentAddr,
      amount: priceUsdc,
      // your wallet adapter signs and broadcasts
    });

    // Retry with proof of payment
    return await sol.get(`/v1/drain-trace/${wallet}`, {
      headers: {
        "X-Payment": JSON.stringify({
          tx_signature: txSignature,
          paid_amount_usdc: priceUsdc,
        }),
      },
    });
  }
}
```

## Ledger transparency

All x402 payments are logged to a public ledger queryable via:

```
GET /v1/x402/stats
→ {
    "total_queries": 12345,
    "total_usdc_billed": 12.345,
    "unique_clients": 89,
    "by_tool": { "drain_trace": 12345 }
  }
```

The ledger does not expose individual payment events (privacy), only
aggregates. This is sufficient for the user to verify the protocol is
operating as advertised without exposing query patterns.

## Current state

x402 enforcement on drain-trace is **tracking-only** at the time of
writing — queries are logged with `paid: false` until on-chain
verification is wired into the production gate. The protocol headers
are returned correctly; full enforcement ships with the next release.

## See also

- [x402 protocol spec](https://x402.org/)
- [USDC on Solana](https://www.circle.com/usdc)
- [docs/risk-scoring.md](risk-scoring.md) — how the data being paid for is generated
- [docs/openapi.yaml](openapi.yaml) — full API surface
