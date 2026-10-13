import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Principal } from "@icp-sdk/core/principal";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NotificationType } from "../backend";
import { useClearSignalingData, useGetUserNotifications, useGetUserProfile } from "../hooks/useQueries";
import VideoCallDialog, { deriveSessionId } from "./VideoCallDialog";

// `vibrate` and `actions` are real Notification options on Chromium/Android but are missing from TypeScript's lib.dom.
declare global {
  interface NotificationOptions {
    vibrate?: number[];
    actions?: { action: string; title: string; icon?: string }[];
  }
}

/** A ring is only shown for calls placed within this window (ms). */
const RING_WINDOW_MS = 45_000;

// ─── Ringtone ─────────────────────────────────────────────────────────────────
function useRingtone() {
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (ctxRef.current) { ctxRef.current.close().catch(() => {}); ctxRef.current = null; }
  }, []);

  const start = useCallback(() => {
    stop();
    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const end = ctx.currentTime + 60;
      const pattern = [
        { freq: 880, dur: 0.2 }, { freq: 0, dur: 0.1 },
        { freq: 660, dur: 0.2 }, { freq: 0, dur: 0.1 },
        { freq: 880, dur: 0.4 }, { freq: 0, dur: 0.6 },
      ];
      let t = ctx.currentTime + 0.05;
      while (t < end) {
        for (const s of pattern) {
          if (s.freq > 0) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = s.freq; osc.type = "sine";
            gain.gain.setValueAtTime(0.35, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + s.dur);
            osc.start(t); osc.stop(t + s.dur);
          }
          t += s.dur;
          if (t >= end) break;
        }
      }
      timerRef.current = setTimeout(stop, 61000);
    } catch { /* AudioContext unavailable */ }
  }, [stop]);

  useEffect(() => () => stop(), [stop]);
  return { start, stop };
}

// ─── IncomingCallScreen ───────────────────────────────────────────────────────
// Full-screen overlay shown on ANY page when someone is calling you.
function IncomingCallScreen({
  callerPrincipal,
  callType,
  onAccept,
  onDecline,
}: {
  callerPrincipal: string;
  callType: "video" | "audio";
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { data: callerProfile } = useGetUserProfile(Principal.fromText(callerPrincipal));
  const ringtone = useRingtone();
  const callerName = callerProfile?.name || "Unknown";
  const initials = callerName.slice(0, 2).toUpperCase();

  useEffect(() => {
    ringtone.start();
    return () => ringtone.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAccept = () => { ringtone.stop(); onAccept(); };
  const handleDecline = () => { ringtone.stop(); onDecline(); };

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-between py-20 px-6"
      style={{
        background: "linear-gradient(180deg, #0d0d1a 0%, #060610 100%)",
      }}
    >
      {/* Top label */}
      <div className="flex flex-col items-center gap-2 mt-4">
        <p className="text-white/60 text-sm font-medium tracking-widest uppercase">
          Incoming {callType === "video" ? "Video" : "Voice"} Call
        </p>
      </div>

      {/* Caller avatar with pulse rings */}
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex items-center justify-center">
          {/* Pulse rings */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 120 + i * 50,
                height: 120 + i * 50,
                background: "rgba(99,102,241,0.08)",
                animation: `ping 1.8s cubic-bezier(0,0,0.2,1) ${i * 0.6}s infinite`,
              }}
            />
          ))}
          {/* Avatar */}
          <div
            className="relative w-32 h-32 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              boxShadow: "0 0 60px rgba(99,102,241,0.4)",
              zIndex: 10,
            }}
          >
            {callerProfile?.avatar ? (
              <img
                src={callerProfile.avatar.getDirectURL()}
                alt={callerName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-white font-bold text-4xl">{initials}</span>
            )}
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-white text-3xl font-bold">{callerName}</h1>
          <p className="text-white/50 text-sm mt-1">
            {callType === "video" ? "📹 Video calling you…" : "📞 Calling you…"}
          </p>
        </div>
      </div>

      {/* Accept / Decline */}
      <div className="flex items-center gap-16">
        {/* Decline */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleDecline}
            data-ocid="incoming_call.decline"
            className="w-20 h-20 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{
              background: "#e53e3e",
              boxShadow: "0 6px 30px rgba(229,62,62,0.5)",
            }}
            aria-label="Decline call"
          >
            <PhoneOff className="h-8 w-8 text-white" />
          </button>
          <span className="text-white/50 text-xs font-medium">Decline</span>
        </div>

        {/* Accept */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleAccept}
            data-ocid="incoming_call.accept"
            className="w-20 h-20 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{
              background: "#22c55e",
              boxShadow: "0 6px 30px rgba(34,197,94,0.5)",
            }}
            aria-label="Accept call"
          >
            {callType === "video"
              ? <Video className="h-8 w-8 text-white" />
              : <Phone className="h-8 w-8 text-white" />
            }
          </button>
          <span className="text-white/50 text-xs font-medium">Accept</span>
        </div>
      </div>
    </div>
  );
}

