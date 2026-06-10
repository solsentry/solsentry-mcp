# @solsentry/mcp

[![npm version](https://img.shields.io/npm/v/@solsentry/mcp.svg)](https://www.npmjs.com/package/@solsentry/mcp)
[![license](https://img.shields.io/npm/l/@solsentry/mcp.svg)](./LICENSE)

> RugCheck tells you a fire is burning. SolSentry tells you who lit it.

SolSentry packages its public operator-risk intelligence surface as an MCP
server, a TypeScript SDK, and a skills bundle. All interfaces use the live REST
API at `https://api.solsentry.app`.

## Canonical live snapshot

- `80,017` predictions tracked
- `91.2%` aggregate accuracy
- `97.9% CRITICAL precision - auditable per-mint`
- `95.3% HIGH precision`
- `94.4% MEDIUM precision`
- `10,112` operators profiled
- `7,004` serial ruggers identified
- `78.0%` dev wallet coverage
- `~1,367h` continuous runtime
- package version: `v0.2.2`
- backend version: `v2.3.21`

Live references:

- API stats: `https://api.solsentry.app/v1/stats`
- NPM: `https://www.npmjs.com/package/@solsentry/mcp`
- GitHub org: `https://github.com/solsentry`

## Interfaces

| Surface | Use it when | Entry |
|---|---|---|
| MCP server | AI agents and MCP clients | `npx -y @solsentry/mcp` |
| TypeScript SDK | TS apps, bots, wallets, backends | `import { SolSentryClient } from "@solsentry/mcp/client"` |
| Skills bundle | Agent environments that support Agent Skills | `npx skills add @solsentry/mcp` |

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
| `get_top_operators` | Leaderboard of serial ruggers |
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
curl https://api.solsentry.app/v1/operator/4kxscuteRLQdNiTXA33YYsvywAPNA6DQTifswxjL5pH1
curl https://api.solsentry.app/v1/top-operators?limit=5
```

## Configuration

| Environment variable | Default | Purpose |
|---|---|---|
| `SOLSENTRY_API_URL` | `https://api.solsentry.app` | API endpoint |
| `SOLSENTRY_API_KEY` | — | Bearer token for authenticated endpoints |

## Notes

- Public quality claim: `97.9% CRITICAL precision - auditable per-mint`.

## Requirements

- Node.js >= 18

## License

MIT
