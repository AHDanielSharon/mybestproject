import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import GlobalCallManager from "./components/GlobalCallManager";
import MainLayout from "./components/MainLayout";
import ProfileSetupModal from "./components/ProfileSetupModal";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./contexts/ThemeContext";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { useGetCallerUserProfile } from "./hooks/useQueries";
import ExplorePage from "./pages/ExplorePage";
import FeedPage from "./pages/FeedPage";
import LoginPage from "./pages/LoginPage";
import MessagesPage from "./pages/MessagesPage";
import ProfilePage from "./pages/ProfilePage";
import ReelsPage from "./pages/ReelsPage";
import { motion, AnimatePresence } from "motion/react";
import { Strings } from "./Strings";

// ── Welcome Animation Component ──────────────────────────────────────────
function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  const [showImage, setShowImage] = useState(false);
  const [tapped, setTapped] = useState(false);

  // Start the actual experience once user taps
  const handleTap = () => {
    if (tapped) return;
    setTapped(true);

    // Play audios — now safe because this is inside a user gesture handler
    const namasteAudio = new Audio("/sounds/namaste.mp3");
    const bgmAudio = new Audio("/sounds/background.mp3");
    bgmAudio.volume = 0.4;

    namasteAudio.play().catch((err) => console.log(Strings.welcome.voiceError, err));
    bgmAudio.play().catch((err) => console.log(Strings.welcome.bgmError, err));

    // Complete after 10 seconds
    setTimeout(onComplete, 10000);

    // Cleanup on unmount
    return () => {
      namasteAudio.pause();
      bgmAudio.pause();
    };
  };

  useEffect(() => {
    const imageTimer = setTimeout(() => setShowImage(true), 100);
    return () => clearTimeout(imageTimer);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[999] bg-black flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(10px)" }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      onClick={handleTap}
      style={{ cursor: tapped ? "default" : "pointer" }}
    >
      <motion.div
        className="w-full h-full flex items-center justify-center"
        initial={{ scale: 1.05, opacity: 0 }}
        animate={showImage ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <video
          src="/assets/welcome.mp4"
          className="w-full h-full pointer-events-none"
          style={{
            objectFit: "contain",   /* contain = no cropping, full video visible */
            background: "#000",
          }}
          autoPlay
          muted
          playsInline
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />

        {/* Subtle overlay glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
      </motion.div>

      {/* Tap-to-start prompt — only shown before first tap */}
      {!tapped && (
        <motion.div
          className="absolute bottom-16 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.6 }}
        >
          <motion.div
            className="w-14 h-14 rounded-full border-2 border-white/60 flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            <span style={{ fontSize: 26 }}>👆</span>
          </motion.div>
          <span className="text-white/80 text-sm font-medium tracking-wide" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>
            {Strings.welcome.tapToStart}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}


const rootRoute = createRootRoute({
  component: MainLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: FeedPage,
});

const exploreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/explore",
  component: ExplorePage,
});

const reelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reels",
  component: ReelsPage,
});

const messagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/messages",
  component: MessagesPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  exploreRoute,
  reelsRoute,
  messagesRoute,
  profileRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function PushSubscriber() {
  usePushNotifications();
  return null;
}

export default function App() {
  const { loginStatus, identity, isInitializing } = useInternetIdentity();
  const IS_MOCK = import.meta.env.VITE_USE_MOCK === "true";
  const isAuthenticated = IS_MOCK
    ? loginStatus === "success" && identity !== null
    : loginStatus === "success" && identity !== null && !identity?.getPrincipal().isAnonymous();

  const { data: userProfile } = useGetCallerUserProfile();
  const showProfileSetup = isAuthenticated && userProfile === null;

  // Track if we just logged in to show the welcome screen
  const [showWelcome, setShowWelcome] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  useEffect(() => {
    // When authentication succeeds and we haven't shown it in this session
    if (isAuthenticated && !hasShownWelcome) {
      // Check if this is their first ever login (or first in this tab for mock)
      const hasSeen = sessionStorage.getItem("has_seen_socionet_welcome");
      if (!hasSeen) {
        setShowWelcome(true);
        sessionStorage.setItem("has_seen_socionet_welcome", "true");
      }
      setHasShownWelcome(true);
    }
  }, [isAuthenticated, hasShownWelcome]);

  useEffect(() => {
    if (loginStatus === "success" && identity) {
      console.log(
        Strings.auth.loginSuccess,
        identity.getPrincipal().toString(),
      );
    }
  }, [loginStatus, identity]);

  // Listen for ringtone/call messages from the Service Worker.
  useEffect(() => {
    let ringCtx: AudioContext | null = null;
    let ringTimeout: ReturnType<typeof setTimeout> | null = null;

    function startRing(durationMs: number) {
      stopRing();
      try {
        const ctx = new AudioContext();
        ringCtx = ctx;
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
        ringTimeout = setTimeout(stopRing, durationMs + 200);
      } catch {
        // AudioContext unavailable in this context
      }
    }

    function stopRing() {
      if (ringTimeout) {
        clearTimeout(ringTimeout);
        ringTimeout = null;
      }
      if (ringCtx) {
        ringCtx.close().catch(() => {});
        ringCtx = null;
      }
    }

    function handleSWMessage(event: MessageEvent) {
      if (!event.data) return;
      if (event.data.type === "INCOMING_CALL") {
        startRing(45000);
      }
      if (event.data.type === "PLAY_RINGTONE") {
        startRing(event.data.durationMs ?? 45000);
      }
      if (event.data.type === "STOP_RINGTONE") {
        stopRing();
      }
    }

    navigator.serviceWorker?.addEventListener("message", handleSWMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
      stopRing();
    };
  }, []);

  if (!IS_MOCK && isInitializing) {
    return (
      <ThemeProvider>
        <div className="flex h-[100dvh] items-center justify-center gradient-bg-animated">
          <div className="text-center px-4">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 rounded-[28px] flex items-center justify-center neon-glow-cyan animate-pulse-glow"
              style={{
                background: "linear-gradient(135deg, oklch(0.7 0.32 195 / 0.2), oklch(0.65 0.35 290 / 0.2))",
                border: "1.5px solid oklch(0.7 0.32 195 / 0.3)",
              }}
            >
              <img
                src="/assets/generated/socionet-logo-transparent.dim_200x200.png"
                alt={Strings.welcome.logoAlt}
                className="h-12 w-12 sm:h-14 sm:w-14"
              />
            </div>
            <div className="mb-4 h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto neon-glow-cyan" />
            <p className="text-sm text-muted-foreground neon-text-cyan">{Strings.welcome.loading}</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemeProvider>
        <LoginPage />
        <Toaster />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <AnimatePresence>
        {showWelcome && <WelcomeScreen onComplete={() => setShowWelcome(false)} key="welcome" />}
      </AnimatePresence>
      
      {!showWelcome && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <PushSubscriber />
          <GlobalCallManager />
          <RouterProvider router={router} />
          {showProfileSetup && <ProfileSetupModal />}
          <Toaster />
        </motion.div>
      )}
    </ThemeProvider>
  );
}
