# Flag Glossary

SolSentry token scans attach **flags** to a token's risk verdict. Each flag
is a short human-readable string describing one on-chain or market pattern
the scanner observed. Flags appear in the `flags` array of `/v1/token/{mint}`
and `/v1/predictions/{mint}` and in each item of `/v1/alerts/recent`.

## Format: match on the token name, not the whole string

Flags are **display strings**, not stable enum values. Each one starts with
an emoji prefix and may carry a numeric or parenthetical suffix that varies
per token:

```
🚨 FREEZE_AUTHORITY_ENABLED
⚠️ TOP_HOLDER_OWNS_77%
🚨 VERY_LOW_LIQUIDITY ($1,234)
⚠️ VERY_FEW_HOLDERS (7)
✅ LIQUIDITY_LOCKED_100%
```

Integrators and agents should therefore **match on the flag name token**
(for example `FREEZE_AUTHORITY_ENABLED`, or the prefix `TOP_HOLDER_OWNS_`),
never on the full string. Do not depend on the emoji or on the numbers.

Emoji prefix convention:

| Prefix | Meaning |
|---|---|
| `🚨` | High-severity signal |
| `⚠️` | Warning-level signal |
| `✅` | Positive / mitigating signal |
| `ℹ️` | Informational (for example a recognised known token) |
| other (`🔴`, `🟡`, `🍯`, `💸`, `🔒`, `🤖`, `🛡️`, `👑`) | Specific external-security, bundle-detector or platform annotations |

Flags contribute to the risk score, but the per-flag weights are tuned
continuously and are not published (see `docs/risk-scoring.md`). The final
`risk_level` is derived from the score, and a resolved outcome can override
it (`confirmed_scam` forces `CRITICAL`, `confirmed_safe` forces `CLEAN`).

## Things to know before reading `flags`

- The array can be **empty** on a scored token. An empty `flags` array is not
  a clean bill of health; read `risk_level`, `risk_score`, `summary` and
  `operator` as well.
