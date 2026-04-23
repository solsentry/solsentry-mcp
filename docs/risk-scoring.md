# Risk Scoring

This document describes the risk scoring methodology used by SolSentry to
evaluate Solana wallets and tokens. Thresholds are extracted from the
canonical configuration in the production scanner (`core/risk_config.py`).

## Risk levels

| Level | Score range | Operator criteria | Token criteria |
|---|---|---|---|
| `CRITICAL` | ≥ 80 | 10+ confirmed rugs | Token confirmed as rug |
| `HIGH` | ≥ 60 | 5+ confirmed rugs | Score ≥ 80 |
| `MEDIUM` | ≥ 40 | 2+ confirmed rugs | Score ≥ 50 |
| `LOW` | ≥ 20 | 1 confirmed rug | Score > 0 |
| `CLEAN` | — | No rugs, has tracked tokens | — |
| `UNKNOWN` | — | Not in database | Not yet scanned |

`UNKNOWN` is **not** equivalent to safe. It means SolSentry has not
observed the wallet as a deployer (or has not yet scanned the token).
Absence is silence, not endorsement.

## Threshold constants

The scoring engine enforces these absolute thresholds (canonical values
as of `main` branch, regenerated when source changes):

| Constant | Value | Purpose |
|---|---|---|
| `CRITICAL_THRESHOLD` | 80 | Score floor for CRITICAL classification |
| `HIGH_THRESHOLD` | 60 | Score floor for HIGH |
| `MEDIUM_THRESHOLD` | 40 | Score floor for MEDIUM |
| `LOW_THRESHOLD` | 20 | Score floor for LOW |
| `LOW_DATA_SOFT_FLOOR` | 50 | Minimum risk for tokens with <10 holders |
| `LOW_DATA_HOLDER_THRESHOLD` | 10 | Holder count below which `LOW_DATA_SOFT_FLOOR` applies |

## Serial deployer boosts

When a token's deployer has prior rug history, the token's risk score is
boosted to reflect inherited operator risk:

| Modifier | Value | Trigger |
|---|---|---|
| `SERIAL_BOOST_BASE` | +15 | Deployer has ≥ 2 confirmed rugs |
| `SERIAL_BOOST_WITH_RUGS` | +25 | Deployer has confirmed rugs AND is classified serial |

The boost is additive on top of the token's base score from on-chain
flags (mint authority, holder concentration, LP lock, etc).

## Outcome resolution windows

A flagged token is monitored for a specific window before its outcome
(rug / safe / volume-dead) is resolved:

| Window | Duration | Trigger |
|---|---|---|
| `FAST_TRACK_WINDOW_HOURS` | 6h | Risk ≥ 80, OR mint+freeze authority kept, OR top holder ≥ 70% |
| `PRIMARY_RESOLUTION_DAYS` | 2d | Standard window for tokens not on fast-track |
| `SAFE_RECHECK_DAYS` | 14d | Re-verify tokens initially marked safe |
| `VOLUME_DEAD_USD` | $100 | Token marked volume-dead if 24h volume below this |
| `LIQUIDITY_DEAD_USD` | $500 | Combined with `VOLUME_DEAD_USD` for volume-dead determination |

A token marked volume-dead is resolved immediately — it has effectively
abandoned, regardless of whether SOL was extracted.

## Operator labels (rug rate)

Operators are labelled by their lifetime rug rate (confirmed_rugs / total_tokens):

| Label | Rug rate threshold | Notes |
|---|---|---|
| `serial_rugger` | ≥ 70% | Almost every token they ship rugs |
| `suspicious` | ≥ 40% | Mixed pattern, more rugs than legit |
| `legit` | < 20% (and total_tokens ≥ 3) | Track record favors legit launches |

Operators with fewer than 3 total tokens are not labelled — sample size
too small for statistical confidence.

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

Public endpoints serve cached responses to reduce backend load:

| Endpoint pattern | TTL |
|---|---|
| `/v1/stats` | 30s |
| `/v1/top-operators` | 60s |
| `/v1/alerts/recent` | 5s |
| `/v1/clusters` | 120s |
| `/v1/resolutions/recent` | 5s |

Operator and token lookups are not cached — they always serve fresh data
within 30 seconds of scan completion.

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
