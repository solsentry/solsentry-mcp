---
name: solsentry-postdeploy
description: Use this skill for post-deploy Solana threat intelligence — operator risk lookups, counterparty checks before CPI, post-incident drain tracing, deployment monitoring, token-launch readiness, and bot cluster graph exploration. Backed by SolSentry's live mainnet scanner (api.solsentry.app).
user-invocable: true
---

SolSentry tracks the **operators** behind Solana token launches and program
deployments — serial rug pull operators, coordinated bot clusters, and
malicious wallets. This skill exposes that intelligence to AI agents at the
post-deploy stage of a Solana developer workflow.

The skill complements pre-deploy security tooling (auditing, formal
verification, secure code generation) by answering the questions that only
become relevant after code ships:

- "Is the wallet about to interact with my program a known rugger?"
- "Did the deployer of this program have a prior rug history?"
- "Where did the SOL drained from my LP go?"
- "Is the operator I'm about to integrate with via CPI clean?"

This skill is bilingual-aware (the underlying alerts and explainer support
PT-BR and EN), and all data is sourced from the public REST API at
`api.solsentry.app` — no API key required for read endpoints.

## When to load each reference

Load only the reference relevant to the user's current task. Do not load all
references at once — they are progressive disclosure files.

| Reference | Load when |
|---|---|
| `references/threat-intel.md` | User asks for risk on any wallet or mint — generic lookup, no specific workflow |
| `references/counterparty.md` | User is integrating with another program (CPI), oracle, or deployer they did not write themselves |
| `references/monitor.md` | User shipped a program or token and wants ongoing visibility on activity touching it |
| `references/forensics.md` | User reports an incident — drain, exploit, suspicious flow — and needs post-mortem trace |
| `references/token-launch.md` | User is preparing to launch their own token and wants to know if it will be flagged or bundled |
| `references/cluster-graph.md` | User is researching the operator/bot network around a wallet, mint, or scam pattern |

## Tools (MCP)

These tools are exposed by the `@solsentry/mcp` server; references describe
when and how to invoke them.

| Tool | Purpose |
|---|---|
| `check_operator` | Risk profile of a wallet as a token deployer |
| `check_token` | Risk profile of a token mint |
| `get_top_operators` | Leaderboard of worst serial ruggers |
| `get_network_stats` | System-wide live stats |
| `explain_risk` | Plain-English risk summary for any address |

## Risk vocabulary (used across all references)

| Level | Criteria |
|---|---|
| `CRITICAL` | 10+ confirmed rugs OR token confirmed as rug |
| `HIGH` | 5+ confirmed rugs OR risk score ≥ 80 |
| `MEDIUM` | 2+ confirmed rugs OR risk score ≥ 50 |
| `LOW` | 1 confirmed rug OR risk score > 0 |
| `CLEAN` | No rugs, has tracked tokens |
| `UNKNOWN` | Not in database (never observed deploying) |

`UNKNOWN` is not proof of safety — it means no on-chain history as a deployer.

For the full risk-scoring methodology and threshold definitions see
`docs/risk-scoring.md` at the package root. For the flag glossary see
`docs/flags.md`. For the OpenAPI spec see `docs/openapi.yaml`.

## Scope guarantees

This skill never:

- Stores user data (queries hit a stateless REST API)
- Requires authentication for read endpoints
- Provides advice about pre-deploy activities (codegen, audits, formal proofs) — those are covered by other skills focused on pre-deploy work

## Data freshness

The underlying scanner runs continuously on mainnet (~210h+ runtime).
Operator profiles are updated within 30 seconds of new on-chain activity.
The skill is safe to use for both real-time decisions (pre-CPI checks) and
historical research.

## Links

- Homepage: https://solsentry.app
- API: https://api.solsentry.app
- NPM: https://www.npmjs.com/package/@solsentry/mcp
- GitHub: https://github.com/solsentryai
