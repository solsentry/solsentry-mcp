# Changelog

All notable changes to `@solsentry/mcp` are documented here.

## [0.3.3] - 2026-10-06

### Changed
- Release published from CI via npm trusted publishing (OIDC) in the `release` environment; no code change.

## [0.3.2] - unreleased

### Fixed
- `explain_risk` no longer sends a wallet the operator graph tracks to
  `/v1/token` (which starts an on-demand token scan): `/v1/operator` answers
  `known:false` for every address it does not track, mints included, so
  `known:true` is answered from the operator profile.
- `explain_risk` explains withheld counts (`attribution: "unverified"`) instead
  of presenting a zero as a clean record, and reports HTTP 429/502/503/504 as
  "try again" instead of "no data found".
- The npm tarball no longer ships the compiled tests (`dist/**/*.test.*`).
- Skill references and docs realigned with the live API (flags, thresholds,
  x402 prices, response fields).

## [0.3.1] - 2026-07-11

### Fixed
- `explain_risk` returned "No data found … insufficient data" for wallets the
  system knows as operators (e.g. serial ruggers with 1000+ confirmed rugs).
  The operator gate read `total_tokens_tracked`, a field the live
  `/v1/operator` response never had (it returns `total_tokens`), so the gate
  was always false and every wallet fell through to the token lookup. Field
  name fixed; regression test added (`src/tools/explain_risk.test.ts`).
- Missing/blank required tool arguments no longer reach the handler: a call
  with `{}` used to forward `undefined` — `explain_risk` crashed with an opaque
  "Cannot read properties of undefined (reading 'slice')" and `check_operator`
  queried `/v1/operator/undefined`. A central `requireStringArgs` guard now
  rejects them with a clean `"<tool> requires a non-empty string argument
  '<arg>'"` (B-FS-5). `explain_risk` also guards its own address (defense in
  depth, since it is exported/callable directly).
- The SDK client advertised a stale `User-Agent: solsentry-mcp/0.2.0`; it now
  tracks the real package version (B-FS-4).

### Docs
- `risk-scoring.md`: `CLEAN` token criteria documented — a token whose outcome
  verification resolved it confirmed-safe (cleared false positive) now reports
  `risk_level=CLEAN` on `/v1/token` instead of the stale predicted tier.

## [0.3.0] - 2026-07-09

### Removed (breaking)
- `get_top_operators` tool. Its backend endpoint (`/v1/top-operators`) is
  intentionally gated off: fee-payer != deployer attribution inflates
  system-wide operator aggregates, so the serial-operator leaderboard is not
  served. Per-address lookup (`check_operator` -> `/v1/operator/{wallet}`)
  is the supported counterparty primitive.

### Fixed
- MCP handshake advertised `0.1.0` while the package shipped `0.2.3` — version
  is now single-sourced (`src/version.ts`) and pinned by a test.
- `npm test` globbed `dist/**/*.test.js`, which matched nothing: no test had
  ever run. Glob repaired; the suite now actually executes.

## [0.2.3] - 2026-06-18

### Fixed
- Server `INSTRUCTIONS` no longer ship unverifiable copy (removed
  "zero false positives" / hardcoded accuracy / scan-count claims). The
  package now points to live, auditable-per-mint figures only (`9aa0f34`).

### Changed
- README de-landmined: dropped the static "Canonical live snapshot" metric
  block (predictions/accuracy/precision/operator + serial-rugger aggregates,
  coverage, runtime, versions) and the hardcoded `97.9%` quality claim;
  precision is now framed as auditable per-mint at `/v1/predictions/{mint}`.
- README usage example uses a neutral `<wallet-address>` placeholder instead of
  a specific operator.

## [0.2.2] - earlier

- `bin` permission fix + ESM/CJS exports compatibility.
