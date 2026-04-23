# Flag Glossary

SolSentry alerts emit machine-readable flags in `SCREAMING_SNAKE_CASE`.
Each flag corresponds to a specific on-chain pattern that contributed to
a token's risk score. This document defines the canonical flag vocabulary
used in alerts, REST responses, and the Telegram alert stream.

## Format

```
FLAG_NAME              Score impact   Verifiable from
```

Score impact is the typical contribution to the token risk score when
this flag fires. Combinations of flags are sub-additive (overlapping
signals don't double-count).

## Mint & authority flags

| Flag | Score impact | Verifiable from |
|---|---|---|
| `MINT_AUTHORITY_ENABLED` | +25 | `getAccountInfo(mint)` → `mintAuthority` not null |
| `FREEZE_AUTHORITY_ACTIVE` | +15 | `getAccountInfo(mint)` → `freezeAuthority` not null |
| `MINT_AUTHORITY_RECENTLY_REVOKED` | -10 | TX history shows authority transfer to null after launch |

A live mint authority means the deployer can mint unlimited supply at
any time, diluting all holders. A live freeze authority means any
holder's tokens can be frozen unilaterally.

## Holder concentration flags

| Flag | Score impact | Verifiable from |
|---|---|---|
| `TOP_HOLDER_OWNS_100%` | +40 | Largest holder = total supply |
| `TOP_HOLDER_OWNS_>50%` | +25 | Largest holder > 50% of supply |
| `TOP_HOLDER_OWNS_>30%` | +15 | Largest holder > 30% of supply |
| `VERY_FEW_HOLDERS` | +20 | < 10 unique holders |
| `WHALE_CLUSTER_DETECTED` | +20 | Top 10 holders = same cluster |

Concentration is the strongest predictor of rug execution capacity. A
single wallet holding 100% of supply can drain the LP in one transaction.

## Liquidity flags

| Flag | Score impact | Verifiable from |
|---|---|---|
| `LP_NOT_LOCKED` | +20 | Liquidity pool tokens not held by a known lock contract |
| `LP_LOCK_EXPIRES_<24H` | +15 | LP locked but unlock window opens within 24 hours |
| `LIQUIDITY_<$1K` | +15 | Total LP value in USD below threshold |
| `LIQUIDITY_RECENTLY_REMOVED` | +35 | Sudden LP withdrawal observed in scan window |

## Deployer flags

| Flag | Score impact | Verifiable from |
|---|---|---|
| `NEW_WALLET_DEPLOYER` | +10 | Deployer wallet has < 24h of prior on-chain activity |
| `SERIAL_RUGGER_DEPLOYER` | +25 | Deployer is in the operator database with ≥ 2 confirmed rugs |
| `KNOWN_BUNDLER_FUNDER` | +20 | Deployer was funded by a wallet known to fund coordinated launches |
| `DEPLOYER_OWNS_MAJORITY` | +20 | Deployer wallet still holds > 50% of supply |

## Bundle / coordination flags

| Flag | Score impact | Verifiable from |
|---|---|---|
| `BUNDLE_INSIDER_LP_REMOVAL` | +35 | Wallets that bought in the launch block also removed LP |
| `SAME_BLOCK_BUYERS_>10` | +20 | More than 10 wallets bought in the same block as launch |
| `COORD_DUMP_DETECTED` | +30 | Multiple wallets sold within 30s of each other |
| `BOT_CLUSTER_PARTICIPATION` | +20 | Buyers belong to a known coordinated cluster |

## Metadata flags

| Flag | Score impact | Verifiable from |
|---|---|---|
| `MISSING_METADATA` | +5 | Token has no name, symbol, or image set |
| `IMITATING_KNOWN_TOKEN` | +25 | Name/symbol matches a major token (USDC, BONK, etc) |
| `SUSPICIOUS_NAME_PATTERN` | +10 | Common scam template ("X Token", "100x", etc) |

## State / lifecycle flags

| Flag | Score impact | Verifiable from |
|---|---|---|
| `JUST_LAUNCHED` | informational | Token < 1 hour old |
| `HONEYPOT_DETECTED` | +50 | Sells fail in simulation, buys succeed |
| `PRICE_CRASH_>90%` | +40 | Price dropped > 90% in scan window — likely rug execution |
| `VOLUME_DEAD` | informational | 24h volume < $100 — abandoned |

## Whitelist / safe flags

These are positive flags that reduce the score (known-good tokens):

| Flag | Score impact | Verifiable from |
|---|---|---|
| `KNOWN_TOKEN` | force-set to 10 | Hardcoded whitelist (SOL, USDC, USDT, BONK, etc) |
| `LEGITIMATE_NFT` | informational | Identified as NFT, not a fungible token |
| `HIGH_LIQUIDITY` | -10 | Liquidity > $1M (rug economically less attractive) |
| `LP_LOCKED_>30D` | -10 | Liquidity locked for over 30 days |

## Process / scan-state flags

These are not risk signals — they describe the scan itself:

| Flag | Meaning |
|---|---|
| `ANALYSIS_FAILED` | Scanner could not complete analysis (RPC error, timeout, etc) |
| `EXCEPTION` | Unhandled error during scan — manual review recommended |
| `GHOST_TOKEN_SKIPPED` | Token has zero on-chain footprint, scan deferred |
| `EMPTY_WALLET` | Wallet checked has zero token holdings |
| `MANY_TOKENS` | Wallet holds > 200 tokens — full enrichment skipped for cost |

## Why publish the flag glossary?

Flag names appear in alerts that users see (Telegram, REST responses,
Claude tool outputs) but the flags themselves are dialect — they don't
explain themselves. Publishing the canonical glossary lets:

- Integrators map flags to their own UI conventions
- Auditors verify which flag triggered which alert
- Researchers cite specific flags in academic / industry threat reports
- Devs developing token launches understand which patterns to avoid
  triggering

The flag list evolves as new attack patterns emerge. New flags will be
added here when they ship to production. Removed flags will be marked
deprecated rather than deleted.
