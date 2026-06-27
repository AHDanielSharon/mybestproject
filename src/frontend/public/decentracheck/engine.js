/* DECENTRA-CHECK AI — Analysis Engine */
"use strict";

const ENGINE_VERSION = "2.1.0";

// ── Scoring weights ─────────────────────────────────────────────────────────
const WEIGHTS = {
  dataStorage:      20,  // How data is stored (blockchain/IPFS vs SQL/localStorage)
  networking:       18,  // P2P vs client-server patterns
  identity:         15,  // Decentralized identity vs central auth
  codeExecution:    15,  // Smart contracts / canisters vs central server
  governance:       12,  // DAO / token voting vs admin controls
  openSource:       10,  // License, public repo signals
  resilience:        10, // No single point of failure
};

// ── Pattern library ─────────────────────────────────────────────────────────
const PATTERNS = {
  decentralized: [
    // Blockchain / smart contracts
    { re: /\b(solidity|\.sol|web3|ethers|wagmi|viem|hardhat|foundry|truffle|anchor|near|cosmwasm|ink!)\b/i,
      label:"Smart Contract / Blockchain SDK", factor:"codeExecution", weight:12, tag:"dec" },
    { re: /\b(dfinity|@dfinity|dfx|canister|motoko|internet.computer|icp)\b/i,
      label:"Internet Computer (ICP) Canister", factor:"codeExecution", weight:14, tag:"dec" },
    // IPFS / distributed storage
    { re: /\b(ipfs|ipfs-http-client|kubo|pinata|web3\.storage|nft\.storage|arweave|filecoin|bundlr|lighthouse)\b/i,
      label:"Distributed Storage (IPFS/Arweave)", factor:"dataStorage", weight:14, tag:"dec" },
    // P2P networking
    { re: /\b(libp2p|gun\.js|gundb|hypercore|dat|peerjs|webrtc|SimplePeer|wrtc|signalhub|matrix\.js)\b/i,
      label:"P2P Networking", factor:"networking", weight:12, tag:"dec" },
    // Decentralised identity
    { re: /\b(did:|DID|web3auth|magic\.link|worldcoin|ens|unstoppable|ceramic|self\.id|veramo|spruceid)\b/i,
      label:"Decentralized Identity (DID/ENS)", factor:"identity", weight:12, tag:"dec" },
    // Wallet / key management
    { re: /\b(metamask|walletconnect|rainbow|coinbase.wallet|ledger|trezor|phantom|solana.wallet|keplr)\b/i,
      label:"Crypto Wallet Integration", factor:"identity", weight:10, tag:"dec" },
    // Governance
    { re: /\b(dao|governance|snapshot\.org|compound.governor|openzeppelin.Governor|vote|proposal|quorum)\b/i,
      label:"DAO / On-chain Governance", factor:"governance", weight:12, tag:"dec" },
    // Token / NFT
    { re: /\b(ERC20|ERC721|ERC1155|token|NFT|mint|transfer|approve|allowance|tokenomics)\b/i,
      label:"Token / NFT Contract", factor:"codeExecution", weight:8, tag:"dec" },
    // Open source signals
    { re: /\b(MIT|Apache-2\.0|GPL|LGPL|MPL|ISC|Unlicense)\b/,
      label:"Open Source License", factor:"openSource", weight:10, tag:"dec" },
    // Decentralized DNS / hosting
    { re: /\b(ENS|handshake|HNS|IPNS|fleek|skynet|dnslink)\b/i,
      label:"Decentralized DNS / Hosting", factor:"resilience", weight:8, tag:"dec" },
    // LocalStorage / IndexedDB (client-side data sovereignty)
    { re: /\b(localStorage|indexedDB|IDBDatabase|localforage|dexie)\b/i,
      label:"Client-side Data Storage (User-owned)", factor:"dataStorage", weight:6, tag:"dec" },
    // WebRTC (P2P communication)
    { re: /\b(RTCPeerConnection|RTCDataChannel|getUserMedia|webrtc|WebRTC)\b/,
      label:"WebRTC Peer-to-Peer Communication", factor:"networking", weight:10, tag:"dec" },
    // Mock / local backend (no central server dependency)
    { re: /VITE_USE_MOCK\s*=\s*true|mock[Bb]ackend|mockBackend/,
      label:"Mock/Local Backend (No Central Server)", factor:"resilience", weight:7, tag:"dec" },
    // Service worker / offline support
    { re: /\b(serviceWorker|service-worker|workbox|sw\.js|cache\.addAll|CacheStorage)\b/i,
      label:"Service Worker / Offline Support", factor:"resilience", weight:7, tag:"dec" },
    // Cryptography
    { re: /\b(crypto\.subtle|CryptoKey|generateKey|sign|verify|encrypt|decrypt|Ed25519|secp256k1|sha256)\b/,
      label:"Client-side Cryptography", factor:"identity", weight:8, tag:"dec" },
  ],
  centralized: [
    // Central databases
    { re: /\b(mysql|postgresql|mongo(db)?|sqlite|redis|dynamodb|firebase|firestore|supabase|planetscale|neon\.tech)\b/i,
      label:"Centralized Database", factor:"dataStorage", weight:-12, tag:"cen" },
    // Central auth providers
    { re: /\b(oauth|passport\.js|auth0|clerk|okta|firebase.auth|google.sign.in|nextauth)\b/i,
      label:"Centralized Auth Provider", factor:"identity", weight:-10, tag:"cen" },
    // Central APIs / cloud
    { re: /\b(aws|azure|gcloud|heroku|vercel|render\.com|digitalocean|linode|railway)\b/i,
      label:"Cloud / Central Server Dependency", factor:"resilience", weight:-8, tag:"cen" },
    // Admin controls
    { re: /\b(admin|ADMIN|superuser|root.access|sudo|adminOnly|isAdmin|role.*admin)\b/,
      label:"Centralized Admin Control", factor:"governance", weight:-8, tag:"cen" },
    // Payment processors
    { re: /\b(stripe|paypal|razorpay|braintree|square\.com|checkout\.com)\b/i,
      label:"Centralized Payment Processor", factor:"governance", weight:-6, tag:"cen" },
    // Central CDN / file hosting
    { re: /\b(cloudflare|cdn\.jsdelivr|unpkg\.com|cloudinary|s3\.amazonaws|blob\.core\.windows)\b/i,
      label:"Centralized CDN / File Host", factor:"networking", weight:-5, tag:"cen" },
  ]
};

