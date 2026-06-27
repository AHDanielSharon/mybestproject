const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "200mb" }));

// ── Persistent DB ──────────────────────────────────────────────────────────
const DB_FILE = path.join(__dirname, "socionet_db.json");
let db = {
  profiles: {},       // userId -> profile
  videos: [],         // all videos
  stories: [],        // all stories
  messages: [],       // all messages
  friends: [],        // { user1, user2 }
  friendRequests: [], // { senderText, recipientText, status }
  notifications: [],
  comments: {},       // videoId -> comment[]
  stats: {},          // videoId -> { views, likes, dislikes, shares, likedBy[] }
  signaling: {},      // sessionId -> entries[]
};

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
      console.log("✅ DB loaded from disk");
    }
  } catch (e) {
    console.warn("Could not load DB, starting fresh:", e.message);
  }
}
function saveDb() {
  try { fs.writeFileSync(DB_FILE, JSON.stringify(db), "utf8"); } catch {}
}
loadDb();

// ── WebSocket broadcast for real-time updates ──────────────────────────────
const clients = new Set();
wss.on("connection", (ws) => {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
  ws.on("error", () => clients.delete(ws));
});
function broadcast(event, data) {
  const msg = JSON.stringify({ event, data });
  clients.forEach((c) => { try { if (c.readyState === 1) c.send(msg); } catch {} });
}

const gid = () => Math.random().toString(36).substring(2, 15);
const now = () => Date.now();

// ── PROFILES ──────────────────────────────────────────────────────────────
app.get("/profiles/:userId", (req, res) => {
  const p = db.profiles[req.params.userId];
  res.json(p || null);
});
app.post("/profiles/:userId", (req, res) => {
  db.profiles[req.params.userId] = { ...req.body, updatedAt: now() };
  saveDb();
  broadcast("profile_updated", { userId: req.params.userId });
  res.json({ ok: true });
});
app.get("/profiles", (req, res) => {
  const result = Object.entries(db.profiles).map(([id, p]) => ({ id, ...p }));
  res.json(result);
});
app.get("/profiles/search/:term", (req, res) => {
  const term = req.params.term.toLowerCase();
  const result = Object.entries(db.profiles)
    .filter(([, p]) => p.name && p.name.toLowerCase().includes(term))
    .map(([id, p]) => ({ id, ...p }));
  res.json(result);
});

// ── VIDEOS ────────────────────────────────────────────────────────────────
app.get("/videos", (req, res) => res.json(db.videos));
app.post("/videos", (req, res) => {
  const video = { id: gid(), uploadTime: now(), ...req.body };
  db.videos.unshift(video);
  db.stats[video.id] = { views: 0, likes: 0, dislikes: 0, shares: 0, likedBy: [] };
  db.comments[video.id] = [];
  saveDb();
  broadcast("video_uploaded", { id: video.id });
  res.json({ id: video.id });
});
app.delete("/videos/:id", (req, res) => {
  db.videos = db.videos.filter((v) => v.id !== req.params.id);
  delete db.stats[req.params.id];
  delete db.comments[req.params.id];
  saveDb();
  broadcast("video_deleted", { id: req.params.id });
  res.json({ ok: true });
});
app.get("/videos/creator/:userId", (req, res) => {
  res.json(db.videos.filter((v) => v.creatorText === req.params.userId));
});

// ── STATS & INTERACTIONS ──────────────────────────────────────────────────
app.get("/stats/:videoId", (req, res) => {
  const s = db.stats[req.params.videoId] || { views: 0, likes: 0, dislikes: 0, shares: 0, likedBy: [] };
  res.json({ ...s, comments: db.comments[req.params.videoId] || [] });
});
app.post("/stats/:videoId/like", (req, res) => {
  const { userId } = req.body;
  let s = db.stats[req.params.videoId];
  if (!s) s = db.stats[req.params.videoId] = { views: 0, likes: 0, dislikes: 0, shares: 0, likedBy: [] };
  if (!s.likedBy) s.likedBy = [];
  const idx = s.likedBy.indexOf(userId);
  if (idx === -1) { s.likedBy.push(userId); s.likes = (s.likes || 0) + 1; }
  else { s.likedBy.splice(idx, 1); s.likes = Math.max(0, (s.likes || 1) - 1); }
  saveDb();
  broadcast("stats_updated", { videoId: req.params.videoId });
  res.json({ ok: true });
});
app.post("/stats/:videoId/view", (req, res) => {
  let s = db.stats[req.params.videoId];
  if (!s) s = db.stats[req.params.videoId] = { views: 0, likes: 0, dislikes: 0, shares: 0, likedBy: [] };
  s.views = (s.views || 0) + 1;
  saveDb();
  res.json({ ok: true });
});
app.post("/stats/:videoId/dislike", (req, res) => {
  let s = db.stats[req.params.videoId];
  if (!s) s = db.stats[req.params.videoId] = { views: 0, likes: 0, dislikes: 0, shares: 0, likedBy: [] };
  s.dislikes = (s.dislikes || 0) + 1;
  saveDb(); res.json({ ok: true });
});
app.post("/stats/:videoId/share", (req, res) => {
  let s = db.stats[req.params.videoId];
  if (!s) s = db.stats[req.params.videoId] = { views: 0, likes: 0, dislikes: 0, shares: 0, likedBy: [] };
  s.shares = (s.shares || 0) + 1;
  saveDb(); res.json({ ok: true });
});
app.post("/comments/:videoId", (req, res) => {
  if (!db.comments[req.params.videoId]) db.comments[req.params.videoId] = [];
  db.comments[req.params.videoId].push(req.body);
  saveDb();
  broadcast("comment_added", { videoId: req.params.videoId });
  res.json({ ok: true });
});

