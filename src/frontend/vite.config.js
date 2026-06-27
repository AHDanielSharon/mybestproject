import { fileURLToPath, URL } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import environment from "vite-plugin-environment";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  const ii_url =
    env.DFX_NETWORK === "local"
      ? `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:8081/`
      : `https://identity.internetcomputer.org/`;

  process.env.II_URL = env.II_URL || ii_url;
  process.env.STORAGE_GATEWAY_URL =
    env.STORAGE_GATEWAY_URL || "https://blob.caffeine.ai";

  return {
    logLevel: "error",
    build: {
      emptyOutDir: true,
      sourcemap: false,
      minify: false,
    },
    css: {
      postcss: "./postcss.config.js",
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: "globalThis",
        },
      },
    },
    server: {
      allowedHosts: true,
      proxy: {
        "/api": {
          target: env.VITE_USE_MOCK === "true" ? "http://127.0.0.1:4000" : "http://127.0.0.1:4943",
          changeOrigin: true,
          rewrite: (path) => env.VITE_USE_MOCK === "true" ? path.replace(/^\/api/, "") : path,
        },
      },
    },
    plugins: [
      environment("all", { prefix: "CANISTER_" }),
      environment("all", { prefix: "DFX_" }),
      environment(["II_URL"]),
      environment(["STORAGE_GATEWAY_URL"]),
      react(),
    ],
    resolve: {
      alias: [
        ...(env.VITE_USE_MOCK === "true" ? [{
          find: "@caffeineai/core-infrastructure",
          replacement: fileURLToPath(new URL("./src/lib/core-infrastructure-mock.tsx", import.meta.url)),
        }] : []),
        {
          find: "declarations",
          replacement: fileURLToPath(new URL("../declarations", import.meta.url)),
        },
        {
          find: "@",
          replacement: fileURLToPath(new URL("./src", import.meta.url)),
        },
      ],
      dedupe: ["@dfinity/agent"]
    },
  };
});
