import {
  FlipHorizontal2,
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Speaker,
  Video,
  VideoOff,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useClearSignalingData,
  useGetSignalingData,
  useStoreSignalingData,
} from "../hooks/useQueries";

const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

export function deriveSessionId(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

export interface VideoCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipientPrincipal: string;
  callerPrincipal: string;
  isInitiator: boolean;
  recipientName?: string;
}

type CallStatus =
  | "idle"
  | "calling"
  | "ringing"
  | "connected"
  | "ended"
  | "failed";

export default function VideoCallDialog({
  isOpen,
  onClose,
  recipientPrincipal,
  callerPrincipal,
  isInitiator,
  recipientName,
}: VideoCallDialogProps) {
  const sessionId = deriveSessionId(callerPrincipal, recipientPrincipal);

  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteStreamReady, setRemoteStreamReady] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const callStartRef = useRef<number | null>(null);
  const appliedIceRef = useRef<Set<string>>(new Set());
  const setupDoneRef = useRef(false);

  const storeSignaling = useStoreSignalingData();
  const clearSignaling = useClearSignalingData();
  const { refetch: fetchSignaling } = useGetSignalingData(sessionId, false);

  // Fade in on open
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setFadeIn(true));
    } else {
      setFadeIn(false);
    }
  }, [isOpen]);

  const startTimer = useCallback(() => {
    callStartRef.current = Date.now();
    durationIntervalRef.current = setInterval(() => {
      if (callStartRef.current)
        setCallDuration(Math.floor((Date.now() - callStartRef.current) / 1000));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    callStartRef.current = null;
    setCallDuration(0);
  }, []);

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (
      onData: (
        entries: Array<{
          dataType: string;
          data: string;
          sender: { toString(): string };
        }>,
      ) => void,
    ) => {
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const result = await fetchSignaling();
          if (result.data) onData(result.data);
        } catch {
          // silently ignore
        }
      }, 2000);
    },
    [fetchSignaling],
  );

  const getMedia = useCallback(async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch {
      toast.error("Camera/microphone permission denied");
      setCallStatus("failed");
      throw new Error("media-denied");
    }
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: storeSignaling.mutate is stable
  const createPC = useCallback(
    (stream: MediaStream): RTCPeerConnection => {
      const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
      for (const track of stream.getTracks()) pc.addTrack(track, stream);
      pc.onicecandidate = ({ candidate }) => {
        if (candidate)
          storeSignaling.mutate({
            sessionId,
            dataType: "ice",
            data: JSON.stringify(candidate),
          });
      };
      pc.ontrack = ({ streams }) => {
        if (remoteVideoRef.current && streams[0]) {
          remoteVideoRef.current.srcObject = streams[0];
          setRemoteStreamReady(true);
        }
      };
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "connected") {
          setCallStatus("connected");
          startTimer();
          stopPolling();
        } else if (
          state === "failed" ||
          state === "disconnected" ||
          state === "closed"
        ) {
          setCallStatus("failed");
          stopPolling();
        }
      };
      pcRef.current = pc;
      return pc;
    },
    [sessionId, startTimer, stopPolling],
  );

  const startCallAsInitiator = useCallback(async () => {
    if (setupDoneRef.current) return;
    setupDoneRef.current = true;
    setCallStatus("calling");
    try {
      const stream = await getMedia();
      const pc = createPC(stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await storeSignaling.mutateAsync({
        sessionId,
        dataType: "offer",
        data: JSON.stringify(offer),
      });
      startPolling(async (entries) => {
        const activePc = pcRef.current;
        if (!activePc) return;
        if (activePc.remoteDescription === null) {
          const answerEntry = entries.find((e) => e.dataType === "answer");
          if (answerEntry) {
            try {
              await activePc.setRemoteDescription(JSON.parse(answerEntry.data));
              setCallStatus("ringing");
            } catch (err) {
              console.error("setRemoteDescription (answer) failed", err);
            }
          }
        }
        for (const entry of entries) {
          if (entry.dataType === "ice") {
            const key = entry.data;
            if (appliedIceRef.current.has(key)) continue;
            appliedIceRef.current.add(key);
            try {
              await activePc.addIceCandidate(JSON.parse(entry.data));
            } catch {
              /* stale */
            }
          }
        }
      });
    } catch {
      /* errors shown via toast */
    }
  }, [getMedia, createPC, sessionId, storeSignaling, startPolling]);

  const answerCall = useCallback(
    async (offerData: string) => {
      if (setupDoneRef.current) return;
      setupDoneRef.current = true;
      setCallStatus("ringing");
      try {
        const stream = await getMedia();
        const pc = createPC(stream);
        await pc.setRemoteDescription(JSON.parse(offerData));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await storeSignaling.mutateAsync({
          sessionId,
          dataType: "answer",
          data: JSON.stringify(answer),
        });
        startPolling(async (entries) => {
          const activePc = pcRef.current;
          if (!activePc) return;
          for (const entry of entries) {
            if (entry.dataType === "ice") {
              const key = entry.data;
              if (appliedIceRef.current.has(key)) continue;
              appliedIceRef.current.add(key);
              try {
                await activePc.addIceCandidate(JSON.parse(entry.data));
              } catch {
                /* ignore */
              }
            }
          }
        });
      } catch {
        /* errors shown via toast */
      }
    },
    [getMedia, createPC, sessionId, storeSignaling, startPolling],
  );

  const endCall = useCallback(() => {
    stopPolling();
    stopTimer();
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getTracks()) t.stop();
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    clearSignaling.mutate({ sessionId });
    setCallStatus("ended");
    setRemoteStreamReady(false);
    setTimeout(() => onClose(), 1200);
  }, [stopPolling, stopTimer, clearSignaling, sessionId, onClose]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (!isOpen) return;
    if (!isInitiator) {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "CANCEL_CALL_NOTIFICATION",
          callSessionId: sessionId,
        });
      }
    }
    if (isInitiator) startCallAsInitiator();
    return () => stopPolling();
  }, [isOpen, isInitiator]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: answerCall/fetchSignaling are stable refs
  useEffect(() => {
    if (!isOpen || isInitiator || setupDoneRef.current) return;
    const offerPoll = setInterval(async () => {
      const result = await fetchSignaling();
      const offerEntry = result.data?.find((e) => e.dataType === "offer");
      if (offerEntry) {
        clearInterval(offerPoll);
        answerCall(offerEntry.data);
      }
    }, 1000);
    return () => clearInterval(offerPoll);
  }, [isOpen, isInitiator]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: cleanup on unmount only
  useEffect(() => {
    return () => {
      stopPolling();
      stopTimer();
      if (pcRef.current) pcRef.current.close();
      if (localStreamRef.current) {
        for (const t of localStreamRef.current.getTracks()) t.stop();
      }
      setupDoneRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setupDoneRef.current = false;
      appliedIceRef.current = new Set();
    }
  }, [isOpen]);

  const toggleCamera = () => {
    const vt = localStreamRef.current?.getVideoTracks()[0];
    if (vt) {
      vt.enabled = !vt.enabled;
      setIsCameraOn(vt.enabled);
    }
  };
  const toggleMic = () => {
    const at = localStreamRef.current?.getAudioTracks()[0];
    if (at) {
      at.enabled = !at.enabled;
      setIsMicOn(at.enabled);
    }
  };
  const toggleSpeaker = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
      setIsSpeakerOn((prev) => !prev);
    }
  };
  const flipCamera = useCallback(async () => {
    if (!localStreamRef.current || !pcRef.current) return;
    const vt = localStreamRef.current.getVideoTracks()[0];
    const settings = vt?.getSettings();
    const newFacing = settings?.facingMode === "user" ? "environment" : "user";
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const sender = pcRef.current
        .getSenders()
        .find((s) => s.track?.kind === "video");
      if (sender && newVideoTrack) await sender.replaceTrack(newVideoTrack);
      if (localVideoRef.current) {
        const updatedStream = new MediaStream([
          newVideoTrack,
          ...localStreamRef.current.getAudioTracks(),
        ]);
        localVideoRef.current.srcObject = updatedStream;
        localStreamRef.current = updatedStream;
      }
    } catch {
      /* flip not supported */
    }
  }, []);

  const isConnecting =
    callStatus === "idle" ||
    callStatus === "calling" ||
    callStatus === "ringing";

  const statusLabel = {
    idle: "Starting…",
    calling: "Calling…",
    ringing: "Connecting…",
    connected: formatDuration(callDuration),
    ended: "Call ended",
    failed: "Connection failed",
  }[callStatus];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: "#000",
        opacity: fadeIn ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}
      data-ocid="videocall.dialog"
    >
      {/* Remote video — fills entire screen */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
          remoteStreamReady ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Dark scrim when no remote stream */}
      {!remoteStreamReady && (
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, #0a0a14 0%, #050510 100%)",
          }}
        />
      )}

      {/* TOP OVERLAY — name + connection status */}
      <div
        className="absolute top-0 left-0 right-0 z-20 flex flex-col items-center gap-1.5 px-5"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 16px)",
          paddingBottom: 32,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, transparent 100%)",
        }}
      >
        <p className="text-white font-bold text-xl tracking-tight drop-shadow-lg">
          {recipientName || "Video Call"}
        </p>
        <div className="flex items-center gap-2">
          {callStatus === "connected" ? (
            <>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-300 text-sm font-medium">
                {statusLabel}
              </span>
            </>
          ) : callStatus === "failed" ? (
            <span className="text-red-400 text-sm font-medium">
              Connection failed
            </span>
          ) : callStatus === "ended" ? (
            <span className="text-white/50 text-sm font-medium">
              Call ended
            </span>
          ) : (
            <>
              <Loader2 className="h-3.5 w-3.5 text-white/60 animate-spin" />
              <span className="text-white/70 text-sm font-medium">
                {statusLabel}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Connecting visual */}
      {isConnecting && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-8">
          <div className="relative flex items-center justify-center">
            <div
              className="absolute w-40 h-40 rounded-full animate-ping"
              style={{ background: "rgba(103,232,249,0.08)" }}
            />
            <div
              className="absolute w-32 h-32 rounded-full animate-ping"
              style={{
                background: "rgba(103,232,249,0.13)",
                animationDelay: "0.4s",
              }}
            />
            <div
              className="relative w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(103,232,249,0.15)",
                border: "1.5px solid rgba(103,232,249,0.5)",
                boxShadow:
                  "0 0 40px rgba(103,232,249,0.25), 0 0 80px rgba(103,232,249,0.1)",
              }}
            >
              <Video
                className="h-10 w-10"
                style={{ color: "rgb(103,232,249)" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Failed / Ended states */}
      {(callStatus === "failed" || callStatus === "ended") && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 px-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background:
                callStatus === "failed"
                  ? "rgba(239,68,68,0.18)"
                  : "rgba(255,255,255,0.08)",
              border: `1.5px solid ${
                callStatus === "failed"
                  ? "rgba(239,68,68,0.45)"
                  : "rgba(255,255,255,0.15)"
              }`,
            }}
          >
            <PhoneOff
              className="h-9 w-9"
              style={{
                color: callStatus === "failed" ? "#f87171" : "#a1a1aa",
              }}
            />
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-lg font-bold text-white">
              {callStatus === "failed" ? "Connection failed" : "Call ended"}
            </p>
            {callStatus === "failed" && (
              <p className="text-sm" style={{ color: "rgba(248,113,113,0.7)" }}>
                Check your connection and try again
              </p>
            )}
          </div>
        </div>
      )}

      {/* Local video PiP — bottom-right corner above controls */}
      <div
        className="absolute z-20 overflow-hidden rounded-xl"
        style={{
          width: 120,
          height: 160,
          bottom: "calc(env(safe-area-inset-bottom) + 96px)",
          right: 16,
          border: "2px solid rgba(255,255,255,0.3)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
        }}
        data-ocid="videocall.local_preview"
      >
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {!isCameraOn && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.85)" }}
          >
            <VideoOff
              className="h-6 w-6"
              style={{ color: "rgba(255,255,255,0.5)" }}
            />
          </div>
        )}
      </div>

      {/* CONTROL BAR — fixed bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-4 px-6"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)",
          paddingTop: 20,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)",
        }}
      >
        {/* Mute mic */}
        <CallControlBtn
          onClick={toggleMic}
          disabled={!localStreamRef.current}
          dataOcid="videocall.mic_toggle"
          ariaLabel={isMicOn ? "Mute microphone" : "Unmute microphone"}
          size={56}
          danger={!isMicOn}
        >
          {isMicOn ? (
            <Mic className="h-6 w-6 text-white" />
          ) : (
            <MicOff className="h-6 w-6 text-white" />
          )}
        </CallControlBtn>

        {/* Toggle video */}
        <CallControlBtn
          onClick={toggleCamera}
          disabled={!localStreamRef.current}
          dataOcid="videocall.camera_toggle"
          ariaLabel={isCameraOn ? "Turn camera off" : "Turn camera on"}
          size={56}
          danger={!isCameraOn}
        >
          {isCameraOn ? (
            <Video className="h-6 w-6 text-white" />
          ) : (
            <VideoOff className="h-6 w-6 text-white" />
          )}
        </CallControlBtn>

        {/* End call — prominent center */}
        <CallControlBtn
          onClick={endCall}
          dataOcid="videocall.end_button"
          ariaLabel="End call"
          size={64}
          endCall
        >
          <PhoneOff className="h-7 w-7 text-white" />
        </CallControlBtn>

        {/* Speaker */}
        <CallControlBtn
          onClick={toggleSpeaker}
          dataOcid="videocall.speaker_toggle"
          ariaLabel={isSpeakerOn ? "Mute speaker" : "Unmute speaker"}
          size={56}
          danger={!isSpeakerOn}
        >
          <Speaker className="h-6 w-6 text-white" />
        </CallControlBtn>

        {/* Flip camera */}
        <CallControlBtn
          onClick={flipCamera}
          disabled={!localStreamRef.current}
          dataOcid="videocall.flip_camera"
          ariaLabel="Flip camera"
          size={56}
        >
          <FlipHorizontal2 className="h-6 w-6 text-white" />
        </CallControlBtn>
      </div>
    </div>
  );
}

