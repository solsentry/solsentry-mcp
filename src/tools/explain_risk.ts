import { SolSentryError, type SolSentryClient } from "../client.js";

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
  total_tokens?: number;
  rug_rate_pct?: number;
  risk_label?: string;
  tags?: string[];
  attribution?: string;
  attribution_note?: string;
}

// Statuses that mean "ask again later", not "no data".
const TRANSIENT = new Set([429, 502, 503, 504]);

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
  // Defense-in-depth: the server dispatch already guards required args, but
  // this fn is exported/callable directly — never let a missing address reach
  // `addr.slice(...)` and crash with an opaque "Cannot read properties of
  // undefined" (B-FS-5).
  if (typeof addr !== "string" || addr.trim() === "") {
    return {
      explanation: "explain_risk requires an 'address' (a Solana wallet or token mint).",
      source: "unknown",
    };
  }

  let transient: number | null = null;
  const note = (err: unknown) => {
    if (err instanceof SolSentryError && TRANSIENT.has(err.status)) transient = err.status;
  };

  // Try as operator first. /v1/operator answers known:false for any address the
  // operator graph does not track — every mint included (checked live
  // 2026-09-29) — so known:true means a tracked wallet: answer from it and never
  // send a wallet to /v1/token, which would start an on-demand token scan.
  try {
    // B-E2E-3 (2026-07-11): the live /v1/operator response field is
    // `total_tokens` — `total_tokens_tracked` never existed.
    const op = await client.get<OperatorResponse>(`/v1/operator/${encodeURIComponent(addr)}`);
    if (op.known) {
      if (op.attribution === "unverified") {
        // LOCK-03: counts are zeroed on purpose, not because the wallet is clean.
        const why = op.attribution_note ? ` (${op.attribution_note})` : "";
        return {
          explanation:
            `${op.summary ?? "Tracked wallet."} Deploy counts are withheld: its token creations ` +
            `could not be verified on-chain${why}. Zero here does not mean clean.`,
          source: "operator",
        };
      }
      if ((op.total_tokens ?? 0) > 0) {
        return { explanation: op.summary ?? "(no summary available)", source: "operator" };
      }
      return {
        explanation: op.summary ?? "Tracked wallet with no verified token deployments on record.",
        source: "operator",
      };
    }
  } catch (err) {
    note(err);
  }

  // Try as token mint
  try {
    const token = await client.get<TokenResponse>(`/v1/token/${encodeURIComponent(addr)}`);
    if (token.known) {
      return { explanation: token.summary ?? "(no summary available)", source: "token" };
    }
  } catch (err) {
    note(err);
  }

  if (transient !== null) {
    return {
      explanation: `SolSentry is busy or rate-limiting right now (HTTP ${transient}). Try again shortly.`,
      source: "unknown",
    };
  }

  return {
    explanation: `No data found for ${addr.slice(0, 16)}... in SolSentry's database. ` +
      "Address not yet scanned or too recent to have outcome data.",
    source: "unknown",
  };
}
