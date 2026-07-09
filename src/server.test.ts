import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { VERSION } from "./version.js";
import { checkOperatorSchema } from "./tools/check_operator.js";
import { checkTokenSchema } from "./tools/check_token.js";
import { getNetworkStatsSchema } from "./tools/get_network_stats.js";
import { explainRiskSchema } from "./tools/explain_risk.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

// The MCP handshake advertised 0.1.0 while the package shipped 0.2.3 (fixed 2026-07-09).
test("handshake version matches package.json", () => {
  assert.equal(VERSION, pkg.version);
});

// Every advertised tool must hit an endpoint that exists. `get_top_operators` was removed
// because /v1/top-operators is 404 by design (public leaderboard gated: fee-payer != deployer
// inflates system-wide operator aggregates). Re-adding it is a positioning landmine, not just
// a broken call.
test("no tool advertises the gated operator leaderboard", () => {
  const names = [
    checkOperatorSchema.name,
    checkTokenSchema.name,
    getNetworkStatsSchema.name,
    explainRiskSchema.name,
  ];
  assert.equal(names.includes("get_top_operators" as never), false);
  assert.equal(new Set(names).size, names.length, "tool names must be unique");
});