- A token the scanner had not seen yet may be scanned on demand
  (`scanned_on_demand: true` in the response). That path returns
  **plain-English reasons** in `flags` (for example "Freeze authority active
  ...") plus a structured `risk_factors` array, instead of the emoji flags
  below.
- The vocabulary evolves as new attack patterns are added. Treat unknown flag
  names as valid and show them as-is.

## Mint and authority flags

| Flag name | Trigger |
|---|---|
| `MINT_AUTHORITY_ENABLED` | Mint authority is still set: supply can be inflated |
| `FREEZE_AUTHORITY_ENABLED` | Freeze authority is still set: holder accounts can be frozen |
| `MINT_FREEZE_COMBO` | Both authorities are set at once |
| `PERMANENT_DELEGATE` | Token-2022 permanent delegate present |
| `TRANSFER_HOOK` | Token-2022 transfer hook present |
| `TRANSFER_FEE` | Token-2022 transfer fee configured |
| `MINT_CLOSE_AUTHORITY` | Token-2022 mint close authority present |
| `T22_<name>` | Other Token-2022 extension classified as risky (prefix `T22_`) |
| `DRAINABLE` / `FREEZABLE` | External security enrichment reports the token as drainable / freezable |

Verifiable from: the mint account (`getAccountInfo(mint)` with
`jsonParsed` encoding shows `mintAuthority`, `freezeAuthority` and any
Token-2022 extensions).

## Holder concentration flags

| Flag name | Trigger |
|---|---|
| `TOP_HOLDER_OWNS_<n>%` | Largest holder owns more than 50% of supply (`<n>` is the actual share) |
| `HIGH_CONCENTRATION_<n>%` | Largest holder owns between 30% and 50% |
| `MODERATE_CONCENTRATION_<n>%` | Largest holder owns between 15% and 30% |
| `TOP_10_CONTROL_<n>%` | Top 10 holders together own more than 80% |
| `VERY_FEW_HOLDERS (<count>)` | Fewer than 10 holders |
| `LOW_HOLDER_COUNT (<count>)` | Fewer than 50 holders |
| `FEW_HOLDERS (<count>)` | Fewer than 200 holders |
| `MANY_HOLDERS (<count>)` | Positive: very large holder base |
| `HOLDER_DATA_UNAVAILABLE` | Holder data could not be fully retrieved |
| `LOW_DATA_CONFIDENCE_FLOOR` / `LOW_DATA_SOFT_FLOOR` | Holder data was unreliable, so a minimum risk floor was applied |

## Liquidity and market flags

| Flag name | Trigger |
|---|---|
| `VERY_LOW_LIQUIDITY ($<usd>)` | Liquidity below $10k |
| `LOW_LIQUIDITY ($<usd>)` | Liquidity below $50k |
| `HIGH_LIQUIDITY ($<usd>)` | Positive: liquidity above $500k |
| `LIQUIDITY_LOCKED_<n>%` | Positive: at least 90% of liquidity locked (from external security data) |
| `PARTIAL_LOCK_<n>%` | Some, but under 90%, of liquidity locked |
| `SUSPICIOUS_VOLUME (<x>x liq)` | 24h volume is more than 10 times liquidity |
| `PRICE_CRASH (<pct>%)` | 24h price drop worse than -80% |
| `MAJOR_DECLINE (<pct>%)` | 24h price drop worse than -50% |
| `JUST_LAUNCHED (<n>m ago)` | Token is under 1 hour old |
| `NEW_TOKEN (<n>h old)` | Token is under 24 hours old |
| `HONEYPOT_RISK (<n>%)` | External security data reports a honeypot probability above 50% |
| `TAX_<n>%` | External security data reports a buy/sell tax |

## Launch platform flags

| Flag name | Trigger |
|---|---|
| `PUMP_MAYHEM` | Launched in the pump.fun "mayhem" stage |
| `PUMP_KOTH` | pump.fun "king of the hill" stage |
| `MANUAL_DEPLOY` | Deployed manually, not through a launchpad |
| `UNKNOWN_PLATFORM` | Launch platform could not be identified |
| `RAW_PLATFORM_AUTHORITY_RETAINED` | Deployed directly on an AMM with mint or freeze authority retained (this one has no emoji prefix) |

## Bundle and coordination flags

These come from the bundle forensics pass over early swaps.

| Flag name | Trigger |
|---|---|
| `SAME_BLOCK_BUNDLES` | Coordinated buys in the same block as the launch |
| `SHARED_FUNDER_SAME_BLOCK` | Same-block buyers share a non-exchange funder |
| `TIGHT_CLUSTERS` / `BOT_CONFIRMED_TIGHT_CLUSTERS` | Buyers acting inside a tight time window; the second form is bot-signature confirmed |
| `HIGH_COORD_SOL` / `COORD_SOL` | Large SOL volume moved in coordinated buys |
| `COORD_DUMP` | Several wallets selling together |
| `HIGH_COORD_RATIO` | Most wallets trading the token appear coordinated |
| `BOT_ACTIVITY` | Informational: bot or infrastructure clusters were excluded from the coordination count |
| `CEX_FUNDER_FP_GUARD` | Informational: same-block bundles suppressed because the funder is an exchange |
| `NO_BUNDLES_DETECTED (<n> swaps analyzed)` | Positive: enough swaps analysed, no bundling found |
| `ANALYSIS_INCOMPLETE` | Bundle analysis could not finish |

## Operator, identity and threat flags

| Flag name | Trigger |
|---|---|
| `DEV_VERIFIED_RUGS (<n>)` | The token's deployer has at least 5 on-chain-verified rugs. This is shown as evidence next to the verdict and is not used to raise the tier |
| `KNOWN_DRAINER (<label>)` | Creator matches a drainer catalog entry (forces `CRITICAL`) |
| `SYMBOL_IMPERSONATION (claims <SYMBOL>, mint not canonical)` | Symbol claims a protected token but the mint is not the canonical one |
| `METADATA_THREAT (<kinds>)` | Weaponised token metadata detected (for example hidden control characters) |
| `KNOWN_TOKEN (<label>)` | Informational: recognised legitimate token; risk is capped |
| `LP_POSITION_NFT (<signal>)` | Informational: the mint is an LP-position NFT, not a fungible token |
| `CONFIRMED_SAFE (<label>)` | Informational: on the confirmed-safe list |
| `INSIGHTX_SAFE` / `INSIGHTX_MID` / `INSIGHTX_DANGER` (`(<n>/100)`) | External security score bucket |

## Scan-state flags

These describe the scan itself, not the token:

| Flag name | Meaning |
|---|---|
| `FAST_SCAN_TIMEOUT`, `DEEP_SCAN_TIMEOUT`, `FORENSIC_SCAN_TIMEOUT` | A scan stage timed out; the verdict may be based on partial data |
| `DEEP_SCAN_PARTIAL`, `FORENSIC_SCAN_PARTIAL` | A scan stage returned partial data |
| `ANALYSIS_FAILED` | Scanner could not complete analysis |
| `GHOST_TOKEN_SKIPPED` | Token has no on-chain footprint yet; scan deferred |

## Contract analysis flags

`/v1/contract-analysis/{program_id}` uses its own plain uppercase flags (no
emoji), such as `KNOWN_DRAINER`, `CATALOG_SAFE_TOKEN`, `UPGRADABLE`,
`IMMUTABLE`, `MINT_AUTHORITY_PRESENT`, `FREEZE_AUTHORITY_PRESENT`,
`RISKY_T22_EXTENSION` and `IMPERSONATOR`.

## Why publish the flag glossary?

Flag names appear in alerts that users see (Telegram, REST responses,
Claude tool outputs) but they are terse. Publishing the vocabulary lets:

- Integrators map flags to their own UI conventions
- Auditors verify which flag triggered which alert
- Researchers cite specific flags in threat reports
- Developers launching tokens understand which patterns to avoid

Flag weights and detection heuristics are intentionally not published. New
flags are added as new attack patterns ship; the live API is the authority
for what is emitted today.
