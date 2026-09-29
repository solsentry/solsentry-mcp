# Risk Scoring

This document describes the risk scoring methodology used by SolSentry to
evaluate Solana wallets and tokens. Thresholds are extracted from the
canonical configuration in the production scanner (`core/risk_config.py`).

## Risk levels

Tokens and operators use the same six level names but different criteria.

### Token tiers

Derived from the token's risk score (0-100), then overridden by a resolved
outcome (`integrations/mcp/token_routes.py`):

| Level | Criteria |
|---|---|
| `CRITICAL` | Score >= 80, **or** `final_outcome = confirmed_scam` (resolution forces `CRITICAL`) |
| `HIGH` | Score >= 60 |
| `MEDIUM` | Score >= 50 |
| `LOW` | Score > 0 |
| `CLEAN` | `final_outcome = confirmed_safe` (resolution forces `CLEAN`; `risk_score` keeps the historical prediction) |
| `UNKNOWN` | Score is 0 / not yet scored |

The resolved outcome wins in both directions: a token later confirmed as a
rug reads `CRITICAL` whatever its original score, and a token cleared as
safe reads `CLEAN`. The original prediction stays auditable per mint at
`/v1/predictions/{mint}`.

### Operator levels

Derived only from the operator's count of confirmed rugs
(`operator_risk_level` in `core/risk_config.py`):

| Level | Criteria |
|---|---|
| `CRITICAL` | >= 10 confirmed rugs |
| `HIGH` | >= 5 confirmed rugs |
| `MEDIUM` | >= 2 confirmed rugs |
| `LOW` | >= 1 confirmed rug |
| `CLEAN` | Has deployed tokens, no confirmed rugs |
| `UNKNOWN` | No deployment history observed |

`UNKNOWN` is **not** equivalent to safe. It means SolSentry has not
observed the wallet as a deployer (or has not yet scanned the token).
Absence is silence, not endorsement.

## Threshold constants

The scoring engine enforces these absolute thresholds (canonical values in
`core/risk_config.py`; regenerate this table when the source changes):

| Constant | Value | Purpose |
|---|---|---|
| `CRITICAL_THRESHOLD` | 80 | Score floor for CRITICAL classification |
| `HIGH_THRESHOLD` | 60 | Score floor for HIGH |
| `MEDIUM_THRESHOLD` | 50 | Score floor for MEDIUM (sits at the measured data cliff, not 40) |
| `LOW_DATA_SOFT_FLOOR` | 50 | Minimum risk for tokens with too little reliable holder data |
| `LOW_DATA_HOLDER_THRESHOLD` | 10 | Holder count below which `LOW_DATA_SOFT_FLOOR` applies |
| `OP_RISK_CRITICAL_RUGS` / `OP_RISK_HIGH_RUGS` / `OP_RISK_MEDIUM_RUGS` / `OP_RISK_LOW_RUGS` | 10 / 5 / 2 / 1 | Confirmed-rug counts for the operator levels above |

## Serial deployer boosts

When a token's deployer is classified as a serial deployer, the risk agent
adds a boost on top of the token's base score:

| Modifier | Value | Trigger |
|---|---|---|
| `SERIAL_BOOST_BASE` | +25 | Deployer is classified serial |
| `SERIAL_BOOST_WITH_RUGS` | +35 | Deployer is classified serial AND has past rugs (replaces the base boost) |

The boost is additive on top of the token's base score from on-chain
flags (mint authority, holder concentration, liquidity, etc.) and the
other adjustments the risk agent applies, and the total is capped at 100.
Separately, a deployer with at least 5 verified rugs is shown as
`DEV_VERIFIED_RUGS` evidence on the token card; that flag does not change
the tier.

## Outcome resolution windows

A flagged token is monitored for a specific window before its outcome
(rug / safe / volume-dead) is resolved:

| Window | Duration | Trigger |
|---|---|---|
| `FAST_TRACK_WINDOW_HOURS` | 6h | Risk ≥ 80, OR mint+freeze authority kept, OR top holder ≥ 70% (raw-platform launches with retained authority use a 5-minute window) |
| `PRIMARY_RESOLUTION_DAYS` | 2d | Standard window for tokens not on fast-track |
| `SAFE_RECHECK_DAYS` | 14d | Re-verify tokens initially marked safe |
| `VOLUME_DEAD_USD` | $100 | Token marked volume-dead if 24h volume below this |
| `LIQUIDITY_DEAD_USD` | $500 | Combined with `VOLUME_DEAD_USD` for volume-dead determination |

