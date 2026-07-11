// Single source of truth for the version reported in the MCP handshake.
// Kept in sync with package.json by src/server.test.ts — the handshake used to
// advertise 0.1.0 while the package shipped 0.2.3.
export const VERSION = "0.3.1";
