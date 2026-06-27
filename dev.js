#!/usr/bin/env node
/**
 * SOCIONET — Easy Dev Launcher
 *
 * Runs the frontend in mock mode (no ICP blockchain / dfx / mops needed).
 * Mock mode is enabled via VITE_USE_MOCK=true in src/frontend/.env.development
 *
 * Usage:
 *   npm install   →  installs frontend dependencies
 *   npm run dev   →  starts Vite dev server at http://localhost:5173
 */

import { execSync, spawn } from "child_process";
import { existsSync } from "fs";
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

function run(cmd, cwd = __dirname) {
  console.log(colors.yellow(`  → ${cmd}`));
  execSync(cmd, { stdio: "inherit", cwd, shell: true });
}

async function main() {
  console.log();
  console.log(colors.bold(colors.cyan("  ╔══════════════════════════════════════╗")));
  console.log(colors.bold(colors.cyan("  ║         SOCIONET  Dev Server         ║")));
  console.log(colors.bold(colors.cyan("  ╚══════════════════════════════════════╝")));
  console.log();
  console.log(colors.green("  ✓ Mock mode enabled  (no ICP blockchain required)"));
  console.log(colors.green("  ✓ All features work with built-in demo data"));
  console.log();

  // Make sure frontend deps are installed
  const nodeModulesOk = existsSync(resolve(FRONTEND_DIR, "node_modules", "vite"));
  if (!nodeModulesOk) {
    console.log(colors.yellow("  📦 Installing frontend dependencies..."));
    console.log();
    run("npm install --legacy-peer-deps", FRONTEND_DIR);
    console.log();
  }

  console.log(colors.cyan("  🌐 Starting Vite dev server..."));
  console.log(colors.bold("  ➜  http://localhost:5173"));
  console.log();

  // Spawn the Vite dev server with --force to clear the dependency cache
  const vite = spawn("npm", ["run", "dev", "--", "--force"], {
    stdio: "inherit",
    cwd: FRONTEND_DIR,
    shell: true,
    env: {
      ...process.env,
      VITE_USE_MOCK: "true",
      FORCE_COLOR: "1",
    },
  });

  vite.on("close", (code) => {
    if (code !== 0) {
      console.log(colors.red(`\n  ✗ Vite exited with code ${code}`));
    }
    process.exit(code ?? 0);
  });

  process.on("SIGINT", () => {
    vite.kill("SIGINT");
  });
  process.on("SIGTERM", () => {
    vite.kill("SIGTERM");
  });
}

main().catch((e) => {
  console.error(colors.red("  ✗ Failed to start:"), e.message);
  process.exit(1);
});
