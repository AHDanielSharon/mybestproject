import type { backendInterface } from "../backend";

// ── Shared API endpoint ────────────────────────────────────────────────────
// Reads from env var injected at build time; falls back to localhost for dev.
// The Cloudflare tunnel URL is set via VITE_API_URL env var during build.
const API_BASE: string =
  (import.meta as any).env?.VITE_API_URL ||
  (typeof window !== "undefined" && (window as any).__SOCIONET_API_URL) ||
  "http://localhost:4000";

// ── Per-browser identity ───────────────────────────────────────────────────
const getMyPrincipalStr = (): string => {
  const urlParam = new URLSearchParams(window.location.search).get("mockUser");
  if (urlParam) { localStorage.setItem("socionet_session_user", urlParam); return urlParam; }
  const existing = localStorage.getItem("socionet_session_user");
  if (existing) return existing;
  // Generate a 5-digit numeric ID (10000-99999)
  const newId = String(10000 + Math.floor(Math.random() * 90000));
  localStorage.setItem("socionet_session_user", newId);
  return newId;
};

const MY_PRINCIPAL_STR = getMyPrincipalStr();
const MY_PRINCIPAL = { toText: () => MY_PRINCIPAL_STR, toString: () => MY_PRINCIPAL_STR } as any;

// ── HTTP helpers ───────────────────────────────────────────────────────────
const api = {
  get: async (path: string) => {
    const r = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Bypass-Tunnel-Reminder": "true",
        "ngrok-skip-browser-warning": "true"
      }
    });
    return r.json();
  },
  post: async (path: string, body: any) => {
    const r = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Bypass-Tunnel-Reminder": "true",
        "ngrok-skip-browser-warning": "true"
      },
      body: JSON.stringify(body),
    });
    return r.json();
  },
  del: async (path: string) => {
    const r = await fetch(`${API_BASE}${path}`, {
      method: "DELETE",
      headers: {
        "Bypass-Tunnel-Reminder": "true",
        "ngrok-skip-browser-warning": "true"
      }
    });
    return r.json();
  },
};

// ── WebSocket for real-time push ───────────────────────────────────────────
let ws: WebSocket | null = null;
const listeners: Record<string, Set<(data?: any) => void>> = {};

function getWs() {
  if (ws && ws.readyState === WebSocket.OPEN) return ws;
  // Build WebSocket URL correctly whether API_BASE is absolute (http://...) or relative (/api)
  let wsUrl: string;
  if (API_BASE.startsWith('http://') || API_BASE.startsWith('https://')) {
    wsUrl = API_BASE.replace(/^http/, 'ws');
  } else {
    // Relative path like /api — build from window.location
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    wsUrl = `${proto}://${window.location.host}${API_BASE}`;
  }
  ws = new WebSocket(wsUrl);
  ws.onmessage = (e) => {
    try {
      const parsed = JSON.parse(e.data);
      const { event, ...data } = parsed;
      listeners[event]?.forEach((fn) => fn(data));
      listeners['*']?.forEach((fn) => fn(parsed));
    } catch {}
  };
  ws.onerror = () => { ws = null; };
  ws.onclose = () => { ws = null; };
  return ws;
}

export function onServerEvent(event: string, fn: (data?: any) => void) {
  if (!listeners[event]) listeners[event] = new Set();
  listeners[event].add(fn);
  getWs(); // ensure connected
  return () => listeners[event]?.delete(fn);
}

// ── Principal helper ───────────────────────────────────────────────────────
const makePrincipal = (text: string): any => ({
  toText: () => text,
  toString: () => text,
  compareTo: (other: any) => text === other.toText() ? "eq" : text < other.toText() ? "lt" : "gt",
  _isPrincipal: true,
});

// ── BigInt helpers ─────────────────────────────────────────────────────────
const toBigInt = (v: any): bigint => {
  if (typeof v === "bigint") return v;
  if (typeof v === "number") return BigInt(Math.floor(v));
  if (typeof v === "string") return BigInt(v);
  return BigInt(0);
};
const toTimestamp = (v: any): bigint => toBigInt(v) * BigInt(1_000_000);
const nowBigInt = () => toTimestamp(Date.now());

