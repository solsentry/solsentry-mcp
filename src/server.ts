import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { SolSentryClient, SolSentryError } from "./client.js";
import { checkOperator, checkOperatorSchema } from "./tools/check_operator.js";
import { checkToken, checkTokenSchema } from "./tools/check_token.js";
import { getNetworkStats, getNetworkStatsSchema } from "./tools/get_network_stats.js";
import { explainRisk, explainRiskSchema } from "./tools/explain_risk.js";
import { VERSION } from "./version.js";

const INSTRUCTIONS =
  "SolSentry is a Solana threat intelligence system. It tracks serial rug-pull operators, " +
  "bot clusters, and funding networks using persistent operator memory — every verdict is " +
  "auditable per-mint at /v1/predictions/{mint}. Use check_operator before interacting with " +
  "any token deployer and check_token before buying a token. Verdicts are mint-level; " +
  "SolSentry does not publish a system-wide operator leaderboard.";

export function createServer(client: SolSentryClient): Server {
  const server = new Server(
    { name: "solsentry", version: VERSION },
    { capabilities: { tools: {} }, instructions: INSTRUCTIONS },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      checkOperatorSchema,
      checkTokenSchema,
      getNetworkStatsSchema,
      explainRiskSchema,
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      const result = await dispatch(client, name, args as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const message = error instanceof SolSentryError
        ? `SolSentry API error (${error.status}): ${error.message}`
        : error instanceof Error
          ? error.message
          : String(error);

      return {
        isError: true,
        content: [{ type: "text", text: message }],
      };
    }
  });

  return server;
}

// Reject missing/blank required string args with a clean message BEFORE the
// handler runs. Without this the MCP SDK forwards `{}` straight through and a
// tool builds `/v1/operator/undefined` (200 known=false noise) or crashes on
// `addr.slice(undefined)` (explain_risk) — neither is an honest error for the
// caller. Central so every tool is covered and future tools inherit it.
export function requireStringArgs(
  args: Record<string, unknown>,
  required: readonly string[],
  toolName: string,
): void {
  for (const key of required) {
    const v = args[key];
    if (typeof v !== "string" || v.trim() === "") {
      throw new Error(`${toolName} requires a non-empty string argument '${key}'`);
    }
  }
}

async function dispatch(
  client: SolSentryClient,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "check_operator":
      requireStringArgs(args, checkOperatorSchema.inputSchema.required, name);
      return checkOperator(client, args as { wallet_address: string });
    case "check_token":
      requireStringArgs(args, checkTokenSchema.inputSchema.required, name);
      return checkToken(client, args as { mint_address: string });
    case "get_network_stats":
      return getNetworkStats(client);
    case "explain_risk":
      requireStringArgs(args, explainRiskSchema.inputSchema.required, name);
      return explainRisk(client, args as { address: string });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
