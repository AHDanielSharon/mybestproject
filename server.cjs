const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

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

let pgClient = null;

async function loadDb() {
  if (process.env.DATABASE_URL) {
    try {
      console.log("🐘 Connecting to Render PostgreSQL...");
      pgClient = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
      await pgClient.connect();
      await pgClient.query(`CREATE TABLE IF NOT EXISTS store (id INT PRIMARY KEY, data JSONB)`);
      const res = await pgClient.query(`SELECT data FROM store WHERE id=1`);
      if (res.rows[0] && res.rows[0].data) {
        db = { ...db, ...res.rows[0].data };
        db.notifications = db.notifications || [];
        db.videos = db.videos || [];
        db.stories = db.stories || [];
        db.messages = db.messages || [];
        db.friends = db.friends || [];
        db.friendRequests = db.friendRequests || [];
        console.log("✅ DB loaded from Postgres successfully!");
      } else {
        console.log("🐘 Postgres table empty. Starting fresh.");
      }
    } catch (e) {
      console.error("❌ Postgres Error:", e.message);
    }
  } else {
    try {
      if (fs.existsSync(DB_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
        db = { ...db, ...parsed };
        db.notifications = db.notifications || [];
        console.log("✅ DB loaded from local disk");
      }
    } catch (e) {
      console.warn("Could not load DB, starting fresh:", e.message);
    }
  }
}

function saveDb() {
  if (pgClient) {
    pgClient.query(`INSERT INTO store (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = $1`, [JSON.stringify(db)])
      .catch(e => console.error("saveDb Postgres error:", e.message));
  } else {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(db), "utf8");
    } catch (e) {
      console.error("saveDb disk error:", e.message);
    }
  }
}

async function init() {
  await loadDb();
}
init();

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
    .filter(([id, p]) => (p.name && p.name.toLowerCase().includes(term)) || id.toLowerCase() === term)
    .map(([id, p]) => ({ id, ...p }));
  res.json(result);
});

function migrateUserData(fromId, toId) {
  db.stories = db.stories.map((s) =>
    s.creatorText === fromId ? { ...s, creatorText: toId } : s
  );
  db.messages = db.messages.map((m) => ({
    ...m,
    senderText: m.senderText === fromId ? toId : m.senderText,
    recipientText: m.recipientText === fromId ? toId : m.recipientText,
  }));
  db.friends = db.friends.map((f) => ({
    user1: f.user1 === fromId ? toId : f.user1,
    user2: f.user2 === fromId ? toId : f.user2,
  }));
  db.friendRequests = db.friendRequests.map((r) => ({
    ...r,
    senderText: r.senderText === fromId ? toId : r.senderText,
    recipientText: r.recipientText === fromId ? toId : r.recipientText,
  }));
  db.notifications = db.notifications.map((n) => ({
    ...n,
    senderText: n.senderText === fromId ? toId : n.senderText,
    recipientText: n.recipientText === fromId ? toId : n.recipientText,
  }));
  Object.keys(db.signaling).forEach((key) => {
    db.signaling[key] = db.signaling[key].map((e) => ({
      ...e,
      senderText: e.senderText === fromId ? toId : e.senderText,
    }));
  });
}

// ── MEDIA CACHE & STREAMING ────────────────────────────────────────────────
const mediaCache = new Map(); // id + type -> Buffer

function streamBase64(res, cacheKey, base64Str, fallbackMime) {
  if (!base64Str) { res.status(404).send('Not found'); return; }
  // Extract MIME and raw base64
  let mime = fallbackMime || 'application/octet-stream';
  let b64 = base64Str;
  if (base64Str.startsWith('data:')) {
    const semi = base64Str.indexOf(';');
    const comma = base64Str.indexOf(',');
    if (semi > 0 && comma > semi) {
      mime = base64Str.slice(5, semi);
      b64 = base64Str.slice(comma + 1);
    } else if (comma > 0) {
      b64 = base64Str.slice(comma + 1);
    }
  }
  if (!mime || mime === 'application/octet-stream') mime = fallbackMime || 'video/mp4';

  let buf = mediaCache.get(cacheKey);
  if (!buf) {
    buf = Buffer.from(b64, 'base64');
    mediaCache.set(cacheKey, buf);
  }

  const total = buf.length;
  const rangeHeader = res.req.headers['range'];
  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
    const chunkSize = end - start + 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mime,
    });
    res.end(buf.slice(start, end + 1));
  } else {
    res.writeHead(200, { 'Content-Length': total, 'Content-Type': mime, 'Accept-Ranges': 'bytes' });
    res.end(buf);
  }
}

// Stream video file by ID
app.get("/media/video/:id", (req, res) => {
  const v = db.videos.find(v => v.id === req.params.id);
  if (!v) return res.status(404).send('Not found');
  streamBase64(res, v.id + '_video', v.fileBase64, 'video/mp4');
});
// Stream video thumbnail by ID
app.get("/media/thumb/:id", (req, res) => {
  const v = db.videos.find(v => v.id === req.params.id);
  if (!v) return res.status(404).send('Not found');
  streamBase64(res, v.id + '_thumb', v.thumbnailBase64, 'image/jpeg');
});
// Stream story file by ID
app.get("/media/story/:id", (req, res) => {
  const s = db.stories.find(s => s.id === req.params.id);
  if (!s) return res.status(404).send('Not found');
  const mime = (s.contentType || '').includes('video') ? 'video/mp4' : 'image/jpeg';
  streamBase64(res, s.id + '_story', s.fileBase64, mime);
});
// Stream avatar
app.get("/media/avatar/:userId", (req, res) => {
  const p = db.profiles[req.params.userId];
  if (!p || !p.avatarBase64) return res.status(404).send('Not found');
  streamBase64(res, req.params.userId + '_avatar', p.avatarBase64, 'image/jpeg');
});