// ── Blob helpers (images stored as base64 in API) ─────────────────────────
async function blobToBase64(blob: any): Promise<string> {
  if (!blob) return "";
  if (blob.__mockBase64) return blob.__mockBase64;
  try {
    let bytes;
    if (typeof blob.getBytes === "function") {
      bytes = await blob.getBytes();
    } else if (typeof blob.arrayBuffer === "function") {
      bytes = new Uint8Array(await blob.arrayBuffer());
    } else {
      return "";
    }
    // Prefer explicit __mimeType (set by UploadVideoDialog), then fall back to blob.type or sniff from URL
    let mime = blob.__mimeType || blob.type || '';
    if (!mime && blob.directURL) {
      // Try to sniff from blob object URL by fetching content-type
      if (blob.directURL.startsWith('blob:')) {
        try {
          const r = await fetch(blob.directURL);
          mime = r.headers.get('content-type') || '';
        } catch {}
      }
    }
    // Sniff MIME from byte signatures if we still don't have a useful type
    if (!mime || mime === 'application/octet-stream') {
      if (bytes[0] === 0xFF && bytes[1] === 0xD8) mime = 'image/jpeg';
      else if (bytes[0] === 0x89 && bytes[1] === 0x50) mime = 'image/png';
      else if (bytes[0] === 0x47 && bytes[1] === 0x49) mime = 'image/gif';
      else if (bytes[0] === 0x52 && bytes[1] === 0x49) mime = 'image/webp';
      else mime = 'image/jpeg'; // default for profile photos
    }
    const b = new Blob([bytes], { type: mime });
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = (e: ProgressEvent<FileReader>) => {
        if (e.lengthComputable && blob.onProgress) {
          const pct = 10 + Math.round((e.loaded / e.total) * 70);
          blob.onProgress(Math.min(pct, 90));
        }
      };
      reader.onload = () => {
        if (blob.onProgress) blob.onProgress(90);
        resolve(reader.result as string);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(b);
    });
  } catch { return ""; }
}

function restoreBlob(base64: string | undefined | null) {
  if (!base64) return undefined;
  let url = base64;
  // Normalize legacy corrupted data URIs
  if (base64.startsWith('data:application/octet-stream;base64,')) {
    const prefix = 'data:application/octet-stream;base64,';
    url = 'data:;base64,' + base64.slice(prefix.length);
  }
  // Sniff MIME for entries stored without a proper MIME type
  if (url.startsWith('data:;base64,')) {
    const b64 = url.slice(13);
    if (b64.startsWith('AAAA') || b64.startsWith('AAAAAA') || b64.startsWith('00000')) url = 'data:video/mp4;base64,' + b64;
    else if (b64.startsWith('/9j')) url = 'data:image/jpeg;base64,' + b64;
    else if (b64.startsWith('iVBOR')) url = 'data:image/png;base64,' + b64;
    else if (b64.startsWith('R0lG')) url = 'data:image/gif;base64,' + b64;
    else if (b64.startsWith('UklGR')) url = 'data:image/webp;base64,' + b64;
    else url = 'data:video/mp4;base64,' + b64; // default: assume video
  }
  // If it already has a proper MIME type (data:video/..., data:image/...), use as-is
  return {
    getDirectURL: () => url,
    getBytes: async () => new Uint8Array(),
    withUploadProgress: function () { return this; },
    __mockBase64: url,
  } as any;
}

function createMediaBlob(url: string) {
  return {
    getDirectURL: () => url,
    getBytes: async () => new Uint8Array(),
    withUploadProgress: function () { return this; },
    __mockBase64: "", // Don't keep heavy base64
  } as any;
}

