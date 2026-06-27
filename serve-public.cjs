#!/usr/bin/env node
/**
 * SOCIONET — Public Deployment Server
 */

const express = require("express");
const http = require("http");
const path = require("path");
const httpProxy = require("http-proxy");

const FRONTEND_DIST = path.join(__dirname, "src", "frontend", "dist");
const BACKEND_PORT = 4000;
const PUBLIC_PORT = 3000;

const app = express();
const server = http.createServer(app);

// Initialize proxy
const proxy = httpProxy.createProxyServer({
  target: `http://127.0.0.1:${BACKEND_PORT}`,
  ws: true,
  changeOrigin: true,
});

proxy.on("error", (err, req, res) => {
  console.error("Proxy error:", err.message);
  if (res && res.writeHead) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Backend unavailable" }));
  }
});

// ── Proxy /api/* requests to backend ──────────────────
app.use("/api", (req, res) => {
  // express strips /api from req.url, we must restore it or let proxy handle it
  // Actually, we want to forward the exact path to backend, and backend handles /profiles, /messages, etc.
  // Wait, the backend doesn't expect /api prefix! It expects /profiles, etc.
  // Express strips /api from req.url, so req.url is just /profiles. This is exactly what we want to forward!
  proxy.web(req, res);
});

// ── Serve frontend static files ───────────────────────────────────────────
app.use(express.static(FRONTEND_DIST, {
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// ── SPA fallback — serve index.html for all non-file routes ───────────────
app.use((req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(FRONTEND_DIST, "index.html"));
});

// ── WebSocket proxy to backend ────────────────────────────────────────────
server.on("upgrade", (req, socket, head) => {
  // Forward WebSockets to backend
  // The client requests ws://localhost:3000/api
  // proxy.ws will forward it as ws://127.0.0.1:4000/api
  // which works because our backend wss accepts any path!
  proxy.ws(req, socket, head);
});

server.listen(PUBLIC_PORT, "0.0.0.0", () => {
  console.log();
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║       SOCIONET — Public Deployment Server           ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log(`║  🌐  http://localhost:${PUBLIC_PORT}                        ║`);
  console.log(`║  📡  Proxying API/WS → localhost:${BACKEND_PORT}            ║`);
  console.log(`║  📂  Serving frontend from dist/                    ║`);
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log();
});
