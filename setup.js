#!/usr/bin/env node
/**
 * SOCIONET Local Dev Setup Script
 *
 * Automates the full local dev workflow:
 *   1. Starts the ICP local network
 *   2. Creates and deploys backend + frontend canisters
 *   3. Reads the backend canister ID
 *   4. Writes env.json so the frontend can connect to the real canister
 *   5. Starts the Vite dev server
 *
 * Usage:
 *   node setup.js           → full deploy + start dev server
 *   node setup.js --dev-only → skip deploy, just update env.json + start dev
 */

import { execSync, spawn } from "child_process";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const ENV_JSON_PATH = resolve(ROOT, "src/frontend/env.json");

const LOCAL_HOST = "http://localhost:8081";
const STORAGE_GATEWAY_URL = "http://localhost:6188";
const II_URL = "http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:8081";

const args = process.argv.slice(2);
const devOnly = args.includes("--dev-only");
const skipDeploy = args.includes("--skip-deploy");

function run(cmd, options = {}) {
  console.log(`\n→ ${cmd}`);
  return execSync(cmd, {
    stdio: "inherit",
    cwd: ROOT,
    ...options,
  });
}

function runCapture(cmd) {
  console.log(`\n→ ${cmd}`);
  return execSync(cmd, { cwd: ROOT }).toString().trim();
}

function writeEnvJson(canisterId) {
  const envJson = {
    backend_host: LOCAL_HOST,
    backend_canister_id: canisterId,
    project_id: "undefined",
    ii_derivation_origin: "undefined",
    storage_gateway_url: STORAGE_GATEWAY_URL,
  };
  writeFileSync(ENV_JSON_PATH, JSON.stringify(envJson, null, 2));
  console.log(`\n✅ Written env.json with backend_canister_id: ${canisterId}`);
  console.log(`   env.json path: ${ENV_JSON_PATH}`);
}

async function main() {
  console.log("\n🚀 SOCIONET Local Dev Setup\n");

  if (!devOnly && !skipDeploy) {
    // Step 1: Start local ICP network
    console.log("\n📡 Starting ICP local network...");
    try {
      run("icp network start -d");
    } catch (e) {
      console.log(
        "⚠️  icp network start failed (may already be running). Continuing..."
      );
    }

    // Step 2: Create canisters
    console.log("\n📦 Creating canisters...");
    let backendCanisterId;
    try {
      run("icp canister create --environment local frontend");
    } catch (e) {
      console.log("⚠️  frontend canister may already exist. Continuing...");
    }
    try {
      const output = runCapture("icp canister create --environment local backend");
      // Extract canister ID from output like "Created canister backend with ID tz2ag-zx777-77776-aaabq-cai"
      const match = output.match(/ID\s+(\w+(?:-\w+)*)/);
      if (match) {
        backendCanisterId = match[1];
      }
    } catch (e) {
      console.log("⚠️  backend canister may already exist. Continuing...");
    }

    // Step 3: Get backend canister ID (fallback if not captured from create)
    if (!backendCanisterId) {
      console.log("\n🔍 Fetching backend canister ID from list...");
      try {
        const output = runCapture("icp canister list --environment local");
        // Extract from output like "backend (tz2ag-zx777-77776-aaabq-cai)"
        const match = output.match(/backend\s+\((\w+(?:-\w+)*)\)/);
        if (match) {
          backendCanisterId = match[1];
        } else {
          // Try alternative format
          const lines = output.split('\n');
          for (const line of lines) {
            if (line.includes('backend')) {
              const parts = line.match(/(\w+(?:-\w+)*)/g);
              if (parts && parts.length > 0) {
                backendCanisterId = parts[0];
                break;
              }
            }
          }
        }
      } catch (e) {
        console.error("❌ Could not fetch backend canister ID:", e.message);
        process.exit(1);
      }
    }

    if (!backendCanisterId) {
      console.error("❌ backend canister ID is empty. Something went wrong.");
      process.exit(1);
    }

    // Step 4: Write env.json
    writeEnvJson(backendCanisterId);

    // Step 5: Deploy canisters
    console.log("\n🏗️  Deploying backend and frontend canisters...");
    process.env.BACKEND_CANISTER_ID = backendCanisterId;
    process.env.STORAGE_GATEWAY_URL = STORAGE_GATEWAY_URL;
    process.env.II_URL = II_URL;
    try {
      run("icp deploy --environment local backend frontend", {
        env: { ...process.env },
      });
    } catch (e) {
      console.error("❌ Deploy failed:", e.message);
      process.exit(1);
    }
  } else if (devOnly || skipDeploy) {
    // Just read the existing canister ID from env.json if it exists
    if (existsSync(ENV_JSON_PATH)) {
      try {
        const existing = JSON.parse(readFileSync(ENV_JSON_PATH, "utf-8"));
        if (
          existing.backend_canister_id &&
          existing.backend_canister_id !== "undefined"
        ) {
          console.log(
            `\n✅ Using existing canister ID: ${existing.backend_canister_id}`
          );
        } else {
          // Try to get it live from icp CLI
          try {
            const id = runCapture(
              "icp canister settings show --environment local --id-only backend"
            );
            writeEnvJson(id);
          } catch {
            console.warn(
              "⚠️  Could not fetch canister ID. Make sure the backend is deployed."
            );
          }
        }
      } catch {
        console.warn("⚠️  Could not read env.json.");
      }
    }
  }

  // Step 6: Start Vite dev server
  console.log("\n🌐 Starting Vite dev server (frontend)...");
  console.log("   Frontend: http://localhost:5173");
  console.log("   Backend ICP replica: http://localhost:8081\n");

  const vite = spawn("npm", ["run", "dev", "--prefix", "src/frontend"], {
    stdio: "inherit",
    cwd: ROOT,
    shell: true,
    env: {
      ...process.env,
      DFX_NETWORK: "local",
      STORAGE_GATEWAY_URL,
      II_URL,
    },
  });

  vite.on("close", (code) => {
    console.log(`\nVite exited with code ${code}`);
  });

  process.on("SIGINT", () => {
    console.log("\n\n🛑 Shutting down...");
    vite.kill();
    try {
      execSync("icp network stop", { cwd: ROOT });
    } catch {}
    process.exit(0);
  });
}

main().catch((e) => {
  console.error("❌ Setup failed:", e);
  process.exit(1);
});
