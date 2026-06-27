const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const cors = require("cors");
const { Firestore } = require("@google-cloud/firestore");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "200mb" }));

const db = new Firestore();

function doc(collection, id) {
  return db.collection(collection).doc(id);
}
function col(collection) {
  return db.collection(collection);
}

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

app.get("/profiles/:userId", async (req, res) => {
  const snap = await doc("profiles", req.params.userId).get();
  res.json(snap.exists ? snap.data() : null);
});
app.post("/profiles/:userId", async (req, res) => {
  await doc("profiles", req.params.userId).set({ ...req.body, updatedAt: now() });
  broadcast("profile_updated", { userId: req.params.userId });
  res.json({ ok: true });
});
app.get("/profiles", async (req, res) => {
  const snap = await col("profiles").get();
  const result = [];
  snap.forEach((d) => result.push({ id: d.id, ...d.data() }));
  res.json(result);
});
app.get("/profiles/search/:term", async (req, res) => {
  const term = req.params.term.toLowerCase();
  const snap = await col("profiles").get();
  const result = [];
  snap.forEach((d) => {
    const p = d.data();
    if (p.name && p.name.toLowerCase().includes(term)) result.push({ id: d.id, ...p });
  });
  res.json(result);
});

app.get("/videos", async (req, res) => {
  const snap = await col("videos").orderBy("uploadTime", "desc").get();
  const result = [];
  snap.forEach((d) => result.push(d.data()));
  res.json(result);
});
app.post("/videos", async (req, res) => {
  const id = gid();
  await doc("videos", id).set({ id, uploadTime: now(), ...req.body });
  await doc("stats", id).set({ views: 0, likes: 0, dislikes: 0, shares: 0, likedBy: [] });
  await doc("comments", id).set({ items: [] });
  broadcast("video_uploaded", { id });
  res.json({ id });
});
app.delete("/videos/:id", async (req, res) => {
  await doc("videos", req.params.id).delete();
  await doc("stats", req.params.id).delete();
  await doc("comments", req.params.id).delete();
  broadcast("video_deleted", { id: req.params.id });
  res.json({ ok: true });
});
app.get("/videos/creator/:userId", async (req, res) => {
  const snap = await col("videos").where("creatorText", "==", req.params.userId).get();
  const result = [];
  snap.forEach((d) => result.push(d.data()));
  res.json(result);
});

