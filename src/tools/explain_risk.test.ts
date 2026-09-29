import { test } from "node:test";
import assert from "node:assert/strict";
import { explainRisk } from "./explain_risk.js";
import type { SolSentryClient } from "../client.js";

// B-E2E-3 regression (2026-07-11): the operator gate read `total_tokens_tracked`,
// a field the live /v1/operator response never had (it returns `total_tokens`).
// The gate was therefore always false and a KNOWN serial rugger came back as
// "No data found … insufficient data" — a misleading answer from the one tool
// documented as "why a wallet is risky, suitable for displaying to end users".

function clientReturning(routes: Record<string, unknown>): SolSentryClient {
  return {
    get: async <T>(path: string): Promise<T> => {
      for (const [prefix, payload] of Object.entries(routes)) {
        if (path.startsWith(prefix)) return payload as T;
      }
      throw new Error(`no route for ${path}`);
    },
  } as SolSentryClient;
}

test("explain_risk recognizes a known operator (total_tokens field)", async () => {
  const client = clientReturning({
    "/v1/operator/": {
      known: true,
      total_tokens: 1723,
      confirmed_rugs: 1607,
      summary: "CRITICAL: 1607 confirmed rug(s) across 1723 deployed token(s) (93.3% rug rate).",
    },
  });
  const res = await explainRisk(client, { address: "DemoXopRatorWa11etExamp1e1111111111111111111" });
  assert.equal(res.source, "operator");
  assert.match(res.explanation, /1607 confirmed rug/);
});

test("explain_risk falls through to token for a non-operator address", async () => {
  // /v1/operator answers known:false for a mint (live, 2026-09-29).
  const client = clientReturning({
    "/v1/operator/": { known: false },
    "/v1/token/": { known: true, summary: "CRITICAL (risk 100/100): flagged by SolSentry's scanner." },
  });
  const res = await explainRisk(client, { address: "74JfujGDY2dR4Jw1FyacUJC1gQUUSxXCFZmBcikV22Zr" });
  assert.equal(res.source, "token");
  assert.match(res.explanation, /CRITICAL/);
});

test("explain_risk does not crash on a missing address (B-FS-5)", async () => {
  const client = clientReturning({});
  // @ts-expect-error — deliberately omit the required address to prove the guard
  const res = await explainRisk(client, {});
  assert.equal(res.source, "unknown");
  assert.match(res.explanation, /requires an 'address'/);
});

test("explain_risk degrades honestly when nothing is known", async () => {
  const client = clientReturning({
    "/v1/operator/": { known: false },
    "/v1/token/": { known: false },
  });
  const res = await explainRisk(client, { address: "So11111111111111111111111111111111111111112" });
  assert.equal(res.source, "unknown");
  assert.match(res.explanation, /No data found/);
});

test("explain_risk never sends a tracked wallet to the token scanner", async () => {
  const seen: string[] = [];
  const client = {
    get: async <T>(path: string): Promise<T> => {
      seen.push(path);
      if (path.startsWith("/v1/operator/")) return { known: true, total_tokens: 0, summary: "Tracked wallet." } as T;
      return { known: true, summary: "scanned" } as T;
    },
  } as SolSentryClient;
  const res = await explainRisk(client, { address: "DemoXopRatorWa11etExamp1e1111111111111111111" });
  assert.equal(res.source, "operator");
  assert.equal(seen.filter((p) => p.startsWith("/v1/token/")).length, 0);
});

test("explain_risk says withheld counts are not a clean record", async () => {
  const client = clientReturning({
    "/v1/operator/": { known: true, total_tokens: 0, attribution: "unverified", summary: "UNKNOWN." },
  });
  const res = await explainRisk(client, { address: "DemoXopRatorWa11etExamp1e1111111111111111111" });
  assert.equal(res.source, "operator");
  assert.match(res.explanation, /withheld/);
  assert.match(res.explanation, /does not mean clean/);
});

test("explain_risk reports rate limiting instead of 'no data'", async () => {
  const { SolSentryError } = await import("../client.js");
  const client = {
    get: async () => {
      throw new SolSentryError("SolSentry API 429: Too Many Requests", 429, "");
    },
  } as unknown as SolSentryClient;
  const res = await explainRisk(client, { address: "So11111111111111111111111111111111111111112" });
  assert.equal(res.source, "unknown");
  assert.match(res.explanation, /HTTP 429/);
});
