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

This workflow uses the **REST API directly**. The MCP server exposes only 4
tools (`check_operator`, `check_token`, `get_network_stats`, `explain_risk`);
no MCP tool exposes clusters or the operator timeline, so call those
endpoints over HTTP. These cluster routes can be slow (several seconds); use
a generous timeout and do not poll.

| Step | Endpoint / tool | Purpose |
|---|---|---|
| 1 | `GET /v1/clusters?limit=20&sort=risk` (REST) | Bot clusters in the registry (see params below) |
| 2 | `GET /v1/cluster/{cluster_id}` (REST) | Members, associated tokens and edges of one cluster |
| 3 | `GET /v1/operator/{wallet}/timeline` (REST) | Chronological history: `tokens[]` with `deployed_at`, plus `buckets_daily` |
| 4 | `GET /v1/operator/{wallet}/network` (REST) | Bounded graph (`nodes`, `edges`) around one operator; nodes with `kind: "cluster"` carry the `cluster_id` of its memberships |
| 5 | `check_operator(wallet)` (MCP) for each member | Risk profile per node |

`/v1/clusters` query params: `limit` (1-200, default 50), `min_size` (2-100,
default 5), `sort` (`risk` default, `size` or `recent`), `since` (unix
timestamp). There is no filter by wallet: the list only shows up to 5
`sample_wallets` and 5 `operators` per cluster, so to find the clusters a
given wallet belongs to, use `/v1/operator/{wallet}/network`, then open each
cluster with `/v1/cluster/{cluster_id}`.

## Cluster data shape

`GET /v1/clusters` returns `{count, total_clusters, latency_ms, clusters[]}`
where each cluster looks like this (illustrative values):

```json
{
  "cluster_id": "cluster_<unix_ts>_<n>",
  "size": 42,
  "first_seen": 1772401200,
  "last_seen": 1776899451,
  "shared_funding_source": null,
  "funding_source_classification": null,
  "associated_rugs": 12,
  "associated_tokens": 18,
  "risk_score": 90,
  "risk_level": "HIGH",
  "tags": ["high_avg_risk"],
  "sample_wallets": ["<WALLET_A>", "<WALLET_B>"],
  "operators": ["<WALLET_A>"]
}
```

`GET /v1/cluster/{cluster_id}` returns the detail (HTTP 404 if the id is
unknown). Here `associated_tokens` is a list, not a count:

```json
{
  "cluster_id": "cluster_<unix_ts>_<n>",
  "size": 42,
  "first_seen": 1772401200,
  "last_seen": 1776899451,
  "shared_funding_source": null,
  "funding_source_classification": null,
  "risk_level": "HIGH",
  "risk_score": 90,
  "tags": ["high_avg_risk"],
  "members": [
    {
      "wallet": "<WALLET_A>",
      "first_seen": 1772401200,
      "tokens_deployed": 5,
      "confirmed_rugs": 3,
      "role": "operator"
    },
    { "wallet": "<WALLET_B>", "first_seen": 1772401200, "tokens_deployed": 0, "confirmed_rugs": 0, "role": "buyer" }
  ],
  "associated_tokens": [
    { "mint": "<MINT>", "final_outcome": "pending", "predicted_at": 1776000000, "buyers_from_cluster": 0 }
  ],
  "edges": [
    { "from": "<WALLET_A>", "to": "<WALLET_B>", "type": "shared_funding", "weight": 0.9 }
  ]
}
```

Notes:

- `role` is `operator` (the wallet is a tracked token deployer) or `buyer`.
  There are no `deployer`, `lp_remover` or `shill` roles.
- `tags` are pattern labels such as `high_avg_risk`. There is no `patterns`
  or `associated_operators` field; operators are the members whose role is
  `operator`.
- `edges` are only emitted when the cluster has a `shared_funding_source`,
  and are then a `shared_funding` star, so the list is often empty.
- A member with `attribution: "unverified"` keeps its place in the cluster
  but serves no deploy-derived counts (zeroed, not clean).
- `buyers_from_cluster` is currently always `0`; do not rely on it.
- `risk_level` and `risk_score` of a cluster are registry-level indicators of
  the group, not a verdict on each member. Check members individually.

## Workflow patterns

**Pattern 1 — start from a token:**

```
1. User reports: "This token <MINT> looks rugged."
2. check_token(mint) → returns dev_wallet and operator{}
   (if dev_wallet_attribution is not "verified", say the deployer is unproven)
3. check_operator(dev_wallet) → confirms operator history
4. GET /v1/operator/{dev_wallet}/timeline → find other tokens by same dev
5. GET /v1/operator/{dev_wallet}/network → cluster nodes (kind "cluster")
6. GET /v1/cluster/{cluster_id} for each membership → members and tokens
```

**Pattern 2 — start from a wallet:**

```
1. User asks: "Who works with <WALLET_ADDRESS>?"
2. check_operator(wallet) → risk + tags
3. GET /v1/operator/{wallet}/network → cluster nodes (kind "cluster") with cluster_id
4. GET /v1/cluster/{cluster_id} → full member list + roles
5. For top 5 operator-role members, recursively check_operator()
```

**Pattern 3 — start from a known cluster:**

```
1. User wants to map "the cluster behind X attacks"
2. GET /v1/clusters?sort=recent → identify cluster by tags / size / dates
3. GET /v1/cluster/{cluster_id} → members, associated tokens, edges
4. Visualize as nodes + edges (members are nodes, edges are shared funding)
```

## Output guidance

Cluster output is most useful when **structured**, not narrative.

Recommended output formats:
- **Member table** — wallet · role · tokens_deployed · confirmed_rugs (and `check_operator` risk_level per operator)
- **Mermaid graph** — nodes are wallets, edges are the returned `edges` (shared funding)
- **Timeline** — chronological tokens (`associated_tokens`, or an operator's `timeline` tokens), with rug confirmations marked

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