// ── Topology builder ────────────────────────────────────────────────────────
function buildTopology(evidence) {
  const nodes = new Map();
  const edges = [];

  const add = (id, label, color, shape="dot") => {
    if (!nodes.has(id)) nodes.set(id, { id, label, color, shape, size: 18 });
  };

  add("client", "Browser\nClient", "#19e3ff", "ellipse");

  evidence.forEach(e => {
    if (e.tag === "dec") {
      if (/IPFS|Arweave|Filecoin/i.test(e.label)) {
        add("ipfs","IPFS\nNetwork","#22f5a8","diamond");
        edges.push({from:"client",to:"ipfs"});
      }
      if (/WebRTC|P2P/i.test(e.label)) {
        add("peer1","Peer A","#22f5a8","triangle");
        add("peer2","Peer B","#22f5a8","triangle");
        edges.push({from:"client",to:"peer1"},{from:"client",to:"peer2"},{from:"peer1",to:"peer2"});
      }
      if (/Canister|ICP/i.test(e.label)) {
        add("icp","ICP\nCanister","#8a5cff","star");
        edges.push({from:"client",to:"icp"});
      }
      if (/Blockchain|Contract|Token/i.test(e.label)) {
        add("chain","Blockchain","#8a5cff","hexagon");
        edges.push({from:"client",to:"chain"});
      }
      if (/Service Worker|Offline/i.test(e.label)) {
        add("sw","Service\nWorker","#ffc24b","triangle");
        edges.push({from:"client",to:"sw"});
      }
      if (/Mock|Local Backend/i.test(e.label)) {
        add("local","Local\nBackend","#22f5a8","dot");
        edges.push({from:"client",to:"local"});
      }
    } else {
      if (/Database/i.test(e.label)) {
        add("db","Central\nDB","#ff4d6d","database");
        edges.push({from:"client",to:"db"});
      }
      if (/Cloud|Server/i.test(e.label)) {
        add("srv","Cloud\nServer","#ffc24b","square");
        edges.push({from:"client",to:"srv"});
      }
    }
  });

  return { nodes: [...nodes.values()], edges };
}

