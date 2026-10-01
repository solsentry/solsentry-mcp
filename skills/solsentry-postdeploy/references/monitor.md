# Reference: monitor

Continuous post-deploy monitoring of a shipped Solana program or token.
Use this when the user has already deployed something and wants ongoing
visibility on activity touching it.

## When to use

- User deployed a program last week and wants alerts on suspicious interactions
- User launched a token and wants to know if known bundlers are buying
- User is responsible for an active dApp and wants market-wide threat awareness
- User wants the recent alerts feed for context (what's happening on Solana right now)

## Tools to call

This workflow uses the **REST API directly**. The MCP server exposes only 4
tools (`check_operator`, `check_token`, `get_network_stats`, `explain_risk`);
no MCP tool exposes alerts, resolutions or clusters, so call those endpoints
over HTTP.

| Tool / endpoint | Purpose |
|---|---|
| `check_operator(wallet)` (MCP) | Used reactively — when a specific wallet shows up in their program logs |
| `GET /v1/alerts/recent` (REST) | What's happening market-wide right now |
| `GET /v1/resolutions/recent` (REST) | Which prior alerts were confirmed as rugs |
| `GET /v1/clusters` (REST) | Identify if interactions come from coordinated bot networks |

## Endpoints

```
GET /v1/alerts/recent?limit=20&min_risk=70&since=<unix_ts>
  → Recent alerts at or above min_risk (default 70, so HIGH/CRITICAL-range scores)
  → {count, server_time, latency_ms, alerts[]}
  → alert: mint, symbol, risk_score, risk_level, predicted_at (unix s),
    age_seconds, dev_wallet, dev_known, dev_confirmed_rugs, flags[],
    platform, pump_stage, is_bundle, liquidity_usd, final_outcome

GET /v1/resolutions/recent?limit=20&window_hours=24&correct_only=false
  → Recent confirmations of prior alerts (was_correct: true/false)
  → {resolutions[], count, latency_ms, plus an accuracy summary for the window}
  → resolution: mint, symbol, predicted_risk, predicted_level, final_outcome,
    was_correct, predicted_at, resolved_at (unix s), resolve_latency_hours,
    dev_wallet

GET /v1/clusters?limit=10&sort=recent
  → Bot clusters (sort = risk | size | recent)

GET /v1/cluster/{cluster_id}
  → Cluster detail: members, associated tokens, edges
```

`limit` caps: 100 for alerts, 200 for resolutions, 200 for clusters. Alert
`flags` are display strings with an emoji prefix; match on the flag name
(see `docs/flags.md`). The resolutions accuracy summary is a window figure;
for system-wide numbers use `/v1/stats`.

## Workflow patterns

**Pattern 1 — passive market awareness:**

```bash
# Once a day, fetch top 20 recent alerts
curl https://api.solsentry.app/v1/alerts/recent?limit=20
```

Surface to user: "X new HIGH/CRITICAL alerts in the last 24h. Most active
deployer (`dev_wallet`): <WALLET_ADDRESS>." Use `since=<unix_ts>` to fetch only
alerts newer than your last poll.

**Pattern 2 — reactive on observed wallet:**

When the user inspects their program's recent transactions and sees a
wallet they don't recognize:

```bash
curl https://api.solsentry.app/v1/operator/{observed_wallet}
```

If `risk_level` ≥ MEDIUM, warn the user. An unknown wallet returns HTTP 200
with `known: false`, which is not a clean record. If `attribution` is
`unverified`, the counts are withheld; do not read them as zero rugs. Suggest:
- Add a denylist for known operators
- Implement a delay on high-value operations
- Investigate further with `forensics` reference

**Pattern 3 — cluster identification:**

If multiple unfamiliar wallets show up in a short window, check if they
belong to the same cluster:

```bash
curl "https://api.solsentry.app/v1/clusters?limit=5"
```

The cluster list cannot be filtered by wallet; use
`GET /v1/operator/{wallet}/network` to see which clusters one wallet belongs
to. A coordinated cluster touching your program is a signal worth
investigating, not proof of intent.

## Output guidance

Frame monitoring output as **situational awareness**, not alarm. False
positives are possible at LOW thresholds. Reserve emphatic language for
CRITICAL.

## Common pitfall

Do not poll endpoints aggressively. Server-side caches refresh every few
seconds to a couple of minutes depending on the route (alerts about 5s,
resolutions 30s, clusters 120s), so faster polling only returns the same
data. Set polling intervals at 30s minimum, and much longer for clusters.
