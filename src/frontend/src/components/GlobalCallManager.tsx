import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useClearSignalingData, useGetSignalingData } from "../hooks/useQueries";
import { useGetUserProfile } from "../hooks/useQueries";
import { SESSION_USER } from "../lib/core-infrastructure-mock";
import VideoCallDialog, { deriveSessionId } from "./VideoCallDialog";

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
  const { data: callerProfile } = useGetUserProfile({ toText: () => callerPrincipal } as any);
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
// Mount this ONCE at the app root. It polls localStorage AND backend signaling
// every 1.5s for any incoming call notification and shows the full-screen overlay.
import { onServerEvent } from "../mocks/backend";

export default function GlobalCallManager() {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal()?.toString() || SESSION_USER;

  const [incomingCall, setIncomingCall] = useState<{
    callerPrincipal: string;
    callType: "video" | "audio";
    sessionId: string;
  } | null>(null);

  const [callOpen, setCallOpen] = useState(false);
  const [callerName, setCallerName] = useState<string | undefined>(undefined);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const callerPrincipalRef = useRef<string>("");

  const [backendCallSessionId, setBackendCallSessionId] = useState<string>("");
  const { data: backendSignaling } = useGetSignalingData(backendCallSessionId, !!backendCallSessionId && !callOpen && !incomingCall);

  const { data: callerProfile } = useGetUserProfile(
    incomingCall ? ({ toText: () => incomingCall.callerPrincipal } as any) : null
  );
  const clearSignaling = useClearSignalingData();

  // Poll localStorage for local/same-browser notifications
  useEffect(() => {
    if (!myPrincipal) return;
    const poll = setInterval(() => {
      try {
        const key = `incoming_call_for_${myPrincipal}`;
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.timestamp > 60000) {
          localStorage.removeItem(key);
          return;
        }
        if (!incomingCall && !callOpen) {
          const sessionId = deriveSessionId(parsed.callerPrincipal, myPrincipal);
          setBackendCallSessionId(sessionId);
          setIncomingCall({
            callerPrincipal: parsed.callerPrincipal,
            callType: parsed.callType || "video",
            sessionId,
          });
        }
      } catch { /* ignore parse errors */ }
    }, 1500);
    return () => clearInterval(poll);
  }, [myPrincipal, incomingCall, callOpen]);

  // Listen to WebSocket events for cross-device global calls
  useEffect(() => {
    if (!myPrincipal) return;
    const unsubRing = onServerEvent("incoming_call", (data: any) => {
      if (data.recipientPrincipal === myPrincipal && !callOpen && !incomingCall) {
        setBackendCallSessionId(data.sessionId);
        setIncomingCall({
          callerPrincipal: data.callerPrincipal,
          callType: data.callType || "video",
          sessionId: data.sessionId,
        });
      }
    });

    const unsubCancel = onServerEvent("cancel_call", (data: any) => {
      if (data.recipientPrincipal === myPrincipal) {
        setIncomingCall(null);
      }
    });

    return () => {
      unsubRing();
      unsubCancel();
    };
  }, [myPrincipal, callOpen, incomingCall]);

  // Update caller name when profile loads
  useEffect(() => {
    if (callerProfile?.name) setCallerName(callerProfile.name);
  }, [callerProfile]);

  const clearNotification = () => {
    if (!myPrincipal) return;
    clearCallNotification(myPrincipal);
  };

  const handleAccept = () => {
    if (!incomingCall) return;
    clearNotification();
    callerPrincipalRef.current = incomingCall.callerPrincipal;
    setActiveSessionId(incomingCall.sessionId);
    setCallOpen(true);
    setIncomingCall(null);
  };

  const handleDecline = () => {
    if (!incomingCall) return;
    clearNotification();
    clearSignaling.mutate({ sessionId: incomingCall.sessionId });
    setIncomingCall(null);
  };

  const handleCallClose = () => {
    setCallOpen(false);
    setActiveSessionId("");
    clearNotification();
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

// ─── Call broadcaster (call this when initiating a call) ─────────────────────
export async function broadcastCallNotification(
  recipientPrincipal: string,
  callerPrincipal: string,
  callType: "video" | "audio",
) {
  const sessionId = deriveSessionId(callerPrincipal, recipientPrincipal);
  
  // 1. Local storage for same-browser fallback
  const key = `incoming_call_for_${recipientPrincipal}`;
  localStorage.setItem(
    key,
    JSON.stringify({ callerPrincipal, callType, sessionId, timestamp: Date.now() })
  );

  // 2. Global push via backend WebSockets
  try {
    await fetch("/api/call/ring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientPrincipal, callerPrincipal, callType, sessionId })
    });
  } catch (err) {
    console.error("Global call broadcast failed", err);
  }
}

export async function clearCallNotification(recipientPrincipal: string) {
  localStorage.removeItem(`incoming_call_for_${recipientPrincipal}`);
  try {
    await fetch("/api/call/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientPrincipal })
    });
  } catch (err) {}
}