// ── MOCK BACKEND (shared API-backed) ─────────────────────────────────────
export const mockBackend = {
  // ── Profiles ──────────────────────────────────────────────────────────
  getCallerUserProfile: async () => {
    const p = await api.get(`/profiles/${MY_PRINCIPAL_STR}`);
    if (!p) return null;
    return { ...p, avatar: restoreBlob(p.avatarBase64) };
  },
  saveCallerUserProfile: async (profile: any) => {
    const avatarBase64 = await blobToBase64(profile.avatar);
    const result = await api.post(`/profiles/${MY_PRINCIPAL_STR}`, {
      name: profile.name,
      bio: profile.bio || "",
      balance: 0,
      avatarBase64,
    });
    if (result?.merged && result?.existingUserId) {
      localStorage.setItem("socionet_session_user", result.existingUserId);
    }
  },
  getUserProfile: async (principal: any) => {
    const p = await api.get(`/profiles/${principal.toText()}`);
    if (!p) return null;
    return { ...p, avatar: restoreBlob(p.avatarBase64) };
  },
  getAllUserProfiles: async () => {
    const profiles = await api.get("/profiles");
    return profiles.map((p: any) => [makePrincipal(p.id), { ...p, avatar: restoreBlob(p.avatarBase64) }]);
  },
  updateProfileImage: async (blob: any) => {
    if (blob?.onProgress) blob.onProgress(0);
    const avatarBase64 = await blobToBase64(blob);
    if (blob?.onProgress) blob.onProgress(95);
    const cur = await api.get(`/profiles/${MY_PRINCIPAL_STR}`);
    if (cur) await api.post(`/profiles/${MY_PRINCIPAL_STR}`, { ...cur, avatarBase64 });
    if (blob?.onProgress) blob.onProgress(100);
  },
  searchUserProfiles: async (term: string) => {
    const results = await api.get(`/profiles/search/${encodeURIComponent(term)}`);
    return results.map((p: any) => [makePrincipal(p.id), { ...p, avatar: restoreBlob(p.avatarBase64) }]);
  },
  searchUsers: async (term: string) => {
    const profiles = await api.get(`/profiles/search/${encodeURIComponent(term)}`);
    const myRequests = await api.get(`/friend-requests/${MY_PRINCIPAL_STR}`);
    const myFriendIds: string[] = await api.get(`/friends/${MY_PRINCIPAL_STR}`);
    return {
      profiles: profiles.map((p: any) => [makePrincipal(p.id), { ...p, avatar: restoreBlob(p.avatarBase64) }]),
      friends: myFriendIds.map(makePrincipal),
      pendingRequests: myRequests.map((r: any) => ({
        ...r,
        sender: makePrincipal(r.senderText),
        recipient: makePrincipal(r.recipientText),
      })),
    };
  },

  // ── Videos ────────────────────────────────────────────────────────────
  uploadVideo: async (request: any) => {
    if (request.file?.onProgress) request.file.onProgress(0);
    if (request.thumbnail?.onProgress) request.thumbnail.onProgress(0);
    const fileBase64 = await blobToBase64(request.file);
    const thumbnailBase64 = request.thumbnail ? await blobToBase64(request.thumbnail) : "";
    const progressInterval = setInterval(() => {
      if (request.file?.onProgress) {
        request.file.onProgress(95 + Math.floor(Math.random() * 4));
      }
    }, 500);
    try {
      const { id } = await api.post("/videos", {
        title: request.title,
        description: request.description,
        creatorText: MY_PRINCIPAL_STR,
        fileBase64,
        thumbnailBase64,
      });
      clearInterval(progressInterval);
      if (request.file?.onProgress) request.file.onProgress(100);
      if (request.thumbnail?.onProgress) request.thumbnail.onProgress(100);
      return id;
    } catch (e) {
      clearInterval(progressInterval);
      throw e;
    }
  },
  getFeed: async () => {
    const videos = await api.get("/videos");
    return videos.map((v: any) => ({
      ...v,
      creator: makePrincipal(v.creatorText),
      file: createMediaBlob(`${API_BASE}/media/video/${v.id}`),
      thumbnail: v.hasThumbnail ? createMediaBlob(`${API_BASE}/media/thumb/${v.id}`) : null,
      uploadTime: toBigInt(v.uploadTime),
    }));
  },
  getAllVideos: async () => mockBackend.getFeed(),
  getVideo: async (id: string) => {
    const videos = await api.get("/videos");
    const v = videos.find((v: any) => v.id === id);
    if (!v) throw new Error("Video not found");
    return { ...v, creator: makePrincipal(v.creatorText), file: createMediaBlob(`${API_BASE}/media/video/${v.id}`), thumbnail: v.hasThumbnail ? createMediaBlob(`${API_BASE}/media/thumb/${v.id}`) : null };
  },
  getVideosByCreator: async (creator: any) => {
    const videos = await api.get(`/videos/creator/${creator.toText()}`);
    return videos.map((v: any) => ({
      ...v,
      creator: makePrincipal(v.creatorText),
      file: createMediaBlob(`${API_BASE}/media/video/${v.id}`),
      thumbnail: v.hasThumbnail ? createMediaBlob(`${API_BASE}/media/thumb/${v.id}`) : null,
      uploadTime: toBigInt(v.uploadTime),
    }));
  },
  getTotalVideoCount: async () => {
    const videos = await api.get("/videos");
    return BigInt(videos.length);
  },
  deleteVideo: async (id: string) => { await api.del(`/videos/${id}`); },

  // ── Stats & Interactions ──────────────────────────────────────────────
  getReelStats: async (id: string) => {
    const s = await api.get(`/stats/${id}`);
    return {
      views: toBigInt(s.views),
      likes: toBigInt(s.likes),
      dislikes: toBigInt(s.dislikes),
      shares: toBigInt(s.shares),
      comments: s.comments || [],
    };
  },
  likeReel: async (id: string) => { await api.post(`/stats/${id}/like`, { userId: MY_PRINCIPAL_STR }); },
  dislikeReel: async (id: string) => { await api.post(`/stats/${id}/dislike`, { userId: MY_PRINCIPAL_STR }); },
  incrementViews: async (id: string) => { await api.post(`/stats/${id}/view`, {}); },
  shareReel: async (id: string) => { await api.post(`/stats/${id}/share`, {}); },
  addComment: async (id: string, comment: any) => { await api.post(`/comments/${id}`, { ...comment, authorText: MY_PRINCIPAL_STR }); },
  getAllComments: async (id: string) => {
    const s = await api.get(`/stats/${id}`);
    return s.comments || [];
  },
  searchVideos: async (term: string) => {
    const videos = await api.get("/videos");
    return videos
      .filter((v: any) => v.title?.toLowerCase().includes(term.toLowerCase()))
      .map((v: any) => ({ ...v, creator: makePrincipal(v.creatorText), file: createMediaBlob(`${API_BASE}/media/video/${v.id}`), thumbnail: createMediaBlob(`${API_BASE}/media/thumb/${v.id}`) }));
  },

  // ── Stories ───────────────────────────────────────────────────────────
  uploadStory: async (request: any) => {
    if (request.file?.onProgress) request.file.onProgress(0);
    if (request.thumbnail?.onProgress) request.thumbnail.onProgress(0);
    const fileBase64 = await blobToBase64(request.file);
    const thumbnailBase64 = request.thumbnail ? await blobToBase64(request.thumbnail) : "";
    const progressInterval = setInterval(() => {
      if (request.file?.onProgress) {
        request.file.onProgress(95 + Math.floor(Math.random() * 4));
      }
    }, 500);
    try {
      const { id } = await api.post("/stories", {
        title: request.title,
        contentType: request.contentType,
        creatorText: MY_PRINCIPAL_STR,
        fileBase64,
        thumbnailBase64,
      });
      clearInterval(progressInterval);
      if (request.file?.onProgress) request.file.onProgress(100);
      if (request.thumbnail?.onProgress) request.thumbnail.onProgress(100);
      return id;
    } catch (e) {
      clearInterval(progressInterval);
      throw e;
    }
  },
  getAllActiveStories: async () => {
    const stories = await api.get("/stories");
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    return stories
      .filter((s: any) => (now - s.uploadTime) < TWENTY_FOUR_HOURS)
      .map((s: any) => ({
        ...s, creator: makePrincipal(s.creatorText),
        file: createMediaBlob(`${API_BASE}/media/story/${s.id}`), thumbnail: createMediaBlob(`${API_BASE}/media/thumb/${s.id}`),
        uploadTime: toTimestamp(s.uploadTime),
      }));
  },
  getActiveStoriesByUser: async (user: any) => {
    const stories = await api.get("/stories");
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    return stories
      .filter((s: any) => s.creatorText === user.toText() && (now - s.uploadTime) < TWENTY_FOUR_HOURS)
      .map((s: any) => ({ ...s, creator: makePrincipal(s.creatorText), file: createMediaBlob(`${API_BASE}/media/story/${s.id}`), thumbnail: createMediaBlob(`${API_BASE}/media/thumb/${s.id}`), uploadTime: toTimestamp(s.uploadTime) }));
  },
  getOtherUsersActiveStories: async (user: any) => {
    const stories = await api.get("/stories");
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    return stories
      .filter((s: any) => s.creatorText !== user.toText() && (now - s.uploadTime) < TWENTY_FOUR_HOURS)
      .map((s: any) => ({ ...s, creator: makePrincipal(s.creatorText), file: createMediaBlob(`${API_BASE}/media/story/${s.id}`), thumbnail: createMediaBlob(`${API_BASE}/media/thumb/${s.id}`), uploadTime: toTimestamp(s.uploadTime) }));
  },
  deleteOwnStory: async (id: string) => { await api.del(`/stories/${id}`); },

  // ── Messages ──────────────────────────────────────────────────────────
  sendMessage: async (recipient: any, content: string, attachments: any) => {
    let attBase64: string[] = [];
    if (attachments?.length) {
      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];
        att?.onProgress?.(0);
        const base64 = await blobToBase64(att);
        att?.onProgress?.(80);
        attBase64.push(base64);
      }
    }
    let progressInterval: ReturnType<typeof setInterval> | undefined;
    const firstAtt = attachments?.[0];
    if (firstAtt?.onProgress) {
      progressInterval = setInterval(() => {
        firstAtt.onProgress(80 + Math.floor(Math.random() * 15));
      }, 400);
    }
    try {
      await api.post("/messages", {
        content,
        senderText: MY_PRINCIPAL_STR,
        recipientText: recipient.toText(),
        attachmentsBase64: attBase64.length ? attBase64 : undefined,
      });
      if (progressInterval) clearInterval(progressInterval);
      attachments?.forEach((att: any) => att?.onProgress?.(100));
    } catch (e) {
      if (progressInterval) clearInterval(progressInterval);
      throw e;
    }
  },
  getMessagesWithUser: async (otherUser: any) => {
    const msgs = await api.get(`/messages/${MY_PRINCIPAL_STR}?other=${otherUser.toText()}`);
    return msgs.map((m: any) => ({
      ...m,
      sender: makePrincipal(m.senderText),
      recipient: makePrincipal(m.recipientText),
      timestamp: toTimestamp(m.timestamp),
    }));
  },
  getAllMessages: async () => {
    const msgs = await api.get(`/messages/${MY_PRINCIPAL_STR}`);
    return msgs.map((m: any) => ({
      ...m,
      sender: makePrincipal(m.senderText),
      recipient: makePrincipal(m.recipientText),
      timestamp: toTimestamp(m.timestamp),
    }));
  },
  startChatWithUser: async (targetUser: any) => targetUser.toText(),

  // ── Friends & Follow ──────────────────────────────────────────────────
  sendFriendRequest: async (recipient: any) => {
    await api.post("/friend-requests", {
      senderText: MY_PRINCIPAL_STR,
      recipientText: recipient.toText(),
    });
  },
  acceptFriendRequest: async (sender: any) => {
    await api.post("/friend-requests/accept", {
      senderText: sender.toText(),
      recipientText: MY_PRINCIPAL_STR,
    });
  },
  rejectFriendRequest: async (sender: any) => {
    await api.post("/friend-requests/reject", {
      senderText: sender.toText(),
      recipientText: MY_PRINCIPAL_STR,
    });
  },
  getFriendRequestStatus: async (otherUser: any) => {
    const otherText = otherUser.toText();
    const reqs = await api.get(`/friend-requests/${MY_PRINCIPAL_STR}`);
    const req = reqs.find((r: any) =>
      (r.senderText === MY_PRINCIPAL_STR && r.recipientText === otherText) ||
      (r.senderText === otherText && r.recipientText === MY_PRINCIPAL_STR)
    );
    return req ? req.status : "none";
  },
  getFriends: async () => {
    const ids: string[] = await api.get(`/friends/${MY_PRINCIPAL_STR}`);
    return ids.map(makePrincipal);
  },
  getFriendsWithProfiles: async () => {
    const ids: string[] = await api.get(`/friends/${MY_PRINCIPAL_STR}`);
    const profiles: any[] = [];
    for (const id of ids) {
      const p = await api.get(`/profiles/${id}`);
      if (p) profiles.push({ ...p, avatar: restoreBlob(p.avatarBase64) });
    }
    return profiles;
  },

  // ── Notifications ─────────────────────────────────────────────────────
  getUserNotifications: async () => {
    const notifs = await api.get(`/notifications/${MY_PRINCIPAL_STR}`);
    return notifs.map((n: any) => ({
      ...n,
      recipient: makePrincipal(n.recipientText),
      sender: makePrincipal(n.senderText),
      timestamp: toTimestamp(n.timestamp),
    }));
  },
  getUnreadNotificationCount: async () => {
    const notifs = await api.get(`/notifications/${MY_PRINCIPAL_STR}`);
    return BigInt(notifs.filter((n: any) => !n.isRead).length);
  },
  markNotificationAsRead: async (id: string) => {
    await api.post(`/notifications/read/${id}`, {});
  },

  // ── WebRTC Signaling (calls) ───────────────────────────────────────────
  storeSignalingData: async (sessionId: string, dataType: string, data: string) => {
    await api.post(`/signaling/${sessionId}`, { senderText: MY_PRINCIPAL_STR, dataType, data });
  },
  getSignalingData: async (sessionId: string) => {
    const entries = await api.get(`/signaling/${sessionId}`);
    return entries.map((e: any) => ({
      sender: makePrincipal(e.senderText),
      dataType: e.dataType,
      data: e.data,
      timestamp: BigInt(e.timestamp) * BigInt(1_000_000),
    }));
  },
  clearSignalingData: async (sessionId: string) => { await api.del(`/signaling/${sessionId}`); },

  // ── Misc stubs ────────────────────────────────────────────────────────
  getCallerUserRole: async () => "user" as any,
  isCallerAdmin: async () => false,
  uploadAvatar: async (file: any) => blobToBase64(file),
  getOwnVideosAndStories: async () => {
    const videos = await mockBackend.getVideosByCreator(MY_PRINCIPAL);
    const stories = await mockBackend.getActiveStoriesByUser(MY_PRINCIPAL);
    return { videos, stories };
  },
  adminCancelPayment: async () => undefined,
  adminDeleteStory: async () => undefined,
  adminDeleteVideo: async () => undefined,
  adminDownload: async () => undefined,
  adminGetAllPayments: async () => [],
  adminGetAllVideoCalls: async () => [],
  assignCallerUserRole: async () => undefined,
  canMessageUser: async () => true,
  cleanupExpiredStories: async () => BigInt(0),
  completePayment: async () => undefined,
  createCheckoutSession: async () => "session-123",
  download: async () => undefined,
  failPayment: async () => undefined,
  getImageStoriesByUser: async () => [],
  getLogo: async () => null,
  getPaymentTransaction: async () => ({
    status: "completed" as any,
    paymentMethod: { __kind__: "upi", upi: { provider: "gpay" } } as any,
    recipient: MY_PRINCIPAL, sender: MY_PRINCIPAL,
    timestamp: BigInt(Date.now()), amount: BigInt(0), transactionId: "tx-001",
  }),
  getStripeSessionStatus: async () => ({ __kind__: "failed", failed: { error: "not configured" } } as any),
  getUserPaymentHistory: async () => [],
  getVideoCallHistory: async () => [],
  getVideoStoriesByUser: async () => [],
  initializeAccessControl: async () => undefined,
  initiatePayment: async () => "tx-001",
  initiateVideoCall: async () => undefined,
  isStripeConfigured: async () => false,
  processPayment: async () => undefined,
  recordVideoCall: async () => undefined,
  setStripeConfiguration: async () => undefined,
  transferBetweenUsers: async () => undefined,
  transform: async (input: any) => ({ status: BigInt(200), body: new Uint8Array(), headers: [] }),
  uploadLogo: async () => undefined,
};
