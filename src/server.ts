import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { SolSentryClient, SolSentryError } from "./client.js";
import { checkOperator, checkOperatorSchema } from "./tools/check_operator.js";
import { checkToken, checkTokenSchema } from "./tools/check_token.js";
import { getTopOperators, getTopOperatorsSchema } from "./tools/get_top_operators.js";
import { getNetworkStats, getNetworkStatsSchema } from "./tools/get_network_stats.js";
import { explainRisk, explainRiskSchema } from "./tools/explain_risk.js";

const INSTRUCTIONS =
  "SolSentry is a Solana threat intelligence system. It tracks serial rug pull operators, " +
  "bot clusters, and KOL networks across 20,000+ token scans with 83.8% accuracy and zero " +
  "false positives in CRITICAL risk level. Use check_operator before interacting with any " +
  "token deployer. Use check_token before buying a token. Use get_top_operators to see the " +
  "worst serial ruggers currently active on Solana.";

export function createServer(client: SolSentryClient): Server {
  const server = new Server(
    { name: "solsentry", version: "0.1.0" },
    { capabilities: { tools: {} }, instructions: INSTRUCTIONS },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      checkOperatorSchema,
      checkTokenSchema,
      getTopOperatorsSchema,
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

async function dispatch(
  client: SolSentryClient,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "check_operator":
      return checkOperator(client, args as { wallet_address: string });
    case "check_token":
      return checkToken(client, args as { mint_address: string });
    case "get_top_operators":
      return getTopOperators(client, args as { limit?: number });
    case "get_network_stats":
      return getNetworkStats(client);
    case "explain_risk":
      return explainRisk(client, args as { address: string });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