// ── Main audit function ─────────────────────────────────────────────────────
async function runAudit(files, onProgress) {
  const evidence = [];
  const seen = new Set();
  let processed = 0;
  const total = files.length;

  const textExts = /\.(js|ts|jsx|tsx|sol|py|go|rs|java|kt|swift|cs|php|rb|mo|html|css|json|toml|yaml|yml|md|txt|sh|env|lock)$/i;

  for (const f of files) {
    processed++;
    onProgress(Math.round((processed / total) * 70), `Scanning ${f.name}…`);

    if (!textExts.test(f.name)) continue;
    let text = "";
    try {
      text = typeof f.content === "string" ? f.content : await f.file.text();
    } catch { continue; }

    const lines = text.split("\n");

    // Check decentralized patterns
    for (const p of PATTERNS.decentralized) {
      const match = text.match(p.re);
      if (match) {
        const lineIdx = lines.findIndex(l => p.re.test(l));
        const key = p.label + f.name;
        if (!seen.has(key)) {
          seen.add(key);
          evidence.push({
            file: f.name,
            label: p.label,
            factor: p.factor,
            weight: p.weight,
            tag: p.tag,
            snippet: lineIdx >= 0 ? lines.slice(Math.max(0,lineIdx-1), lineIdx+3).join("\n").trim() : match[0],
            confidence: Math.min(95, 70 + p.weight * 2),
            reason: `Found "${p.label}" pattern — indicates decentralized architecture`
          });
        }
      }
    }

    // Check centralized patterns
    for (const p of PATTERNS.centralized) {
      const match = text.match(p.re);
      if (match) {
        const lineIdx = lines.findIndex(l => p.re.test(l));
        const key = p.label + f.name;
        if (!seen.has(key)) {
          seen.add(key);
          evidence.push({
            file: f.name,
            label: p.label,
            factor: p.factor,
            weight: p.weight,
            tag: p.tag,
            snippet: lineIdx >= 0 ? lines.slice(Math.max(0,lineIdx-1), lineIdx+3).join("\n").trim() : match[0],
            confidence: Math.min(90, 65 + Math.abs(p.weight) * 2),
            reason: `Found "${p.label}" pattern — introduces centralization`
          });
        }
      }
    }
  }

  onProgress(80, "Computing score…");

  // ── Score calculation ───────────────────────────────────────────────────
  const factorScores = {};
  for (const k of Object.keys(WEIGHTS)) factorScores[k] = 50; // neutral start

  evidence.forEach(e => {
    if (e.factor && factorScores[e.factor] !== undefined) {
      factorScores[e.factor] = Math.min(100, Math.max(0,
        factorScores[e.factor] + (e.weight > 0 ? e.weight * 3 : e.weight * 2)
      ));
    }
  });

  let totalScore = 0;
  let totalWeight = 0;
  for (const [k, w] of Object.entries(WEIGHTS)) {
    totalScore += (factorScores[k] / 100) * w;
    totalWeight += w;
  }
  const score = Math.round((totalScore / totalWeight) * 100);

  const decCount = evidence.filter(e => e.tag === "dec").length;
  const cenCount = evidence.filter(e => e.tag === "cen").length;

  // ── Classification ──────────────────────────────────────────────────────
  let classify, tagline;
  if (score >= 85) { classify = "🌐 FULLY DECENTRALIZED"; tagline = "Excellent — minimal central points of failure."; }
  else if (score >= 70) { classify = "⚡ HIGHLY DECENTRALIZED"; tagline = "Strong decentralization with minor dependencies."; }
  else if (score >= 55) { classify = "🔀 HYBRID ARCHITECTURE"; tagline = "Mix of decentralized and centralized components."; }
  else if (score >= 35) { classify = "⚠ MOSTLY CENTRALIZED"; tagline = "Some decentralized features but core is centralized."; }
  else { classify = "🔴 FULLY CENTRALIZED"; tagline = "Traditional client-server architecture detected."; }

  // ── Strengths / Weaknesses / Improvements ──────────────────────────────
  const strengths = evidence.filter(e => e.tag === "dec").map(e => e.label);
  const weaknesses = evidence.filter(e => e.tag === "cen").map(e => e.label);
  const improvements = [];
  if (factorScores.dataStorage < 60) improvements.push("Use IPFS or Arweave for decentralized file storage");
  if (factorScores.identity < 60) improvements.push("Integrate DID (Decentralized Identity) or wallet-based auth");
  if (factorScores.networking < 60) improvements.push("Add WebRTC P2P connections for direct user communication");
  if (factorScores.codeExecution < 60) improvements.push("Move business logic to smart contracts or ICP canisters");
  if (factorScores.governance < 60) improvements.push("Implement DAO governance or on-chain voting");
  if (factorScores.resilience < 60) improvements.push("Add Service Worker for offline support and fault tolerance");
  if (factorScores.openSource < 60) improvements.push("Add an open-source license (MIT, Apache 2.0)");

  // ── Executive summary ───────────────────────────────────────────────────
  const execSummary = `This project scored ${score}/100 on the decentralization index. 
Audit found ${decCount} decentralization feature(s) and ${cenCount} centralization concern(s) across ${total} files. 
${score >= 55 ? "The architecture demonstrates meaningful decentralization with P2P components, client-side data sovereignty, or blockchain integration." 
  : "The project relies primarily on centralized infrastructure. Consider migrating storage to IPFS, identity to DIDs, and computation to smart contracts."} 
Key factor scores: Data Storage ${factorScores.dataStorage}%, Networking ${factorScores.networking}%, Identity ${factorScores.identity}%, Code Execution ${factorScores.codeExecution}%.`;

  onProgress(95, "Building topology…");
  const topology = buildTopology(evidence);

  onProgress(100, "Complete!");

  return {
    score,
    classify,
    tagline,
    evidence,
    factorScores,
    strengths: [...new Set(strengths)],
    weaknesses: [...new Set(weaknesses)],
    improvements,
    execSummary,
    topology,
    stats: {
      filesScanned: total,
      decentralizedSignals: decCount,
      centralizationRisks: cenCount,
    }
  };
}

window.DecentraEngine = { runAudit, buildTopology, ENGINE_VERSION };
