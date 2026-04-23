import type { SolSentryClient } from "../client.js";

export const checkOperatorSchema = {
  name: "check_operator",
  description:
    "Check the risk profile of a Solana wallet as a token operator/deployer. " +
    "Returns confirmed rug count, risk label, behavioral tags, and a plain-English summary. " +
    "Call this before interacting with tokens deployed by an address.",
  inputSchema: {
    type: "object" as const,
    properties: {
      wallet_address: {
        type: "string",
        description: "Base58-encoded Solana wallet address to check.",
      },
    },
    required: ["wallet_address"],
  },
} as const;

export async function checkOperator(
  client: SolSentryClient,
  args: { wallet_address: string },
): Promise<unknown> {
  return client.get(`/v1/operator/${encodeURIComponent(args.wallet_address)}`);
}
