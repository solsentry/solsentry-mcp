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

This workflow uses the **REST API directly**. The MCP server exposes only 4
tools (`check_operator`, `check_token`, `get_network_stats`, `explain_risk`);
no MCP tool exposes drain-trace, operator timeline or clusters, so call those
endpoints over HTTP.

| Step | Tool / Endpoint | Purpose |
|---|---|---|
| 1 | `check_operator(suspect_wallet)` (MCP) | Background on the wallet involved |
| 2 | `GET /v1/drain-trace/{wallet}` (REST) | Multi-hop SOL flow trace toward exchanges, mixers, bridges |
| 3 | `GET /v1/operator/{wallet}/timeline` (REST) | Chronological deployment history (`tokens[]` with `deployed_at`, plus `buckets_daily`) |
| 4 | `GET /v1/clusters` + `GET /v1/cluster/{id}` (REST) | Identify if the suspect was coordinated with others |

## Drain-trace details

The drain-trace endpoint follows SOL outflows from a target wallet and
classifies where each hop lands.

Query parameters:

| Param | Range | Default | Meaning |
|---|---|---|---|
| `max_hops` | 1-15 | 10 | Maximum hop depth to follow |
| `max_txs` | 1-50 | 20 | Transactions examined per hop |
| `token` | string | empty | Optional token name for the report context |
| `risk` | 0-100 | 0 | Optional risk score of the origin token, echoed back |
| `verified` | `1` / `true` | off | Ask the server to check victimhood on-chain (see pricing) |

Each hop has a `destination_category`, one of:

- `exchanges` — known centralized exchange address
- `mixers` — privacy mixer
- `bridges` — cross-chain bridge
- `scam_known` — wallet already tagged as a known scam wallet
- `unknown` — anything not recognised (the default)

Response fields: `wallet`, `origin_token`, `origin_risk`, `hop_count`,
`total_sol_drained`, `reached_cex`, `reached_mixer`, `hops[]`, `endpoints`,
`spl_outflows`, `trace_time_ms`, `latency_ms`, `free_via_victimhood`,
`victim_verdict`, `cloak_proof`. Optional when present: `coverage`,
`scanner_findings`, `scanner_errors`, `typed_moves`. Each entry of `hops[]`
has `hop_number`, `from`, `to`, `amount_sol`, `tx_signature`, `timestamp`,
`destination_label`, `destination_category`, and optionally `to_entity` and
`to_operator` when the destination is a recognised entity or tracked
operator. `hops` is a flat list ordered by `hop_number`, not a nested tree.

**Pricing:** drain-trace is a paid endpoint via x402 micropayments
(`/x402/v1/drain-trace/{wallet}`). The price in the live 402 challenge is
authoritative; see `docs/x402-example.md`. It is **free only for a wallet
confirmed on-chain as a drained victim**: call
`GET /v1/drain-trace/{wallet}?verified=1`, and if the server verifies the
wallet as a victim the trace runs without payment
(`free_via_victimhood: true`). You can pre-check with the free
`GET /v1/victim-check/{wallet}`. Otherwise the request goes through the
payment gate.

```bash
# Victim path (free if the wallet verifies as drained)
curl "https://api.solsentry.app/v1/drain-trace/<WALLET_ADDRESS>?verified=1&max_hops=10"

# Everyone else: pay via the x402 gateway (see docs/x402-example.md)
curl https://api.solsentry.app/x402/v1/drain-trace/<WALLET_ADDRESS>
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
   → Returns a flat hops[] list. Map endpoints to exchange deposits, bridge entries.

4. Identify accomplices:
   For each intermediate hop, check_operator() to see if any
   are themselves known operators (cluster behavior).

5. Cluster lookup:
   If 2+ intermediate wallets are also flagged operators,
   check GET /v1/operator/{wallet}/network (cluster memberships) or
   GET /v1/clusters to see if they're already grouped as a known bot cluster.

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
- More than `max_txs` transactions per hop, or more than `max_hops` levels (raise the params, up to their caps)

Treat the trace as evidence of what flowed where, not proof of who
controls the destination.
