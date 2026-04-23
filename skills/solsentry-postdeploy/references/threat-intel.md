# Reference: threat-intel

Generic risk lookup for any Solana wallet or mint address. Use this when
the user is not yet committed to a workflow — they just want to know
"is this address risky?".

## When to use

- User pastes an address and asks "is this safe?" / "what's the risk?"
- User mentions a token mint or wallet without context
- User wants the leaderboard of worst operators
- User wants system-wide stats (how many operators tracked, how many rugs confirmed)

If the user has a more specific workflow (CPI integration, post-incident,
monitoring, launching), prefer the dedicated reference instead of this one.

## Tools to call

| Tool | Use case | Endpoint |
|---|---|---|
| `check_operator(wallet)` | Is this wallet a known deployer? | `GET /v1/operator/{wallet}` |
| `check_token(mint)` | Is this mint a known scam / clean? | `GET /v1/token/{mint}` |
| `explain_risk(address)` | Plain-English summary for any address | derived |
| `get_top_operators(limit)` | Worst serial ruggers leaderboard | `GET /v1/top-operators?limit=N` |
| `get_network_stats()` | System-wide live stats | `GET /v1/stats` |

## Response shape (operator)

```json
{
  "wallet": "4kxscute...",
  "known": true,
  "risk_level": "CRITICAL",
  "risk_score": 100,
  "confirmed_rugs": 624,
  "total_tokens": 629,
  "rug_rate_pct": 99.2,
  "tags": ["serial_rugger", "bundle_lp_remover"],
  "patterns": ["fast_rug_<24h", "mint_authority_kept"]
}
```

## Response shape (token)

```json
{
  "mint": "<mint>",
  "risk_level": "HIGH",
  "risk_score": 85,
  "flags": ["MINT_AUTHORITY_ENABLED", "TOP_HOLDER_OWNS_>50%"],
  "deployer": "<wallet>",
  "deployer_risk_level": "HIGH",
  "outcome": "pending"
}
```

## Output guidance

- Lead with the verdict: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `CLEAN`, or `UNKNOWN`
- Always show confirmed_rugs / total_tokens together — context matters (5 rugs in 5 tokens vs 5 in 500)
- For `UNKNOWN`, explicitly say "absence is not proof of safety"
- Link to `https://solsentry.app/operator/{wallet}` so user can verify visually

## Common pitfall

Do not output a "safe" verdict for `UNKNOWN`. The wallet may simply have
never been observed deploying — that is silence, not a clean record. Use
the phrase "not in the tracked operator database" instead of "safe".
