# Reference: forensics

Post-incident forensics for Solana drains, exploits, or suspicious flows.
Use this when the user reports something already happened and needs a
post-mortem trace.

## When to use

- User says "my LP got drained"
- User says "tokens disappeared from my vault"
- User mentions an exploit or hack
- User wants to trace where SOL went after a known rug event
- User is documenting an incident for a public post-mortem

## Tools to call

| Step | Tool / Endpoint | Purpose |
|---|---|---|
| 1 | `check_operator(suspect_wallet)` | Background on the wallet involved |
| 2 | `GET /v1/drain-trace/{wallet}` | 10-hop SOL flow trace through mixers, bridges, CEXs |
| 3 | `GET /v1/operator/{wallet}/timeline` | Chronological deployment / activity history |
| 4 | `GET /v1/clusters` + `cluster/{id}` | Identify if the suspect was coordinated with others |

## Drain-trace details

The drain-trace endpoint follows SOL outflows from a target wallet up to
**10 hops**, classifying each hop as:

- `cex` — known centralized exchange deposit address
- `bridge` — cross-chain bridge entry
- `mixer` — privacy mixer (Tornado-style equivalents on Solana)
- `intermediate` — pass-through wallet (often single-use, bot-owned)
- `terminal` — endpoint of the trace (further movement not tracked)

**Pricing:** drain-trace is a paid endpoint via x402 micropayments. **Free
for verified victims** — if the wallet that received the original rug alert
from SolSentry is the one running the trace, the cost is waived. See
`docs/x402-example.md` for payment integration.

```bash
curl https://api.solsentry.app/v1/drain-trace/{wallet}
# Headers: X-PAYMENT: <x402-payload> for non-victims
```

## Workflow

```
1. User reports: "Wallet X drained my pool at <timestamp>"

2. Confirm the suspect:
   check_operator(wallet=X)
   → If CRITICAL/HIGH: known operator, expected behavior
   → If UNKNOWN: new operator, more interesting investigation

3. Trace the SOL:
   GET /v1/drain-trace/X
   → Returns hop tree. Map endpoints to CEX deposits, bridge entries.

4. Identify accomplices:
   For each intermediate hop, check_operator() to see if any
   are themselves known operators (cluster behavior).

5. Cluster lookup:
   If 2+ intermediate wallets are also flagged operators,
   query GET /v1/clusters to see if they're already grouped
   as a known bot cluster.

6. Output: a chain of evidence the user can cite in an
   incident report or hand to law enforcement / chain analysts.
```

## Output guidance

Forensic output should be:
- **Reproducible** — every claim has an `address`, `tx_signature`, or `cluster_id` cited
- **Timestamped** — use the timestamps returned by the API, not "today"
- **Scoped** — say "trace went cold at hop 7" rather than implying the trace is exhaustive
- **Action-oriented** — end with "what the user can do now" (file with CEX, contact bridge ops, public disclosure)

## Common pitfall

Drain-trace shows **on-chain SOL flow**. It does not see:

- Wrapped tokens that get unwrapped to native SOL elsewhere
- CEX internal book transfers (off-chain)
- Wallets that haven't been observed yet by the scanner

Treat the trace as evidence of what flowed where, not proof of who
controls the destination.
