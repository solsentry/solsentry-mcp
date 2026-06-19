# Changelog

All notable changes to `@solsentry/mcp` are documented here.

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
