# Reference: threat-intel

Generic risk lookup for any Solana wallet or mint address. Use this when
the user is not yet committed to a workflow — they just want to know
"is this address risky?".

## When to use

- User pastes an address and asks "is this safe?" / "what's the risk?"
- User mentions a token mint or wallet without context
- User wants system-wide stats (how many operators tracked, how many rugs confirmed) — fetch them live with `get_network_stats`, do not quote remembered numbers

If the user has a more specific workflow (CPI integration, post-incident,
monitoring, launching), prefer the dedicated reference instead of this one.

## Tools to call

| Tool | Use case | Endpoint |
|---|---|---|
| `check_operator(wallet)` | Is this wallet a known deployer? | `GET /v1/operator/{wallet}` |
| `check_token(mint)` | Is this mint a known scam / clean? | `GET /v1/token/{mint}` |
| `explain_risk(address)` | Plain-English summary for any address | derived |
| `get_network_stats()` | System-wide live stats | `GET /v1/stats` |

There is no leaderboard or "top operators" tool: the public worst-operator
route is switched off (`GET /v1/top-operators` returns 404 by design). If the
user asks for one, say so and offer per-address lookups instead.

## Response shape (operator)

Illustrative values. Unknown wallets return HTTP 200 with `known: false`
(not a 404).

```json
{
  "wallet": "<WALLET_ADDRESS>",
  "known": true,
  "risk_level": "CRITICAL",
  "risk_score": 100,
  "risk_label": "serial_rugger",
  "summary": "...",
  "confirmed_rugs": 40,
  "confirmed_safe": 2,
  "total_tokens": 50,
  "pending": 8,
  "rug_rate_pct": 80.0,
  "counts": "distinct_mints",
  "tags": ["serial_rugger", "bundle_lp_remover"],
  "patterns": ["fast_rug_<24h", "mint_authority_kept"],
  "attribution": "verified"
}
```

`attribution` (`verified` | `partial` | `refuted` | `unverified`) says how
well the deployer link behind the counts was proven on-chain. It is present
when an attribution state exists for the wallet. `partial` means the counts
are a floor. `unverified` means the counts were **withheld (zeroed)**, which
is not the same as clean: say "attribution not verified", never "clean".
Other optional fields: `attribution_note`, `profile` (first/last seen,
recent tokens, first funder), `syndicate`, `is_kol`, `entity_label`.

## Response shape (token)

Illustrative values.

```json
{
  "mint": "<MINT>",
  "known": true,
  "risk_level": "HIGH",
  "risk_score": 85,
  "final_outcome": "pending",
  "flags": ["🚨 MINT_AUTHORITY_ENABLED", "⚠️ TOP_HOLDER_OWNS_77%"],
  "summary": "HIGH (risk 85/100): ...",
  "dev_wallet": "<WALLET_ADDRESS>",
  "dev_wallet_source": "resolver",
  "dev_wallet_attribution": "verified",
  "operator": {
    "wallet": "<WALLET_ADDRESS>",
    "risk_level": "HIGH",
    "confirmed_rugs": 6,
    "risk_label": "serial_rugger"
  },
  "symbol": "<SYMBOL>",
  "predicted_at": "<ISO timestamp>"
}
```

Notes:

- The deployer is `dev_wallet`, and its rap sheet is the nested `operator`
  object. There are no `deployer`, `deployer_risk_level` or `outcome` fields.
- `final_outcome` is `pending`, `confirmed_scam` or `confirmed_safe`.
  `confirmed_scam` forces `risk_level` to `CRITICAL` and `confirmed_safe`
  forces `CLEAN`.
- `flags` are display strings with an emoji prefix and sometimes a numeric
  suffix. Match on the flag name (see `docs/flags.md`). The array can be
  empty; a mint scanned on demand returns plain-English reasons instead.
- `dev_wallet_attribution` is `verified`, `unverified` or `refused`
  (`dev_wallet_verdict` and `dev_wallet_note` explain why). If `unverified`,
  do not present `dev_wallet` as "the dev". If `refused`, the candidate was
  proven not to be the author and `dev_wallet` / `operator` are `null`.
- Other optional fields: `is_bundle`, `launch_platform`, `launch_stage`,
  `has_mint_authority`, `has_freeze_authority`, `token_extensions`, `social`.

## Output guidance

- Lead with the verdict: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `CLEAN`, or `UNKNOWN`
- Always show confirmed_rugs / total_tokens together — context matters (5 rugs in 5 tokens vs 5 in 500)
- If `attribution` is `unverified`, lead with that instead of the zeroed counts
- For `UNKNOWN`, explicitly say "absence is not proof of safety"
- Link to `https://solsentry.app/operator/{wallet}` so user can verify visually

## Common pitfall

Do not output a "safe" verdict for `UNKNOWN`. The wallet may simply have
never been observed deploying — that is silence, not a clean record. Use
the phrase "not in the tracked operator database" instead of "safe".
