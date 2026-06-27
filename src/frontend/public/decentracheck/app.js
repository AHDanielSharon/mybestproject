/* DECENTRA-CHECK AI — UI App */
"use strict";

// ── Particles canvas ────────────────────────────────────────────────────────
(function initParticles() {
  const canvas = document.getElementById("particles");
  const ctx = canvas.getContext("2d");
  let W, H, pts = [];
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);
  for (let i = 0; i < 80; i++) {
    pts.push({ x: Math.random()*2000, y: Math.random()*1200,
      vx: (Math.random()-.5)*0.3, vy: (Math.random()-.5)*0.3,
      r: Math.random()*1.5+0.5, a: Math.random() });
  }
  function frame() {
    ctx.clearRect(0,0,W,H);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if(p.x<0)p.x=W; if(p.x>W)p.x=0;
      if(p.y<0)p.y=H; if(p.y>H)p.y=0;
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(25,227,255,${p.a*0.4})`;
      ctx.fill();
    });
    requestAnimationFrame(frame);
  }
  frame();
})();

// ── State ───────────────────────────────────────────────────────────────────
let auditResult = null;
let networkData = null;
let knockedOut = new Set();

// ── DOM refs ────────────────────────────────────────────────────────────────
const hero       = document.getElementById("hero");
const drop       = document.getElementById("drop");
const progressEl = document.getElementById("progress");
const results    = document.getElementById("results");
const barFill    = document.getElementById("barFill");
const progPhase  = document.getElementById("progPhase");
const progPct    = document.getElementById("progPct");
const logEl      = document.getElementById("log");

function log(msg) {
  const d = document.createElement("div");
  d.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logEl.appendChild(d);
  logEl.scrollTop = logEl.scrollHeight;
}

function setProgress(pct, phase) {
  barFill.style.width = pct + "%";
  progPhase.textContent = phase;
  progPct.textContent = pct + "%";
  log(phase);
}

// ── File collection helpers ─────────────────────────────────────────────────
const IGNORE_RE = /(^|\/)(node_modules|\.git|dist|build|\.next|\.cache|target|coverage)\//i;

function fromFileList(list) {
  return [...list]
    .filter(f => !IGNORE_RE.test(f.webkitRelativePath || f.name))
    .map(f => ({ name: f.webkitRelativePath || f.name, file: f }));
}

async function fromZip(file) {
  const JSZip = window.JSZip;
  if (!JSZip) { alert("JSZip library not loaded — try selecting files directly."); return []; }
  const zip = await JSZip.loadAsync(file);
  const out = [];
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (IGNORE_RE.test(path)) continue;
    const name = path.split("/").pop() || path;
    const content = await entry.async("string").catch(()=>"");
    out.push({ name: path, content }); // Keep full path for accuracy
  }
  return out;
}

// ── Start audit ─────────────────────────────────────────────────────────────
async function startAudit(files) {
  if (!files.length) return;
  hero.style.display = "none";
  progressEl.classList.add("on");
  results.classList.remove("on");
  results.style.display = "none";
  logEl.innerHTML = "";
  knockedOut.clear();

  try {
    auditResult = await window.DecentraEngine.runAudit(files, (pct, phase) => {
      setProgress(pct, phase);
    });
    renderResults(auditResult);
    progressEl.classList.remove("on");
    results.style.display = "block";
    setTimeout(() => results.classList.add("on"), 50);
  } catch(e) {
    log("ERROR: " + e.message);
    console.error(e);
  }
}

// ── Render ──────────────────────────────────────────────────────────────────
function renderResults(r) {
  // Score gauge
  const arc = document.getElementById("gaugeArc");
  const offset = 628 - (628 * r.score / 100);
  setTimeout(() => { arc.style.strokeDashoffset = offset; }, 100);
  animateNum("scoreNum", r.score);
  document.getElementById("classify").textContent = r.classify;
  document.getElementById("tagline").textContent = r.tagline;

  // Factor bars
  const factorsEl = document.getElementById("factors");
  factorsEl.innerHTML = Object.entries(r.factorScores).map(([k, v]) => `
    <div class="factor">
      <div class="row"><span>${k.replace(/([A-Z])/g,' $1').trim()}</span><span>${v}%</span></div>
      <div class="b"><i style="width:${v}%"></i></div>
    </div>`).join("");

  // Stats
  document.getElementById("statBlock").innerHTML = [
    { label:"Files Scanned", val: r.stats.filesScanned },
    { label:"Decentralized Signals", val: r.stats.decentralizedSignals },
    { label:"Centralization Risks", val: r.stats.centralizationRisks },
  ].map(s => `<div class="stat"><b>${s.val}</b><span>${s.label}</span></div>`).join("");

  // Architecture diagram
  renderArch(r);

  // Evidence
  renderEvidence("decEvidence", r.evidence.filter(e=>e.tag==="dec"), "dec");
  renderEvidence("cenEvidence", r.evidence.filter(e=>e.tag==="cen"), "cen");

  // Network graph
  renderGraph(r.topology);

  // Sim controls
  renderSim(r.topology);

  // Summary
  document.getElementById("execSummary").textContent = r.execSummary;
  const mkLi = (items, cls) => items.length
    ? items.map(i=>`<li class="${cls}">${i}</li>`).join("")
    : `<li class="muted">None found</li>`;
  document.getElementById("strengths").innerHTML = mkLi(r.strengths, "good");
  document.getElementById("weaknesses").innerHTML = mkLi(r.weaknesses, "bad");
  document.getElementById("improvements").innerHTML = mkLi(r.improvements, "imp");
}

function animateNum(id, target) {
  const el = document.getElementById(id);
  let cur = 0;
  const step = Math.ceil(target / 40);
  const iv = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = cur;
    if (cur >= target) clearInterval(iv);
  }, 30);
}

function renderEvidence(containerId, items, tagClass) {
  const el = document.getElementById(containerId);
  if (!items.length) {
    el.innerHTML = `<p class="empty-note">No ${tagClass === "dec" ? "decentralization" : "centralization"} signals found.</p>`;
    return;
  }
  el.innerHTML = items.map(e => `
    <div class="evi">
      <div class="top">
        <span class="file">${e.file}</span>
        <span class="tag ${e.tag}">${e.tag === "dec" ? "DECENTRALIZED" : "CENTRALIZED"}</span>
      </div>
      <div class="reason">${e.label}</div>
      ${e.snippet ? `<div class="snippet">${escHtml(e.snippet.slice(0,200))}</div>` : ""}
      <div class="conf">
        <div class="b"><i style="width:${e.confidence}%"></i></div>
        <small>${e.confidence}%</small>
      </div>
    </div>`).join("");
}

function renderArch(r) {
  const el = document.getElementById("archDiagram");
  const dec = r.evidence.filter(e=>e.tag==="dec").map(e=>e.label);
  const cen = r.evidence.filter(e=>e.tag==="cen").map(e=>e.label);

  const decNodes = dec.slice(0,4).map(l=>`<div class="node peer"><small>P2P/Chain</small>${l.slice(0,22)}</div>`).join("");
  const cenNodes = cen.slice(0,3).map(l=>`<div class="node srv"><small>Central</small>${l.slice(0,22)}</div>`).join("");

  el.innerHTML = `
    <div class="layer"><div class="node peer"><small>User</small>Browser Client</div></div>
    <div class="conn"></div>
    <div class="layer">${decNodes || '<div class="node" style="border-color:var(--muted);color:var(--muted)"><small>None found</small>Decentralized</div>'}${cenNodes}</div>`;
}

function renderGraph(topology) {
  if (!window.vis) { document.getElementById("netgraph").innerHTML = '<p class="empty-note" style="padding:20px">vis-network not loaded</p>'; return; }
  const container = document.getElementById("netgraph");
  networkData = {
    nodes: new vis.DataSet(topology.nodes.map(n => ({
      ...n,
      font: { color: "#e8f0ff", size: 11 },
      borderWidth: 2,
    }))),
    edges: new vis.DataSet(topology.edges.map((e,i) => ({
      ...e, id: i,
      color: { color: "rgba(25,227,255,0.4)", highlight: "#19e3ff" },
      width: 1.5, smooth: { type: "curvedCW" }
    })))
  };
  new vis.Network(container, networkData, {
    physics: { stabilization: { iterations: 120 }, barnesHut: { gravitationalConstant: -8000 } },
    interaction: { hover: true },
    nodes: { borderWidth: 2, shadow: true },
    edges: { shadow: true },
  });
}

function renderSim(topology) {
  const ctrl = document.getElementById("simControls");
  ctrl.innerHTML = topology.nodes.map(n => `
    <button class="btn ghost sim-btn" data-id="${n.id}" onclick="simKnock('${n.id}','${n.label.replace(/\n/,' ')}')">
      💥 Kill ${n.label.replace(/\n/," ")}
    </button>`).join("");
}

window.simKnock = function(id, label) {
  knockedOut.add(id);
  const total = auditResult.topology.nodes.length;
  const dec = auditResult.topology.nodes.filter(n => ["ipfs","peer1","peer2","icp","chain","sw","local"].includes(n.id)).length;
  const knocked = [...knockedOut].filter(id => !["client"].includes(id)).length;
  const statusEl = document.getElementById("simStatus");
  const detailEl = document.getElementById("simDetail");
  if (networkData) {
    networkData.nodes.update({ id, color: "#ff4d6d", size: 10, opacity: 0.4 });
  }
  if (knocked >= Math.max(1, Math.floor(total * 0.6))) {
    statusEl.className = "sim-status fail";
    statusEl.textContent = "⚠ NETWORK DEGRADED";
    detailEl.textContent = `${knocked}/${total} nodes offline. System may be unavailable.`;
  } else {
    statusEl.className = "sim-status ok";
    statusEl.textContent = "✓ NETWORK RESILIENT";
    detailEl.textContent = `Knocked out: ${[...knockedOut].join(", ")}. System still operational (${total-knocked} nodes active).`;
  }
};

document.getElementById("simReset").addEventListener("click", () => {
  knockedOut.clear();
  if (auditResult) renderGraph(auditResult.topology);
  document.getElementById("simStatus").className = "sim-status ok";
  document.getElementById("simStatus").textContent = "NETWORK OPERATIONAL";
  document.getElementById("simDetail").textContent = "All systems nominal.";
  if (auditResult) renderSim(auditResult.topology);
});

// ── File input handlers ─────────────────────────────────────────────────────
document.getElementById("pickZip").addEventListener("click", e => { e.stopPropagation(); document.getElementById("inpZip").click(); });
document.getElementById("pickFiles").addEventListener("click", e => { e.stopPropagation(); document.getElementById("inpFiles").click(); });
document.getElementById("pickFolder").addEventListener("click", e => { e.stopPropagation(); document.getElementById("inpFolder").click(); });

document.getElementById("inpZip").addEventListener("change", async e => {
  const f = e.target.files[0]; if (!f) return;
  startAudit(await fromZip(f));
});
document.getElementById("inpFiles").addEventListener("change", e => startAudit(fromFileList(e.target.files)));
document.getElementById("inpFolder").addEventListener("change", e => startAudit(fromFileList(e.target.files)));

// Drag and drop
drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("drag"); });
drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
drop.addEventListener("drop", async e => {
  e.preventDefault(); drop.classList.remove("drag");
  const items = [...e.dataTransfer.items];
  const files = [...e.dataTransfer.files];
  if (files.length === 1 && files[0].name.endsWith(".zip")) {
    startAudit(await fromZip(files[0]));
  } else {
    startAudit(fromFileList(files));
  }
});

// ── Reset ───────────────────────────────────────────────────────────────────
document.getElementById("resetBtn").addEventListener("click", () => {
  hero.style.display = "";
  progressEl.classList.remove("on");
  results.classList.remove("on");
  results.style.display = "none";
  auditResult = null;
  logEl.innerHTML = "";
  barFill.style.width = "0";
});

// ── Export JSON ─────────────────────────────────────────────────────────────
document.getElementById("exportJson").addEventListener("click", () => {
  if (!auditResult) return;
  const blob = new Blob([JSON.stringify(auditResult, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "decentra-audit.json";
  a.click();
});

// ── Util ────────────────────────────────────────────────────────────────────
function escHtml(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
