const DEFAULT_API_URL = "https://api.solsentry.app";
const USER_AGENT = "solsentry-mcp/0.2.0";

export interface SolSentryClientOptions {
  apiUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export class SolSentryClient {
  private readonly apiUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;

  constructor(options: SolSentryClientOptions = {}) {
    this.apiUrl = (options.apiUrl ?? process.env.SOLSENTRY_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");
    this.apiKey = options.apiKey ?? process.env.SOLSENTRY_API_KEY;
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  async get<T>(path: string): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        "Accept": "application/json",
        "User-Agent": USER_AGENT,
      };
      if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`;

      const response = await fetch(url, { headers, signal: controller.signal });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new SolSentryError(
          `SolSentry API ${response.status}: ${response.statusText}`,
          response.status,
          body,
        );
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}

export class SolSentryError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string,
  ) {
    super(message);
    this.name = "SolSentryError";
  }
}