A token marked volume-dead is resolved immediately — it has effectively
abandoned, regardless of whether SOL was extracted.

## Operator labels

The `risk_label` served on `/v1/operator/{wallet}` is derived from the same
confirmed-rug counts as the operator level, so a label can never contradict
its level (`operator_risk_label` in `core/risk_config.py`):

| Operator level | `risk_label` |
|---|---|
| `CRITICAL`, `HIGH` | `serial_rugger` |
| `MEDIUM` | `suspicious` |
| `LOW` | `mixed` |
| `CLEAN` | `legit` (3 or more tokens) or `new` (fewer than 3) |
| `UNKNOWN` | `unknown` |

Two human-set labels pass through unchanged: `trader_not_deployer` (the
attribution strip marker, see below) and `syndicate_funder`.

## Operator attribution

`/v1/operator/{wallet}` may carry an `attribution` field (plus an
`attribution_note`) describing how well the deployer link behind the counts
was verified on-chain. Many wallets pay the creation fee of a token they did
not author (LP-position NFTs, third-party mints), so counts are only served
for pairs proven on-chain.

| `attribution` | Meaning | Counts |
|---|---|---|
| `verified` | Every claimed wallet-to-mint pair was verified on-chain | Exact |
| `partial` | Some claimed pairs are still unverified | A floor: real value may be higher |
| `refuted` | Nothing verified, and the remainder was refuted: the wallet paid fees but did not author the mints | Served as 0; this zero is a verified answer |
| `unverified` | Nothing verified and the remainder is unknown | **Withheld**: counts and `risk_score` are zeroed |

**`unverified` is not clean.** Its zeroed counts mean "not checked", not "no
rugs". Never present an `unverified` operator as clean or safe; say the
attribution could not be verified. The field is absent when no attribution
state is available for the wallet.

The same idea applies to tokens: `dev_wallet_attribution` is `verified`,
`unverified` or `refused` (the candidate wallet was proven not to be the
author, so `dev_wallet` and `operator` are returned as `null`).

## Dev wallet risk inheritance

When a wallet acts as a deployer multiple times, its operator risk score
accumulates per confirmed rug:

| Constant | Value | Purpose |
|---|---|---|
| `DEV_WALLET_RISK_PER_RUG` | 0.30 | Risk score increase per confirmed rug |
| `DEV_WALLET_RISK_CAP` | 0.95 | Maximum risk score (never reaches 1.0) |

The cap exists to leave room for upward correction if a known operator
ever ships a verifiably legit token (rare but possible).

## Alert deduplication

To prevent alert spam, the system suppresses duplicates:

| Constant | Value | Purpose |
|---|---|---|
| `ALERT_DEDUP_WINDOW_SECONDS` | 60 | Same address within this window |
| `ALERT_DEV_SYMBOL_DEDUP_SECONDS` | 600 | Serial deployer + same symbol within 10 min |

## Cache TTLs (REST API)

Public endpoints are served from short-lived caches to reduce backend load:

| Endpoint pattern | Data-layer TTL |
|---|---|
| `/v1/stats` | 5s |
| `/v1/alerts/recent` | 5s |
| `/v1/resolutions/recent` | 30s |
| `/v1/operator/{wallet}/timeline` | 60s |
| `/v1/clusters`, `/v1/cluster/{id}` | 120s |

Operator and token lookups read data refreshed on a roughly 30-second
cycle. A token that had to be scanned on demand is returned with a public
HTTP cache header (10 minutes).

## Why publish the thresholds?

A risk scoring system that hides its rubric is a black box. SolSentry
publishes the absolute thresholds because:

1. **Transparency builds trust** — security tools used by institutions
   (SEAL ISAC, custody providers, threat researchers) cannot adopt a
   scoring system whose internals are unknowable.
2. **The thresholds are not the moat** — knowing that CRITICAL = 80 does
   not let an attacker game the system. The signal detection
   (which on-chain patterns map to which score increments) is the
   protected work.
3. **Reproducibility** — anyone can verify the scoring decision for any
   address by checking the inputs against these published thresholds.

The detection logic itself (heuristics, ALife adjustments, evolutionary
tuning) is intentionally not public.
