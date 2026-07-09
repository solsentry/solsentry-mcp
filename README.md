# @solsentry/mcp

[![npm version](https://img.shields.io/npm/v/@solsentry/mcp.svg)](https://www.npmjs.com/package/@solsentry/mcp)
[![license](https://img.shields.io/npm/l/@solsentry/mcp.svg)](./LICENSE)

> RugCheck tells you a fire is burning. SolSentry tells you who lit it.

SolSentry packages its public operator-risk intelligence surface as an MCP
server, a TypeScript SDK, and a skills bundle. All interfaces use the live REST
API at `https://api.solsentry.app`.

## Live references

Precision is auditable per-mint at `/v1/predictions/{mint}` (live). Pull any
current system numbers from the live API rather than this README — never cite a
hardcoded accuracy/precision figure or operator-level aggregate as a standing fact.

- API stats: `https://api.solsentry.app/v1/stats`
- NPM: `https://www.npmjs.com/package/@solsentry/mcp`
- GitHub org: `https://github.com/solsentry`

## Interfaces

| Surface | Use it when | Entry |
|---|---|---|
| **MCP server** | AI agents (Claude Desktop, Cursor, Claude Code, any MCP client) | `npx @solsentry/mcp` |
| **TypeScript SDK** | TS backends, bots, wallets, dApps that don't speak MCP | `import { SolSentryClient } from "@solsentry/mcp/client"` |
| **Skills bundle** | Claude Code / Cursor with the [Agent Skills spec](https://agentskills.io) | `npx skills add @solsentry/mcp` |

All three call the public REST API at `api.solsentry.app`. No API key
required for read endpoints.

Numbers drift daily as predictions resolve — verify live: `curl https://api.solsentry.app/v1/stats`

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
npx -y @solsentry/mcp
```

### Claude Desktop

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
| `check_operator` | Risk profile of a wallet as a token deployer |
| `check_token` | Risk profile of a token mint |
| `get_network_stats` | System-wide public metrics |
| `explain_risk` | Plain-language summary for a wallet or mint |

## TypeScript SDK

```ts
import { SolSentryClient } from "@solsentry/mcp/client";

const client = new SolSentryClient();
const stats = await client.get("/v1/stats");
console.log(stats);
```

## REST API

```bash
curl https://api.solsentry.app/v1/stats
curl https://api.solsentry.app/v1/operator/<wallet-address>
curl https://api.solsentry.app/v1/predictions/<mint-address>
```

## Configuration

| Environment variable | Default | Purpose |
|---|---|---|
| `SOLSENTRY_API_URL` | `https://api.solsentry.app` | API endpoint |
| `SOLSENTRY_API_KEY` | — | Bearer token for authenticated endpoints |

## Notes

- Public quality claim: precision is auditable per-mint at `/v1/predictions/{mint}`
  (live) — re-verify on the day; never ship a hardcoded precision number.

## Requirements

- Node.js >= 18

## License

MIT

## Links + Contact

- **Site:** [solsentry.app](https://solsentry.app)
- **X (project):** [@solsentryai](https://x.com/solsentryai)
- **Telegram:** [t.me/solsentryai](https://t.me/solsentryai)
- **GitHub:** [github.com/solsentry](https://github.com/solsentry)
- **Email:** `hello@solsentry.app`
- **Built by:** [Crash Diniz · @crashdiniz](https://x.com/crashdiniz)