app.get("/stats/:videoId", async (req, res) => {
  const snap = await doc("stats", req.params.videoId).get();
  const s = snap.exists ? snap.data() : { views: 0, likes: 0, dislikes: 0, shares: 0, likedBy: [] };
  const cSnap = await doc("comments", req.params.videoId).get();
  res.json({ ...s, comments: cSnap.exists ? cSnap.data().items || [] : [] });
});
app.post("/stats/:videoId/like", async (req, res) => {
  const { userId } = req.body;
  const ref = doc("stats", req.params.videoId);
  const snap = await ref.get();
  let s = snap.exists ? snap.data() : { views: 0, likes: 0, dislikes: 0, shares: 0, likedBy: [] };
  if (!s.likedBy) s.likedBy = [];
  const idx = s.likedBy.indexOf(userId);
  if (idx === -1) { s.likedBy.push(userId); s.likes = (s.likes || 0) + 1; }
  else { s.likedBy.splice(idx, 1); s.likes = Math.max(0, (s.likes || 1) - 1); }
  await ref.set(s);
  broadcast("stats_updated", { videoId: req.params.videoId });
  res.json({ ok: true });
});
app.post("/stats/:videoId/view", async (req, res) => {
  const ref = doc("stats", req.params.videoId);
  const snap = await ref.get();
  let s = snap.exists ? snap.data() : { views: 0, likes: 0, dislikes: 0, shares: 0, likedBy: [] };
  s.views = (s.views || 0) + 1;
  await ref.set(s);
  res.json({ ok: true });
});
app.post("/stats/:videoId/dislike", async (req, res) => {
  const ref = doc("stats", req.params.videoId);
  const snap = await ref.get();
  let s = snap.exists ? snap.data() : { views: 0, likes: 0, dislikes: 0, shares: 0, likedBy: [] };
  s.dislikes = (s.dislikes || 0) + 1;
  await ref.set(s);
  res.json({ ok: true });
});
app.post("/stats/:videoId/share", async (req, res) => {
  const ref = doc("stats", req.params.videoId);
  const snap = await ref.get();
  let s = snap.exists ? snap.data() : { views: 0, likes: 0, dislikes: 0, shares: 0, likedBy: [] };
  s.shares = (s.shares || 0) + 1;
  await ref.set(s);
  res.json({ ok: true });
});
app.post("/comments/:videoId", async (req, res) => {
  const ref = doc("comments", req.params.videoId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : { items: [] };
  if (!data.items) data.items = [];
  data.items.push(req.body);
  await ref.set(data);
  broadcast("comment_added", { videoId: req.params.videoId });
  res.json({ ok: true });
});

app.get("/stories", async (req, res) => {
  const snap = await col("stories").get();
  const result = [];
  snap.forEach((d) => result.push(d.data()));
  res.json(result);
});
app.post("/stories", async (req, res) => {
  const id = gid();
  await doc("stories", id).set({ id, uploadTime: now(), ...req.body });
  broadcast("story_uploaded", { id });
  res.json({ id });
});
app.delete("/stories/:id", async (req, res) => {
  await doc("stories", req.params.id).delete();
  broadcast("story_deleted", { id: req.params.id });
  res.json({ ok: true });
});

app.get("/messages/:userId", async (req, res) => {
  const me = req.params.userId;
  const other = req.query.other;
  const snap = await col("messages").get();
  let msgs = [];
  snap.forEach((d) => msgs.push(d.data()));
  if (other) {
    msgs = msgs.filter((m) =>
      (m.senderText === me && m.recipientText === other) ||
      (m.senderText === other && m.recipientText === me));
  } else {
    msgs = msgs.filter((m) => m.senderText === me || m.recipientText === me);
  }
  res.json(msgs);
});
app.post("/messages", async (req, res) => {
  const id = gid();
  const msg = { id, timestamp: now(), ...req.body };
  await doc("messages", id).set(msg);
  broadcast("new_message", { sender: msg.senderText, recipient: msg.recipientText });
  res.json({ ok: true });
});

app.get("/friends/:userId", async (req, res) => {
  const me = req.params.userId;
  const snap = await col("friends").get();
  const friends = [];
  snap.forEach((d) => {
    const f = d.data();
    if (f.user1 === me) friends.push(f.user2);
    else if (f.user2 === me) friends.push(f.user1);
  });
  res.json(friends);
});
app.post("/friend-requests", async (req, res) => {
  const { senderText, recipientText } = req.body;
  const snap = await col("friendRequests").get();
  let exists = false;
  snap.forEach((d) => {
    if (d.data().senderText === senderText && d.data().recipientText === recipientText) exists = true;
  });
  if (!exists) {
    await doc("friendRequests", gid()).set({ senderText, recipientText, status: "pending", createdAt: now() });
    broadcast("friend_request", { senderText, recipientText });
  }
  res.json({ ok: true });
});
app.get("/friend-requests/:userId", async (req, res) => {
  const me = req.params.userId;
  const snap = await col("friendRequests").get();
  const result = [];
  snap.forEach((d) => {
    const r = d.data();
    if (r.senderText === me || r.recipientText === me) result.push(r);
  });
  res.json(result);
});
app.post("/friend-requests/accept", async (req, res) => {
  const { senderText, recipientText } = req.body;
  const snap = await col("friendRequests").get();
  snap.forEach(async (d) => {
    const r = d.data();
    if (r.senderText === senderText && r.recipientText === recipientText) {
      await d.ref.update({ status: "accepted" });
    }
  });
  const fSnap = await col("friends").get();
  let alreadyFriends = false;
  fSnap.forEach((d) => {
    const f = d.data();
    if ((f.user1 === senderText && f.user2 === recipientText) ||
        (f.user1 === recipientText && f.user2 === senderText)) alreadyFriends = true;
  });
  if (!alreadyFriends) {
    await doc("friends", gid()).set({ user1: recipientText, user2: senderText });
  }
  broadcast("friend_accepted", { senderText, recipientText });
  res.json({ ok: true });
});
app.post("/friend-requests/reject", async (req, res) => {
  const { senderText, recipientText } = req.body;
  const snap = await col("friendRequests").get();
  snap.forEach(async (d) => {
    if (d.data().senderText === senderText && d.data().recipientText === recipientText) {
      await d.ref.update({ status: "rejected" });
    }
  });
  res.json({ ok: true });
});

app.get("/signaling/:sessionId", async (req, res) => {
  const snap = await doc("signaling", req.params.sessionId).get();
  res.json(snap.exists ? snap.data().entries || [] : []);
});
app.post("/signaling/:sessionId", async (req, res) => {
  const ref = doc("signaling", req.params.sessionId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : { entries: [] };
  if (!data.entries) data.entries = [];
  data.entries.push({ ...req.body, timestamp: now() });
  data.entries = data.entries.filter((e) => now() - e.timestamp < 120000);
  await ref.set(data);
  broadcast("signaling", { sessionId: req.params.sessionId });
  res.json({ ok: true });
});
app.delete("/signaling/:sessionId", async (req, res) => {
  await doc("signaling", req.params.sessionId).delete();
  res.json({ ok: true });
});

app.get("/notifications/:userId", async (req, res) => {
  const snap = await col("notifications").get();
  const result = [];
  snap.forEach((d) => {
    if (d.data().recipientText === req.params.userId) result.push(d.data());
  });
  res.json(result);
});

app.get("/health", async (req, res) => {
  const pSnap = await col("profiles").get();
  const vSnap = await col("videos").get();
  res.json({ ok: true, users: pSnap.size, videos: vSnap.size });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`SOCIONET backend running on port ${PORT}`);
});
