# Reference: token-launch

Pre-launch readiness check for a user's **own** token. Use this when the
user is about to launch a token and wants to know if SolSentry will flag
it (false positive risk) or if their own launch will look like a rug to
external scanners.

## When to use

- User says "I'm about to launch a token, can you check it?"
- User asks "will my launch get bundled?"
- User is preparing a fair-launch and wants to set the right config
- User had a prior token flagged and wants to avoid the same issue
- User is launching from a wallet that has never been used as a deployer

## Why this matters

This is the inverse of the standard threat-intel workflow:

- `threat-intel.md` asks "is this **other** wallet/token a risk to ME?"
- `token-launch.md` asks "will **my** wallet/token look like a risk to OTHERS?"

A clean dev who launches with authorities left on the mint, a concentrated
top holder and thin liquidity will collect the same flags a rugger does, and
the token can score HIGH shortly after launch. Knowing this in advance lets
the dev configure their launch to avoid being mistaken for a rugger.

## Tools to call

| Step | Tool / Endpoint | Purpose |
|---|---|---|
| 1 | `check_operator(your_wallet)` | Verify you're not already in the operator database |
| 2 | `check_token(your_mint)` after launch | Check the immediate risk score on your token |
| 3 | `GET /v1/alerts/recent` (REST, no MCP tool) | Compare against alerts on similar tokens |

## Pre-launch checklist (output to user)

Flags are display strings with an emoji prefix (for example
`🚨 FREEZE_AUTHORITY_ENABLED`) and sometimes a numeric suffix. Match on the
flag name, not the whole string. See `docs/flags.md` for the full list.

Before launching, the user should:

```
[ ] Revoke the mint authority (else MINT_AUTHORITY_ENABLED flag; the scanner checks whether an authority is set, so moving it to a multisig does not clear the flag)
[ ] Renounce the freeze authority on the mint (else FREEZE_AUTHORITY_ENABLED flag; both together add MINT_FREEZE_COMBO)
[ ] Keep the top holder well under 30% of supply (else HIGH_CONCENTRATION_<n>% above 30%, TOP_HOLDER_OWNS_<n>% above 50%)
[ ] Keep the top 10 holders under 80% combined (else TOP_10_CONTROL_<n>%)
[ ] Seed real liquidity (under $10k reads VERY_LOW_LIQUIDITY, under $50k LOW_LIQUIDITY) and lock it: a locked LP shows LIQUIDITY_LOCKED_<n>% as a positive flag
[ ] Launch through a managed launchpad rather than a raw or manual deploy (else MANUAL_DEPLOY, UNKNOWN_PLATFORM or RAW_PLATFORM_AUTHORITY_RETAINED)
[ ] Use a clean name and symbol: do not claim a major token's symbol (else SYMBOL_IMPERSONATION) and avoid hidden control characters (else METADATA_THREAT)
[ ] If using Token-2022, document any active extensions (else PERMANENT_DELEGATE, TRANSFER_HOOK, TRANSFER_FEE or MINT_CLOSE_AUTHORITY)
```

Some flags cannot be avoided at launch: any brand-new token carries
`JUST_LAUNCHED` / `NEW_TOKEN`, and a deployer with prior verified rugs
carries `DEV_VERIFIED_RUGS`. There is no flag for "new deployer wallet" or
for "missing metadata".

For each item the user has NOT done, explain what flag it triggers and
what the alternative is. Do not lecture — list and move on.

## After launch

```bash
# Check immediate risk on the token
curl https://api.solsentry.app/v1/token/{mint}

# Check operator profile of the deployer wallet (yourself)
curl https://api.solsentry.app/v1/operator/{your_wallet}
```

If the token comes back HIGH or CRITICAL, escalate the user to the
specific flags they triggered (`flags` in the token response, matched on the
flag name) and recommend the remediation:

| Flag name | Remediation |
|---|---|
| `MINT_AUTHORITY_ENABLED` | Revoke the authority (a multisig still counts as set); re-check the token afterwards |
| `FREEZE_AUTHORITY_ENABLED` | Renounce on the mint |
| `TOP_HOLDER_OWNS_<n>%` / `HIGH_CONCENTRATION_<n>%` | Distribute holdings; rebalance the LP |
| `VERY_LOW_LIQUIDITY` / `LOW_LIQUIDITY` | Add liquidity; lock it (Streamflow, Meteora, etc.) and publish the tx hash |
| `SAME_BLOCK_BUNDLES` / `TIGHT_CLUSTERS` / `COORD_DUMP` | Post-hoc, not preventable: explain transparently (see below) |

An empty `flags` array does not mean the token is clean; also read
`risk_level`, `summary` and `operator`.

## Bundle detection at launch

If the user launches and immediately sees coordinated buys (multiple
wallets, similar amounts, within seconds), this is **insider bundling**
— often by snipers, not the dev.

```bash
# Look for bundle / cluster overlap on the early buyers
curl "https://api.solsentry.app/v1/token/{mint}/bundle-evidence"
```

Bundle activity around a launch is one of the strongest historical
predictors of a rug. If the dev did NOT bundle, they should preempt the
narrative — publish the cluster IDs of the snipers and disavow them.

## Common pitfall

Do not promise the user "if you do all the checklist items, you won't be
flagged." Risk scoring evolves as new patterns emerge, and the checklist is
a guide to the common flags, not a guarantee. For system-wide numbers, use
`https://api.solsentry.app/v1/stats` rather than quoting a figure.