// ── Incoming call banner ──────────────────────────────────────────────────
// ── Call control button ────────────────────────────────────────────────
function CallControlBtn({
  children,
  onClick,
  disabled,
  size,
  dataOcid,
  ariaLabel,
  danger,
  endCall,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  size: number;
  dataOcid: string;
  ariaLabel: string;
  danger?: boolean;
  endCall?: boolean;
}) {
  let bg = "rgba(40,40,60,0.85)";
  if (endCall) bg = "#dc2626";
  else if (danger) bg = "rgba(220,38,38,0.85)";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-ocid={dataOcid}
      aria-label={ariaLabel}
      className="flex items-center justify-center rounded-full transition-all duration-150 active:scale-90 disabled:opacity-40"
      style={{
        width: size,
        height: size,
        background: bg,
        border: endCall ? "none" : "1px solid rgba(255,255,255,0.15)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: endCall
          ? "0 4px 24px rgba(220,38,38,0.5), 0 2px 8px rgba(0,0,0,0.4)"
          : "0 2px 8px rgba(0,0,0,0.3)",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

// ── Incoming call banner ──────────────────────────────────────────────────
function useRingtone() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback((durationMs = 45000) => {
    stop();
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const totalEnd = ctx.currentTime + durationMs / 1000;
      const pattern = [
        { freq: 440, duration: 0.3 },
        { freq: 0, duration: 0.15 },
        { freq: 480, duration: 0.3 },
        { freq: 0, duration: 0.5 },
      ];
      let t = ctx.currentTime + 0.05;
      while (t < totalEnd) {
        for (const step of pattern) {
          if (step.freq > 0) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = step.freq;
            osc.type = "sine";
            gain.gain.setValueAtTime(0.4, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + step.duration);
            osc.start(t);
            osc.stop(t + step.duration);
          }
          t += step.duration;
          if (t >= totalEnd) break;
        }
      }
      ringTimeoutRef.current = setTimeout(stop, durationMs + 200);
    } catch {
      // AudioContext not available
    }
  }, []);

  const stop = useCallback(() => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(
    () => () => {
      stop();
    },
    [stop],
  );

  return { start, stop };
}

export function IncomingCallBanner({
  callerName,
  onAccept,
  onDecline,
}: {
  callerName: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const ringtone = useRingtone();

  // biome-ignore lint/correctness/useExhaustiveDependencies: ringtone stable ref
  useEffect(() => {
    ringtone.start(45000);
    return () => ringtone.stop();
  }, []);

  const handleAccept = () => {
    ringtone.stop();
    // Tell service worker to dismiss the lock-screen notification
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "STOP_RINGTONE" });
    }
    onAccept();
  };

  const handleDecline = () => {
    ringtone.stop();
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "STOP_RINGTONE" });
    }
    onDecline();
  };

  return (
    <div
      className="fixed top-4 left-4 right-4 z-50 flex items-center gap-3 px-4 py-4 rounded-3xl"
      style={{
        background: "rgba(10,6,18,0.92)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1.5px solid oklch(var(--primary) / 0.5)",
        boxShadow:
          "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px oklch(var(--primary) / 0.15), 0 0 30px oklch(var(--primary) / 0.2)",
      }}
      data-ocid="videocall.incoming_banner"
    >
      <div
        className="relative flex items-center justify-center w-12 h-12 rounded-2xl shrink-0"
        style={{
          background: "oklch(var(--primary) / 0.2)",
          border: "1.5px solid oklch(var(--primary) / 0.5)",
        }}
      >
        <Video className="h-6 w-6 text-primary" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background animate-pulse" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-foreground text-sm truncate">
          {callerName}
        </p>
        <p className="text-xs text-muted-foreground">Incoming video call…</p>
      </div>
      <button
        type="button"
        onClick={handleAccept}
        data-ocid="videocall.accept_button"
        className="flex items-center justify-center w-12 h-12 rounded-2xl shrink-0 active:scale-90 transition-transform"
        style={{
          background: "#22c55e",
          boxShadow: "0 4px 16px rgba(34,197,94,0.4)",
        }}
        aria-label="Accept call"
      >
        <Phone className="h-5 w-5 text-white" />
      </button>
      <button
        type="button"
        onClick={handleDecline}
        data-ocid="videocall.decline_button"
        className="flex items-center justify-center w-12 h-12 rounded-2xl shrink-0 active:scale-90 transition-transform"
        style={{
          background: "#e53e3e",
          boxShadow: "0 4px 16px rgba(229,62,62,0.4)",
        }}
        aria-label="Decline call"
      >
        <PhoneOff className="h-5 w-5 text-white" />
      </button>
    </div>
  );
}
