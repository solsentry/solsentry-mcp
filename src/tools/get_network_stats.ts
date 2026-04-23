import type { SolSentryClient } from "../client.js";

export const getNetworkStatsSchema = {
  name: "get_network_stats",
  description:
    "Get SolSentry system-wide threat intelligence statistics: " +
    "total scans, accuracy, resolve rate, operator counts, bot clusters.",
  inputSchema: {
    type: "object" as const,
    properties: {},
  },
} as const;

export async function getNetworkStats(
  client: SolSentryClient,
): Promise<unknown> {
  return client.get(`/v1/stats`);
}
