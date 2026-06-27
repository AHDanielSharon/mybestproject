import { formatDistanceToNow } from "date-fns";
import { createPortal } from "react-dom";
import {
  Bell,
  CheckCheck,
  Heart,
  MessageCircle,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Notification } from "../backend";
import {
  useGetUserNotifications,
  useMarkNotificationAsRead,
} from "../hooks/useQueries";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

interface NotificationPanelProps {
  onClose: () => void;
}

const SPRING = {
  type: "spring" as const,
  stiffness: 320,
  damping: 30,
  mass: 0.8,
};

function NotificationIcon({
  type,
}: { type: Notification["notificationType"] }) {
  switch (type) {
    case "friendRequest":
      return (
        <div
          className="flex items-center justify-center w-10 h-10 rounded-2xl shrink-0"
          style={{
            background: "oklch(0.80 0.17 70 / 0.15)",
            border: "1px solid oklch(0.80 0.17 70 / 0.35)",
          }}
        >
          <UserPlus className="h-4.5 w-4.5" style={{ color: "oklch(0.88 0.12 85)", width: 18, height: 18 }} />
        </div>
      );
    case "friendRequestAccepted":
      return (
        <div
          className="flex items-center justify-center w-10 h-10 rounded-2xl shrink-0"
          style={{
            background: "oklch(0.72 0.22 145 / 0.15)",
            border: "1px solid oklch(0.72 0.22 145 / 0.35)",
          }}
        >
          <UserCheck className="h-4.5 w-4.5" style={{ color: "oklch(0.72 0.22 145)", width: 18, height: 18 }} />
        </div>
      );
    case "newMessage":
      return (
        <div
          className="flex items-center justify-center w-10 h-10 rounded-2xl shrink-0"
          style={{
            background: "oklch(0.65 0.20 200 / 0.15)",
            border: "1px solid oklch(0.65 0.20 200 / 0.35)",
          }}
        >
          <MessageCircle className="h-4.5 w-4.5" style={{ color: "oklch(0.72 0.18 220)", width: 18, height: 18 }} />
        </div>
      );
    default:
      return (
        <div
          className="flex items-center justify-center w-10 h-10 rounded-2xl shrink-0"
          style={{
            background: "oklch(0.80 0.17 70 / 0.10)",
            border: "1px solid oklch(0.80 0.17 70 / 0.20)",
          }}
        >
          <Bell className="h-4.5 w-4.5" style={{ color: "oklch(0.80 0.17 70)", width: 18, height: 18 }} />
        </div>
      );
  }
}

