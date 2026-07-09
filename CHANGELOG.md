# Changelog

All notable changes to `@solsentry/mcp` are documented here.

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
