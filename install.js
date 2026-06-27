#!/usr/bin/env node
/**
 * SOCIONET — Install Script
 *
 * Installs all frontend dependencies using plain npm.
 * Run once before `npm run dev`.
 */

import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = resolve(__dirname, "src/frontend");

const colors = {
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function run(cmd, cwd) {
  console.log(colors.yellow(`  → ${cmd}`));
  execSync(cmd, { stdio: "inherit", cwd, shell: true });
}

console.log();
console.log(colors.bold(colors.cyan("  ╔══════════════════════════════════════╗")));
console.log(colors.bold(colors.cyan("  ║       SOCIONET  Install Setup        ║")));
console.log(colors.bold(colors.cyan("  ╚══════════════════════════════════════╝")));
console.log();

try {
  console.log(colors.cyan("  📦 Installing frontend dependencies..."));
  console.log();
  run("npm install --legacy-peer-deps", FRONTEND_DIR);
  console.log();
  console.log(colors.bold(colors.green("  ✅ Installation complete!")));
  console.log();
  console.log(colors.cyan("  Now run:  ") + colors.bold("npm run dev"));
  console.log();
} catch (e) {
  console.error(colors.red("  ✗ Install failed:"), e.message);
  process.exit(1);
}