function typeLabel(type: Notification["notificationType"]): string {
  switch (type) {
    case "friendRequest":
      return "Friend Request";
    case "friendRequestAccepted":
      return "Request Accepted";
    case "newMessage":
      return "New Message";
    default:
      return "Notification";
  }
}

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { data: notifications = [] } = useGetUserNotifications();
  const markAsRead = useMarkNotificationAsRead();

  const unreadIds = notifications
    .filter((n: any) => !n.isRead)
    .map((n: any) => n.id);

  const handleMarkAll = async () => {
    for (const id of unreadIds) {
      await markAsRead.mutateAsync(id);
    }
  };

  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    if (!isRead && id) await markAsRead.mutateAsync(id);
  };

  const panelContent = (
    <>
      {/* Handle bar (mobile only) */}
      <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
        <div
          className="w-10 h-1 rounded-full"
          style={{ background: "oklch(0.80 0.17 70 / 0.4)" }}
        />
      </div>

      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 shrink-0"
        style={{ borderBottom: "1px solid rgba(212,175,55,0.12)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl neon-glow-gold"
            style={{
              background: "linear-gradient(135deg, oklch(0.80 0.17 70 / 0.25), oklch(0.65 0.20 45 / 0.2))",
              border: "1px solid oklch(0.80 0.17 70 / 0.35)",
            }}
          >
            <Bell className="h-4 w-4" style={{ color: "oklch(0.88 0.12 85)" }} />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">
              Notifications
            </h2>
            {unreadIds.length > 0 && (
              <p className="text-xs" style={{ color: "oklch(0.80 0.17 70)" }}>
                {unreadIds.length} unread
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadIds.length > 0 && (
            <motion.button
              type="button"
              onClick={handleMarkAll}
              whileTap={{ scale: 0.95 }}
              data-ocid="notifications.mark_all_read_button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
              style={{
                background: "oklch(0.80 0.17 70 / 0.12)",
                color: "oklch(0.88 0.12 85)",
                border: "1px solid oklch(0.80 0.17 70 / 0.2)",
              }}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all
            </motion.button>
          )}
          <motion.button
            type="button"
            onClick={onClose}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            transition={SPRING}
            data-ocid="notifications.close_button"
            aria-label="Close notifications"
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
            style={{
              background: "rgba(212,175,55,0.08)",
              border: "1px solid rgba(212,175,55,0.15)",
            }}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </motion.button>
        </div>
      </div>

      {/* Notifications list */}
      <ScrollArea className="flex-1 hide-scrollbar">
        {notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.1 }}
            className="flex flex-col items-center justify-center py-20 px-6 text-center"
            data-ocid="notifications.empty_state"
          >
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 neon-glow-gold"
              style={{
                background: "linear-gradient(135deg, oklch(0.80 0.17 70 / 0.12), oklch(0.65 0.20 45 / 0.10))",
                border: "1.5px solid oklch(0.80 0.17 70 / 0.25)",
              }}
            >
              <Bell className="h-9 w-9" style={{ color: "oklch(0.80 0.17 70 / 0.6)" }} />
            </div>
            <p className="font-bold text-foreground text-base mb-1">
              All caught up!
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px]">
              You have no notifications right now.
            </p>
          </motion.div>
        ) : (
          <div className="py-3 flex flex-col gap-1 px-3">
            {notifications.map((notification: any, index) => {
              const notificationId = notification.id || `notification_${index}`;
              const timestamp = Number(notification.timestamp) / 1_000_000;
              const timeAgo = formatDistanceToNow(new Date(timestamp), {
                addSuffix: true,
              });
              const isUnread = !notification.isRead;

              return (
                <motion.button
                  key={notificationId}
                  type="button"
                  onClick={() =>
                    handleMarkAsRead(notificationId, notification.isRead)
                  }
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: index * 0.04 }}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  data-ocid={`notifications.item.${index + 1}`}
                  className="w-full text-left rounded-2xl px-4 py-3.5 transition-colors relative overflow-hidden"
                  style={{
                    background: isUnread
                      ? "oklch(0.80 0.17 70 / 0.08)"
                      : "transparent",
                    border: isUnread
                      ? "1px solid oklch(0.80 0.17 70 / 0.18)"
                      : "1px solid transparent",
                  }}
                >
                  {/* Unread left bar */}
                  {isUnread && (
                    <span
                      className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
                      style={{ background: "oklch(0.88 0.12 85)" }}
                    />
                  )}

                  <div className="flex items-start gap-3">
                    <NotificationIcon type={notification.notificationType} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {typeLabel(notification.notificationType)}
                        </p>
                        {isUnread && (
                          <span
                            className="flex-shrink-0 w-2 h-2 rounded-full"
                            style={{ background: "oklch(0.88 0.12 85)" }}
                          />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        <span className="font-medium text-foreground">
                          {notification.senderName}
                        </span>{" "}
                        {notification.content}
                      </p>
                      <p className="text-xs mt-1.5" style={{ color: "oklch(0.55 0.06 65)" }}>
                        {timeAgo}
                      </p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </>
  );

  return createPortal(
    <>
      {/* Backdrop */}
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 w-full cursor-default"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
        aria-label="Close notifications"
      />

      {/* ── MOBILE: Bottom Sheet ── */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={SPRING}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col md:hidden"
        style={{
          background: "rgba(10, 7, 2, 0.97)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          borderTop: "1px solid oklch(0.80 0.17 70 / 0.25)",
          borderRadius: "28px 28px 0 0",
          maxHeight: "82dvh",
          boxShadow: "0 -8px 60px rgba(0,0,0,0.6), 0 0 40px oklch(0.80 0.17 70 / 0.08)",
          paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
        }}
        data-ocid="notifications.panel"
      >
        {panelContent}
      </motion.div>

      {/* ── DESKTOP: Right slide-in panel ── */}
      <motion.div
        initial={{ opacity: 0, x: 72, scale: 0.97 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 72, scale: 0.97 }}
        transition={SPRING}
        className="fixed top-0 right-0 h-full w-96 z-50 hidden md:flex flex-col"
        style={{
          background: "rgba(10, 7, 2, 0.96)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          borderLeft: "1px solid oklch(0.80 0.17 70 / 0.18)",
          boxShadow: "-8px 0 60px rgba(0,0,0,0.5), 0 0 60px oklch(0.80 0.17 70 / 0.05)",
        }}
        data-ocid="notifications.panel"
      >
        {panelContent}
      </motion.div>
    </>,
    document.body
  );
}
