# Reference: cluster-graph

Network exploration of operator and bot cluster relationships. Use this
when the user is doing research, journalism, or threat-hunting — they
want to understand the **graph** around an address, not just the address itself.

## When to use

- User is investigating a scam pattern across multiple tokens
- User is mapping a known operator's network of helpers / shills
- User is researching an exploit retroactively
- User is writing a public post-mortem about a coordinated attack
- User asks "who else is connected to this wallet?"
- Threat hunter / journalist / DAO security team use case

## Tools to call

| Step | Endpoint | Purpose |
|---|---|---|
| 1 | `GET /v1/clusters?limit=20` | Top active bot clusters in the system |
| 2 | `GET /v1/cluster/{cluster_id}` | Members + common patterns + associated operators of one cluster |
| 3 | `GET /v1/operator/{wallet}/timeline` | Chronological history — what tokens this operator has touched |
| 4 | `check_operator(wallet)` for each member | Risk profile per node |

## Cluster data shape

```json
{
  "cluster_id": "c_8a7f3...",
  "size": 42,
  "patterns": [
    "synchronized_buys",
    "shared_funding_wallet",
    "common_deploy_window"
  ],
  "associated_operators": ["4kxscute...", "Hg7K..."],
  "tokens_involved": 18,
  "first_observed": 1772401200,
  "last_observed": 1776899451,
  "members": [
    { "wallet": "...", "role": "deployer" | "buyer" | "lp_remover" | "shill" }
  ]
}
```

## Workflow patterns

**Pattern 1 — start from a token:**

```
1. User reports: "This token <mint> looks rugged."
2. check_token(mint) → returns deployer
3. check_operator(deployer) → confirms operator history
4. GET /v1/operator/{deployer}/timeline → find other tokens by same dev
5. For each related token, check if buyers overlap → cluster signal
6. GET /v1/clusters → match observed pattern to known cluster
```

**Pattern 2 — start from a wallet:**

```
1. User asks: "Who works with <wallet>?"
2. check_operator(wallet) → risk + tags
3. GET /v1/clusters → find cluster_id where wallet appears
4. GET /v1/cluster/{cluster_id} → full member list + roles
5. For top 5 members, recursively check_operator()
```

**Pattern 3 — start from a known cluster:**

```
1. User wants to map "the cluster behind X attacks"
2. GET /v1/clusters → identify cluster by pattern signature
3. GET /v1/cluster/{cluster_id} → member graph
4. Visualize as nodes + edges (deployer → buyer → lp_remover)
```

## Output guidance

Cluster output is most useful when **structured**, not narrative.

Recommended output formats:
- **Member table** — wallet · role · risk_level · confirmed_rugs · tags
- **Mermaid graph** — nodes are wallets, edges are observed interactions
- **Timeline** — chronological tokens touched by the cluster, with rug confirmations marked

Do not flatten into prose — researchers want the data, not a story.

## Common pitfall

Cluster membership is **inferred from on-chain behavior**, not from
explicit declarations. A wallet that consistently appears alongside
known ruggers is grouped with them, but this is correlation, not proof
of coordination. Always include this caveat:

> "Cluster membership reflects observed on-chain co-activity. It is
> evidence of a pattern, not proof of off-chain coordination."

## When NOT to use this reference

If the user is just trying to check if ONE specific wallet is risky,
use `threat-intel.md` instead. Cluster graph exploration is overkill
for single-address lookups.
