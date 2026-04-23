import type { SolSentryClient } from "../client.js";

export const checkTokenSchema = {
  name: "check_token",
  description:
    "Check the risk profile of a Solana token by mint address. " +
    "Returns risk score, risk flags, operator history, and bundle detection. " +
    "Call this before buying or listing any token.",
  inputSchema: {
    type: "object" as const,
    properties: {
      mint_address: {
        type: "string",
        description: "Base58-encoded Solana token mint address.",
      },
    },
    required: ["mint_address"],
  },
} as const;

export async function checkToken(
  client: SolSentryClient,
  args: { mint_address: string },
): Promise<unknown> {
  return client.get(`/v1/token/${encodeURIComponent(args.mint_address)}`);
}
