import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const SPRING = {
  type: "spring" as const,
  stiffness: 200,
  damping: 25,
  mass: 1,
};

const PROMPTS = [
  "Ask Socionet AI...",
  "Say 'go to feed'",
  "Say 'open messages'",
  "Say 'show reels'",
];

const COMMANDS: Record<string, { action: string; message: string }> = {
  "go to feed": { action: "/", message: "Taking you to the Feed! 🏠" },
  "open feed": { action: "/", message: "Taking you to the Feed! 🏠" },
  "go to messages": { action: "/messages", message: "Opening Messages 💬" },
  "open messages": { action: "/messages", message: "Opening Messages 💬" },
  "go to reels": { action: "/reels", message: "Loading Reels 🎬" },
  "show reels": { action: "/reels", message: "Loading Reels 🎬" },
  "go to explore": { action: "/explore", message: "Exploring now 🔍" },
  "open explore": { action: "/explore", message: "Exploring now 🔍" },
  "search for": { action: "/explore", message: "Opening Search 🔍" },
  "find people": { action: "/explore", message: "Opening Search 🔍" },
  "go to profile": { action: "/profile", message: "Opening your Profile 👤" },
  "open profile": { action: "/profile", message: "Opening your Profile 👤" },
  hello: { action: "", message: "Hey there! How can I help you? 👋" },
  help: {
    action: "",
    message:
      "I can navigate: feed, messages, reels, explore, profile. Just say the word!",
  },
};

// Minimal SpeechRecognition typings (not in all tslib targets)
interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}
interface SRInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
interface SRConstructor {
  new (): SRInstance;
}

function getSpeechRecognition(): SRConstructor | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ||
    w.webkitSpeechRecognition) as SRConstructor | null;
}

interface AIAssistantProps {
  onNavigate?: (path: string) => void;
}

export default function AIAssistant({ onNavigate }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [promptIdx, setPromptIdx] = useState(0);
  const recognitionRef = useRef<SRInstance | null>(null);
  const responseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setInterval(
      () => setPromptIdx((p) => (p + 1) % PROMPTS.length),
      3000,
    );
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    };
  }, []);

  const processCommand = (text: string) => {
    const lower = text.toLowerCase().trim();
    let matched: { action: string; message: string } | null = null;
    for (const [key, value] of Object.entries(COMMANDS)) {
      if (lower.includes(key)) {
        matched = value;
        break;
      }
    }
    if (matched) {
      setResponse(matched.message);
      if (matched.action && onNavigate) {
        setTimeout(() => onNavigate(matched!.action), 600);
      }
    } else {
      setResponse(
        `I heard "${text}" — try: go to feed, open messages, show reels.`,
      );
    }
    responseTimerRef.current = setTimeout(() => {
      setResponse("");
      setTranscript("");
    }, 4000);
  };

  const startListening = () => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setResponse("Voice not supported in this browser.");
      return;
    }
    if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    setResponse("");
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      setResponse("Couldn't hear you. Try again.");
    };
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      processCommand(text);
    };
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return (
    <div
      className="fixed z-50 right-4"
      style={{
        bottom: "calc(env(safe-area-inset-bottom) + 140px)",
      }}
      data-ocid="ai_assistant.panel"
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="ai-bubble"
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 8 }}
            transition={SPRING}
            className="mb-3 glass-panel p-4 w-72 max-w-[calc(100vw-2rem)]"
            data-ocid="ai_assistant.dialog"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-semibold text-foreground">
                Socionet AI
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                Web Speech
              </span>
            </div>

            <div className="min-h-[48px] mb-3">
              <AnimatePresence mode="wait">
                {response ? (
                  <motion.p
                    key="response"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={SPRING}
                    className="text-sm text-foreground leading-relaxed"
                  >
                    {response}
                  </motion.p>
                ) : transcript ? (
                  <motion.p
                    key="transcript"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-muted-foreground italic"
                  >
                    &ldquo;{transcript}&rdquo;
                  </motion.p>
                ) : (
                  <motion.p
                    key={`prompt-${promptIdx}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.3 }}
                    className="text-sm text-muted-foreground"
                  >
                    {PROMPTS[promptIdx]}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              type="button"
              onClick={isListening ? stopListening : startListening}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.93 }}
              transition={SPRING}
              data-ocid="ai_assistant.mic_button"
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm ${
                isListening
                  ? "bg-destructive/80 text-destructive-foreground border border-destructive/50"
                  : "glass-btn text-foreground"
              }`}
            >
              <MicIcon isListening={isListening} />
              {isListening ? "Tap to stop" : "Tap to speak"}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        transition={SPRING}
        data-ocid="ai_assistant.open_modal_button"
        className="flex items-center gap-2 glass-panel px-4 py-3 rounded-2xl"
      >
        <motion.div
          animate={isListening ? { scale: [1, 1.2, 1] } : { scale: 1 }}
          transition={
            isListening
              ? { repeat: Number.POSITIVE_INFINITY, duration: 0.8 }
              : {}
          }
          className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse-glow"
        >
          <MicIcon isListening={isListening} small />
        </motion.div>
        {!isOpen && (
          <span className="text-sm font-medium text-foreground pr-1">
            Ask AI
          </span>
        )}
      </motion.button>
    </div>
  );
}

function MicIcon({
  isListening,
  small,
}: { isListening: boolean; small?: boolean }) {
  const cls = small ? "h-4 w-4" : "h-4 w-4";
  if (isListening) {
    return (
      <svg
        className={`${cls} text-current`}
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path
          d="M5 11a7 7 0 0014 0"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          className="animate-pulse"
        />
        <line
          x1="12"
          y1="18"
          x2="12"
          y2="21"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="9"
          y1="21"
          x2="15"
          y2="21"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg
      className={`${cls} text-current`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0014 0" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="21" strokeLinecap="round" />
      <line x1="9" y1="21" x2="15" y2="21" strokeLinecap="round" />
    </svg>
  );
}
