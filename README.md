# @solsentry/mcp

[![npm version](https://img.shields.io/npm/v/@solsentry/mcp.svg)](https://www.npmjs.com/package/@solsentry/mcp)
[![npm downloads](https://img.shields.io/npm/dm/@solsentry/mcp.svg)](https://www.npmjs.com/package/@solsentry/mcp)
[![license](https://img.shields.io/npm/l/@solsentry/mcp.svg)](./LICENSE)
[![api](https://img.shields.io/badge/api-solsentry.app-orange.svg)](https://api.solsentry.app/health)

**Three interfaces, one package.** SolSentry — post-deploy Solana threat
intelligence — distributed as MCP server, TypeScript SDK, and a Claude
Skill bundle.

## What this is

| Surface | Use it when | Install |
|---|---|---|
| **MCP server** | AI agents (Claude Desktop, Cursor, Claude Code, any MCP client) | `npx @solsentry/mcp` |
| **TypeScript SDK** | TS backends, bots, wallets, dApps that don't speak MCP | `import { SolSentryClient } from "@solsentry/mcp/client"` |
| **Skills bundle** | Claude Code / Cursor with the [Agent Skills spec](https://agentskills.io) | `npx skills add @solsentry/mcp` |

All three call the public REST API at `api.solsentry.app`. No API key
required for read endpoints.

## What's in this repo

```
solsentry-mcp/
├── src/                            ← TypeScript source (MCP server + SDK)
├── skills/
│   └── solsentry-postdeploy/       ← 1 skill, 6 references (progressive disclosure)
│       ├── SKILL.md                  orchestrator: when to load each reference
│       └── references/
│           ├── threat-intel.md     · generic risk lookup
│           ├── counterparty.md     · pre-CPI counterparty check
│           ├── monitor.md          · post-deploy program monitoring
│           ├── forensics.md        · post-incident drain trace
│           ├── token-launch.md     · pre-launch readiness for your own token
│           └── cluster-graph.md    · operator/bot network exploration
└── docs/                           ← public reference docs
    ├── risk-scoring.md             · scoring methodology + thresholds
    ├── flags.md                    · canonical flag glossary
    ├── openapi.yaml                · machine-readable REST spec
    └── x402-example.md             · paid endpoint integration example
```

SolSentry monitors Solana mainnet continuously and tracks serial rug pull
operators, bot clusters, and malicious token launches. The data is refreshed
every 30 seconds and available to any client that speaks MCP or plain HTTP.

## Quick start

```bash
npx @solsentry/mcp
```

### Claude Desktop

`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "solsentry": {
      "command": "npx",
      "args": ["-y", "@solsentry/mcp"]
    }
  }
}
```

### Cursor / Claude Code

`.mcp.json`:

```json
{
  "mcpServers": {
    "solsentry": {
      "command": "npx",
      "args": ["-y", "@solsentry/mcp"]
    }
  }
}
```

## Tools

| Tool | Purpose |
|---|---|
| `check_operator` | Risk profile of a wallet as a token deployer. Rug count, tags, risk level. |
| `check_token` | Risk profile of a token mint. Score, flags, operator history, bundle detection. |
| `get_top_operators` | Leaderboard of worst serial ruggers. |
| `get_network_stats` | System-wide stats: scans, accuracy, operators, clusters. |
| `explain_risk` | Plain-English risk summary for any address (wallet or mint). |

## Risk levels

| Level | Criteria |
|---|---|
| `CRITICAL` | 10+ confirmed rugs or token confirmed as rug |
| `HIGH` | 5+ confirmed rugs or risk score ≥ 80 |
| `MEDIUM` | 2+ confirmed rugs or risk score ≥ 50 |
| `LOW` | 1 confirmed rug or risk score > 0 |
| `CLEAN` | No rugs, has tracked tokens |
| `UNKNOWN` | Not in database |

## Configuration

| Environment variable | Default | Purpose |
|---|---|---|
| `SOLSENTRY_API_URL` | `https://api.solsentry.app` | API endpoint |
| `SOLSENTRY_API_KEY` | — | Bearer token for authenticated endpoints |

## TypeScript SDK

Use the same client the MCP server uses, directly from your TypeScript code:

```ts
import { SolSentryClient } from "@solsentry/mcp/client";

const sol = new SolSentryClient();

const op = await sol.get<{ risk_level: string; confirmed_rugs: number }>(
  "/v1/operator/4kxscuteRLQdNiTXA33YYsvywAPNA6DQTifswxjL5pH1",
);

if (op.risk_level === "CRITICAL") {
  console.warn(`Serial rugger detected: ${op.confirmed_rugs} confirmed rugs`);
}
```

Useful for trading bots, wallet warnings, dApp pre-sign checks, and any
backend that needs threat-intel without the MCP transport.

## REST API

Everything this package does is also available via plain HTTP, no install:

```bash
curl https://api.solsentry.app/v1/stats
curl https://api.solsentry.app/v1/operator/4kxscuteRLQdNiTXA33YYsvywAPNA6DQTifswxjL5pH1
curl https://api.solsentry.app/v1/top-operators?limit=5
```

Full endpoint reference: https://solsentry.app/docs/api-reference

## Drain-trace

The endpoint `/v1/drain-trace/{wallet}` traces post-rug SOL flow up to 10
hops through mixers, bridges, and CEXs. Requires an API key with credits.

Free for verified victims — if the wallet received a drain alert from
SolSentry first, drain-trace on that wallet is free.

## Requirements

- Node.js ≥ 18

## License

MIT
