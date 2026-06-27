import { BellRing } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useGetUnreadNotificationCount } from "../hooks/useQueries";
import NotificationPanel from "./NotificationPanel";

export default function NotificationBadge() {
  const { data: unreadCount } = useGetUnreadNotificationCount();
  const [showPanel, setShowPanel] = useState(false);

  const count = Number(unreadCount || BigInt(0));

  return (
    <>
      {/* Touch target wrapper — 44×44px minimum */}
      <button
        type="button"
        onClick={() => setShowPanel((p) => !p)}
        aria-label={`Notifications${count > 0 ? `, ${count} unread` : ""}`}
        data-ocid="header.notifications_button"
        className="relative flex items-center justify-center rounded-full transition-all duration-200"
        style={{ minWidth: 44, minHeight: 44 }}
      >
        {/* Glass background ring on active */}
        <motion.div
          animate={
            showPanel ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }
          }
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="absolute inset-0 rounded-full"
          style={{
            background: "oklch(var(--primary) / 0.12)",
            boxShadow: "0 0 14px oklch(var(--primary) / 0.35)",
          }}
        />

        <BellRing
          className="relative z-10 text-foreground"
          style={{ width: 22, height: 22 }}
          strokeWidth={1.8}
        />

        {/* Animated badge */}
        <AnimatePresence>
          {count > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="absolute -top-0.5 -right-0.5 z-20 flex items-center justify-center rounded-full text-white font-bold"
              style={{
                minWidth: 18,
                height: 18,
                fontSize: 10,
                paddingInline: count > 9 ? 4 : 0,
                background: "oklch(0.65 0.28 15)",
                boxShadow: "0 0 8px oklch(0.65 0.28 15 / 0.7)",
                animation:
                  count > 0 ? "badge-pop 2s ease-in-out infinite" : undefined,
              }}
            >
              {count > 9 ? "9+" : count}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {showPanel && <NotificationPanel onClose={() => setShowPanel(false)} />}
      </AnimatePresence>
    </>
  );
}