// ── STORIES ───────────────────────────────────────────────────────────────
app.get("/stories", (req, res) => res.json(db.stories));
app.post("/stories", (req, res) => {
  const story = { id: gid(), uploadTime: now(), ...req.body };
  db.stories.push(story);
  saveDb();
  broadcast("story_uploaded", { id: story.id });
  res.json({ id: story.id });
});
app.delete("/stories/:id", (req, res) => {
  db.stories = db.stories.filter((s) => s.id !== req.params.id);
  saveDb();
  broadcast("story_deleted", { id: req.params.id });
  res.json({ ok: true });
});

// ── MESSAGES ──────────────────────────────────────────────────────────────
app.get("/messages/:userId", (req, res) => {
  const me = req.params.userId;
  const other = req.query.other;
  const msgs = other
    ? db.messages.filter((m) =>
        (m.senderText === me && m.recipientText === other) ||
        (m.senderText === other && m.recipientText === me))
    : db.messages.filter((m) => m.senderText === me || m.recipientText === me);
  res.json(msgs);
});
app.post("/messages", (req, res) => {
  const msg = { id: gid(), timestamp: now(), ...req.body };
  db.messages.push(msg);
  saveDb();
  broadcast("new_message", { sender: msg.senderText, recipient: msg.recipientText });
  res.json({ ok: true });
});

// ── FRIENDS ───────────────────────────────────────────────────────────────
app.get("/friends/:userId", (req, res) => {
  const me = req.params.userId;
  const friends = db.friends
    .filter((f) => f.user1 === me || f.user2 === me)
    .map((f) => (f.user1 === me ? f.user2 : f.user1));
  res.json(friends);
});
app.post("/friend-requests", (req, res) => {
  const { senderText, recipientText } = req.body;
  const exists = db.friendRequests.find(
    (r) => r.senderText === senderText && r.recipientText === recipientText
  );
  if (!exists) {
    db.friendRequests.push({ senderText, recipientText, status: "pending", createdAt: now() });
    saveDb();
    broadcast("friend_request", { senderText, recipientText });
  }
  res.json({ ok: true });
});
app.get("/friend-requests/:userId", (req, res) => {
  const me = req.params.userId;
  res.json(db.friendRequests.filter((r) => r.senderText === me || r.recipientText === me));
});
app.post("/friend-requests/accept", (req, res) => {
  const { senderText, recipientText } = req.body;
  const req_ = db.friendRequests.find(
    (r) => r.senderText === senderText && r.recipientText === recipientText
  );
  if (req_) {
    req_.status = "accepted";
    const alreadyFriends = db.friends.some(
      (f) => (f.user1 === senderText && f.user2 === recipientText) ||
              (f.user1 === recipientText && f.user2 === senderText)
    );
    if (!alreadyFriends) db.friends.push({ user1: recipientText, user2: senderText });
    saveDb();
    broadcast("friend_accepted", { senderText, recipientText });
  }
  res.json({ ok: true });
});
app.post("/friend-requests/reject", (req, res) => {
  const { senderText, recipientText } = req.body;
  const r = db.friendRequests.find(
    (r) => r.senderText === senderText && r.recipientText === recipientText
  );
  if (r) { r.status = "rejected"; saveDb(); }
  res.json({ ok: true });
});

// ── SIGNALING (WebRTC calls) ───────────────────────────────────────────────
app.get("/signaling/:sessionId", (req, res) => {
  res.json(db.signaling[req.params.sessionId] || []);
});
app.post("/signaling/:sessionId", (req, res) => {
  if (!db.signaling[req.params.sessionId]) db.signaling[req.params.sessionId] = [];
  db.signaling[req.params.sessionId].push({ ...req.body, timestamp: now() });
  // Auto-clean old signaling data (> 2 min)
  db.signaling[req.params.sessionId] = db.signaling[req.params.sessionId].filter(
    (e) => now() - e.timestamp < 120000
  );
  broadcast("signaling", { sessionId: req.params.sessionId });
  res.json({ ok: true });
});
app.delete("/signaling/:sessionId", (req, res) => {
  delete db.signaling[req.params.sessionId];
  res.json({ ok: true });
});

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────
app.get("/notifications/:userId", (req, res) => {
  res.json(db.notifications.filter((n) => n.recipientText === req.params.userId));
});

// ── HEALTH ────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ ok: true, users: Object.keys(db.profiles).length, videos: db.videos.length }));

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`🚀 SOCIONET backend running on http://localhost:${PORT}`);
  console.log(`📦 ${Object.keys(db.profiles).length} profiles | ${db.videos.length} videos | ${db.messages.length} messages`);
});