app.get("/videos", (req, res) => {
  // Return videos WITHOUT the heavy base64 payloads
  res.json(db.videos.map(v => ({ ...v, hasThumbnail: !!v.thumbnailBase64, fileBase64: undefined, thumbnailBase64: undefined })));
});
app.post("/videos", (req, res) => {
  const video = { id: gid(), uploadTime: now(), ...req.body };
  db.videos.unshift(video);
  db.stats[video.id] = { views: 0, likes: 0, dislikes: 0, shares: 0, likedBy: [], dislikedBy: [] };
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
  res.json(db.videos.filter((v) => v.creatorText === req.params.userId)
    .map(v => ({ ...v, hasThumbnail: !!v.thumbnailBase64, fileBase64: undefined, thumbnailBase64: undefined })));
});

// ── STATS & INTERACTIONS ──────────────────────────────────────────────────
app.get("/stats/:videoId", (req, res) => {
  const s = db.stats[req.params.videoId] || { views: 0, likes: 0, dislikes: 0, shares: 0, likedBy: [], dislikedBy: [] };
  res.json({ ...s, comments: db.comments[req.params.videoId] || [] });
});
app.post("/stats/:videoId/like", (req, res) => {
  const { userId } = req.body;
  let s = db.stats[req.params.videoId];
  if (!s) s = db.stats[req.params.videoId] = { views: 0, likes: 0, dislikes: 0, shares: 0, likedBy: [], dislikedBy: [] };
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
  if (!s) s = db.stats[req.params.videoId] = { views: 0, likes: 0, dislikes: 0, shares: 0, likedBy: [], dislikedBy: [] };
  s.views = (s.views || 0) + 1;
  saveDb();
  res.json({ ok: true });
});
app.post("/stats/:videoId/dislike", (req, res) => {
  const { userId } = req.body;
  let s = db.stats[req.params.videoId];
  if (!s) s = db.stats[req.params.videoId] = { views: 0, likes: 0, dislikes: 0, shares: 0, likedBy: [], dislikedBy: [] };
  if (!s.dislikedBy) s.dislikedBy = [];
  const idx = s.dislikedBy.indexOf(userId);
  if (idx === -1) { s.dislikedBy.push(userId); s.dislikes = (s.dislikes || 0) + 1; }
  else { s.dislikedBy.splice(idx, 1); s.dislikes = Math.max(0, (s.dislikes || 1) - 1); }
  saveDb(); res.json({ ok: true });
});
app.post("/stats/:videoId/share", (req, res) => {
  let s = db.stats[req.params.videoId];
  if (!s) s = db.stats[req.params.videoId] = { views: 0, likes: 0, dislikes: 0, shares: 0, likedBy: [], dislikedBy: [] };
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
const STORY_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms
function cleanExpiredStories() {
  const cutoff = Date.now() - STORY_TTL;
  const before = db.stories.length;
  db.stories = db.stories.filter((s) => s.uploadTime > cutoff);
  if (db.stories.length !== before) {
    saveDb();
    console.log(`🧹 Cleaned ${before - db.stories.length} expired stories`);
  }
}
cleanExpiredStories(); // clean on startup
setInterval(cleanExpiredStories, 60 * 60 * 1000); // clean every hour

app.get("/stories", (req, res) => {
  const cutoff = Date.now() - STORY_TTL;
  res.json(db.stories.filter((s) => s.uploadTime > cutoff).map(s => ({
    ...s, fileBase64: undefined, thumbnailBase64: undefined
  })));
});
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
  
  const p = db.profiles[msg.senderText];
  db.notifications.push({
    id: gid(), recipientText: msg.recipientText, senderText: msg.senderText,
    senderName: p ? p.name : "Someone", content: "sent you a message",
    notificationType: "newMessage", timestamp: now(), isRead: false
  });

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
    
    const p = db.profiles[senderText];
    db.notifications.push({
      id: gid(), recipientText, senderText,
      senderName: p ? p.name : "Someone", content: "sent you a friend request",
      notificationType: "friendRequest", timestamp: now(), isRead: false
    });

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

    const p = db.profiles[recipientText];
    db.notifications.push({
      id: gid(), recipientText: senderText, senderText: recipientText,
      senderName: p ? p.name : "Someone", content: "accepted your friend request",
      notificationType: "friendRequestAccepted", timestamp: now(), isRead: false
    });

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

// ── CALL RINGING (Cross-device push) ─────────────────────────────────────
app.post("/call/ring", (req, res) => {
  broadcast("incoming_call", req.body);
  res.json({ ok: true });
});
app.post("/call/cancel", (req, res) => {
  broadcast("cancel_call", req.body);
  res.json({ ok: true });
});

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────
app.get("/notifications/:userId", (req, res) => {
  res.json(db.notifications.filter((n) => n.recipientText === req.params.userId));
});
app.post("/notifications/read/:id", (req, res) => {
  const n = db.notifications.find(n => n.id === req.params.id);
  if (n) {
    n.isRead = true;
    saveDb();
  }
  res.json({ ok: true });
});

// ── HEALTH ────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ ok: true, users: Object.keys(db.profiles).length, videos: db.videos.length }));

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`🚀 SOCIONET backend running on http://localhost:${PORT}`);
  console.log(`📦 ${Object.keys(db.profiles).length} profiles | ${db.videos.length} videos | ${db.messages.length} messages`);
});
