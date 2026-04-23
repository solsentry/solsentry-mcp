#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SolSentryClient } from "./client.js";
import { createServer } from "./server.js";

export { SolSentryClient, SolSentryError } from "./client.js";
export type { SolSentryClientOptions } from "./client.js";
export { createServer } from "./server.js";

async function main(): Promise<void> {
  const client = new SolSentryClient();
  const server = createServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const isDirectInvocation =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("solsentry-mcp");

if (isDirectInvocation) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[solsentry-mcp] fatal: ${message}\n`);
    process.exit(1);
  });
}
