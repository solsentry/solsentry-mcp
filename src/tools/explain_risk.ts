import type { SolSentryClient } from "../client.js";

export const explainRiskSchema = {
  name: "explain_risk",
  description:
    "Get a human-readable explanation of why a wallet or token is risky. " +
    "Accepts either a wallet address (checked as operator) or a token mint address. " +
    "Returns a plain-English warning suitable for displaying to end users.",
  inputSchema: {
    type: "object" as const,
    properties: {
      address: {
        type: "string",
        description: "Solana wallet address or token mint address.",
      },
    },
    required: ["address"],
  },
} as const;

interface OperatorResponse {
  known?: boolean;
  summary?: string;
  confirmed_rugs?: number;
  total_tokens_tracked?: number;
  rug_rate_pct?: number;
  risk_label?: string;
  tags?: string[];
}

interface TokenResponse {
  known?: boolean;
  summary?: string;
  risk_score?: number;
  final_outcome?: string;
  flags?: string[];
}

export async function explainRisk(
  client: SolSentryClient,
  args: { address: string },
): Promise<{ explanation: string; source: "operator" | "token" | "unknown" }> {
  const addr = args.address;

  // Try as operator first
  try {
    const op = await client.get<OperatorResponse>(`/v1/operator/${encodeURIComponent(addr)}`);
    if (op.known && (op.total_tokens_tracked ?? 0) > 0) {
      return { explanation: op.summary ?? "(no summary available)", source: "operator" };
    }
  } catch {
    // fall through
  }

  // Try as token mint
  try {
    const token = await client.get<TokenResponse>(`/v1/token/${encodeURIComponent(addr)}`);
    if (token.known) {
      return { explanation: token.summary ?? "(no summary available)", source: "token" };
    }
  } catch {
    // fall through
  }

  return {
    explanation: `No data found for ${addr.slice(0, 16)}... in SolSentry's database. ` +
      "Address not yet scanned or too recent to have outcome data.",
    source: "unknown",
  };
}
