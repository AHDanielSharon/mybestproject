import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "../contexts/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      data-ocid="header.theme_toggle"
      className="relative flex items-center justify-center rounded-full transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        minWidth: 44,
        minHeight: 44,
        background: isDark
          ? "oklch(var(--card) / 0.6)"
          : "oklch(var(--card) / 0.8)",
        border: `1.5px solid ${
          isDark ? "oklch(var(--primary) / 0.35)" : "oklch(var(--border) / 0.6)"
        }`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: isDark
          ? "0 0 14px oklch(var(--primary) / 0.25)"
          : "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="sun"
            initial={{ rotate: -60, scale: 0.5, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 60, scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Sun
              style={{ width: 20, height: 20, color: "oklch(0.85 0.18 80)" }}
              strokeWidth={1.8}
            />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ rotate: 60, scale: 0.5, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -60, scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Moon
              style={{ width: 20, height: 20, color: "oklch(0.55 0.18 260)" }}
              strokeWidth={1.8}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
