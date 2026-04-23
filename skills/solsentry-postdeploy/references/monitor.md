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

| Tool | Purpose |
|---|---|
| `check_operator(wallet)` | Used reactively — when a specific wallet shows up in their program logs |
| Recent alerts feed | What's happening market-wide right now |
| Recent resolutions | Which prior alerts were confirmed as rugs |
| Cluster lookup | Identify if interactions come from coordinated bot networks |

## Endpoints

```
GET /v1/alerts/recent?limit=20
  → Recent CRITICAL/HIGH alerts issued by SolSentry across mainnet

GET /v1/resolutions/recent?limit=20
  → Recent confirmations of prior alerts (was_correct: true/false)

GET /v1/clusters?limit=10
  → Top bot clusters (sorted by activity)

GET /v1/cluster/{cluster_id}
  → Cluster detail: members, common patterns, associated operators
```

## Workflow patterns

**Pattern 1 — passive market awareness:**

```bash
# Once a day, fetch top 20 recent alerts
curl https://api.solsentry.app/v1/alerts/recent?limit=20
```

Surface to user: "X new HIGH/CRITICAL alerts in the last 24h. Most active
operator: <wallet>. Most active cluster: <cluster_id>."

**Pattern 2 — reactive on observed wallet:**

When the user inspects their program's recent transactions and sees a
wallet they don't recognize:

```bash
curl https://api.solsentry.app/v1/operator/{observed_wallet}
```

If `risk_level` ≥ MEDIUM, warn the user. Suggest:
- Add a denylist for known operators
- Implement a delay on high-value operations
- Investigate further with `forensics` reference

**Pattern 3 — cluster identification:**

If multiple unfamiliar wallets show up in a short window, check if they
belong to the same cluster:

```bash
curl "https://api.solsentry.app/v1/clusters?limit=5"
```

A coordinated cluster touching your program is a strong signal of
intentional probing or attack preparation.

## Output guidance

Frame monitoring output as **situational awareness**, not alarm. False
positives are possible at LOW thresholds. Reserve emphatic language for
CRITICAL.

## Common pitfall

Do not poll endpoints aggressively. The data is updated every 30 seconds
on the server side — polling more frequently than that wastes credits and
gives stale data anyway. Set polling intervals at 30s minimum.