// ─── GlobalCallManager ────────────────────────────────────────────────────────
type IncomingCall = {
  callerPrincipal: string;
  callType: "video" | "audio";
  sessionId: string;
};

/**
 * Mounted once at the app root. Incoming calls are read from the canister's own
 * notifications (a `videoCall` notification is written by `initiateVideoCall`),
 * so they work across devices and browsers, not just in the same browser.
 */
export default function GlobalCallManager() {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal()?.toString() ?? "";

  const { data: notifications } = useGetUserNotifications(); // polls every 5s
  const clearSignaling = useClearSignalingData();

  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callOpen, setCallOpen] = useState(false);
  const [callerName, setCallerName] = useState<string | undefined>(undefined);
  const callerPrincipalRef = useRef<string>("");
  // Notifications already shown or dismissed in this tab (key = sender + timestamp).
  const handledRef = useRef<Set<string>>(new Set());

  const { data: callerProfile } = useGetUserProfile(
    incomingCall ? Principal.fromText(incomingCall.callerPrincipal) : null,
  );

  // Detect a fresh incoming video call in the canister's notifications.
  useEffect(() => {
    if (!myPrincipal || !notifications || incomingCall || callOpen) return;
    const now = Date.now();
    const fresh = notifications
      .filter((n) => n.notificationType === NotificationType.videoCall)
      .filter((n) => now - Number(n.timestamp / 1_000_000n) < RING_WINDOW_MS)
      .sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));
    for (const n of fresh) {
      const key = `${n.sender.toText()}_${n.timestamp.toString()}`;
      if (handledRef.current.has(key)) continue;
      handledRef.current.add(key);
      const caller = n.sender.toText();
      setIncomingCall({
        callerPrincipal: caller,
        callType: "video",
        sessionId: deriveSessionId(caller, myPrincipal),
      });
      // Show a system notification when the app is in the background.
      if ("serviceWorker" in navigator && "Notification" in window && Notification.permission === "granted" && document.hidden) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification("Incoming Video Call", {
            body: "Someone is calling you... Tap to answer.",
            icon: "/assets/generated/socionet-pwa-icon-192.dim_192x192.png",
            tag: `incoming-call-${key}`,
            requireInteraction: true,
            vibrate: [500, 200, 500, 200, 500],
            data: { type: "incoming-call", callerPrincipal: caller, callSessionId: deriveSessionId(caller, myPrincipal), url: "/" },
          });
        });
      }
      break;
    }
  }, [notifications, myPrincipal, incomingCall, callOpen]);

  // Update caller name when profile loads
  useEffect(() => {
    if (callerProfile?.name) setCallerName(callerProfile.name);
  }, [callerProfile]);

  const handleAccept = () => {
    if (!incomingCall) return;
    callerPrincipalRef.current = incomingCall.callerPrincipal;
    setCallOpen(true);
    setIncomingCall(null);
  };

  const handleDecline = () => {
    if (!incomingCall) return;
    clearSignaling.mutate({ sessionId: incomingCall.sessionId });
    setIncomingCall(null);
  };

  const handleCallClose = () => {
    setCallOpen(false);
  };

  return (
    <>
      {/* Incoming call full-screen overlay */}
      {incomingCall && !callOpen && (
        <IncomingCallScreen
          callerPrincipal={incomingCall.callerPrincipal}
          callType={incomingCall.callType}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      )}

      {/* Active call screen (answerer side) */}
      {callOpen && incomingCall === null && (
        <VideoCallDialog
          isOpen={callOpen}
          onClose={handleCallClose}
          recipientPrincipal={callerPrincipalRef.current}
          callerPrincipal={myPrincipal}
          isInitiator={false}
          recipientName={callerName}
        />
      )}
    </>
  );
}
