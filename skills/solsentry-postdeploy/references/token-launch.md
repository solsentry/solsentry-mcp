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

A clean dev who launches with default Pump.fun settings (mint authority
kept, top holder >50%, no LP lock) will be flagged HIGH RISK by SolSentry
within 4 minutes. Knowing this in advance lets the dev configure their
launch to avoid being mistaken for a rugger.

## Tools to call

| Step | Tool / Endpoint | Purpose |
|---|---|---|
| 1 | `check_operator(your_wallet)` | Verify you're not already in the operator database |
| 2 | `check_token(your_mint)` after launch | Check the immediate risk score on your token |
| 3 | Recent alerts feed | Compare against alerts on similar tokens |

## Pre-launch checklist (output to user)

Before launching, the user should:

```
[ ] Burn the mint authority OR transfer to a known multisig (else MINT_AUTHORITY_ENABLED flag)
[ ] Cap top holder concentration < 30% (else TOP_HOLDER_OWNS_>50% flag)
[ ] Lock LP for at least 30 days (else LP_NOT_LOCKED flag)
[ ] Renounce freeze authority on the mint (else FREEZE_AUTHORITY_ACTIVE flag)
[ ] Confirm dev wallet has prior unrelated activity (else NEW_WALLET_DEPLOYER flag)
[ ] Verify metadata (name, symbol, image) is set (else MISSING_METADATA flag)
[ ] If using Token-2022, document any active extensions (transfer hooks, fees)
```

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
specific flags they triggered and recommend the remediation:

| Flag | Remediation |
|---|---|
| `MINT_AUTHORITY_ENABLED` | Burn or transfer to multisig; re-check score in 30s |
| `TOP_HOLDER_OWNS_>50%` | Distribute holdings; LP rebalance |
| `LP_NOT_LOCKED` | Lock via Streamflow / Meteora / etc; broadcast tx hash |
| `FREEZE_AUTHORITY_ACTIVE` | Renounce on the mint |
| `BUNDLE_INSIDER_LP_REMOVAL` | This is post-hoc — not preventable, must explain transparently |

## Bundle detection at launch

If the user launches and immediately sees coordinated buys (multiple
wallets, similar amounts, within seconds), this is **insider bundling**
— often by snipers, not the dev.

```bash
# Look for cluster overlap on the early buyers
curl "https://api.solsentry.app/v1/cluster/by-token/{mint}"
```

Bundle activity around a launch is one of the strongest historical
predictors of a rug. If the dev did NOT bundle, they should preempt the
narrative — publish the cluster IDs of the snipers and disavow them.

## Common pitfall

Do not promise the user "if you do all the checklist items, you won't be
flagged." Risk scoring evolves as new patterns emerge. The checklist
covers ~85% of false positive cases at the time of writing, not 100%.
