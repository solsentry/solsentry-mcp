import type { SolSentryClient } from "../client.js";

export const getTopOperatorsSchema = {
  name: "get_top_operators",
  description:
    "Get the top Solana rug pull operators ranked by confirmed scam count. " +
    "Returns a leaderboard of the worst serial deployers tracked by SolSentry.",
  inputSchema: {
    type: "object" as const,
    properties: {
      limit: {
        type: "number",
        description: "Number of operators to return (1-50, default 10).",
        minimum: 1,
        maximum: 50,
      },
    },
  },
} as const;

export async function getTopOperators(
  client: SolSentryClient,
  args: { limit?: number } = {},
): Promise<unknown> {
  const limit = Math.max(1, Math.min(args.limit ?? 10, 50));
  return client.get(`/v1/top-operators?limit=${limit}`);
}
