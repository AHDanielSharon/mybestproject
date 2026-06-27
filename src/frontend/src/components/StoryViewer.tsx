import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Eye, Send, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Story } from "../backend";
import { useDeleteStory, useGetUserProfile } from "../hooks/useQueries";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
}

function formatTimeAgo(timestamp: bigint): string {
  const now = Date.now();
  const ms = Number(timestamp / BigInt(1_000_000));
  const diff = Math.max(0, now - ms);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function StoryViewer({
  stories,
  initialIndex,
  open,
  onClose,
}: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [contentUrl, setContentUrl] = useState<string>("");
  const [isHolding, setIsHolding] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyFocused, setReplyFocused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const { identity } = useInternetIdentity();
  const deleteStory = useDeleteStory();

  const STORY_DURATION = 5000;
  const currentStory = stories[currentIndex];
  const { data: creatorProfile } = useGetUserProfile(currentStory?.creator);
  const isOwner =
    identity?.getPrincipal().toString() === currentStory?.creator.toString();
  const creatorName = creatorProfile?.name || "User";
  const avatarUrl = creatorProfile?.avatar?.getDirectURL();
  const timeAgo = currentStory ? formatTimeAgo(currentStory.uploadTime) : "";

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (currentStory) {
      setContentUrl(currentStory.file.getDirectURL());
      setProgress(0);
    }
  }, [currentStory]);

  useEffect(() => {
    if (!open || isPaused || isHolding || !currentStory || replyFocused) return;
    if (currentStory.contentType === "video" && videoRef.current) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + 100 / (STORY_DURATION / 100);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [open, isPaused, isHolding, currentStory, replyFocused]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((i) => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setProgress(0);
    }
  };

  const handleDelete = async () => {
    if (currentStory) {
      await deleteStory.mutateAsync(currentStory.id);
      if (stories.length === 1) onClose();
      else handleNext();
    }
  };

  const handleReplySend = () => {
    if (!replyText.trim()) return;
    setReplyText("");
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleHoldStart = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    holdTimer.current = setTimeout(() => {
      setIsHolding(true);
      if (videoRef.current) videoRef.current.pause();
    }, 150);
  };

  const handleHoldMove = (e: React.PointerEvent) => {
    if (dragStartY.current !== null) {
      const delta = e.clientY - dragStartY.current;
      if (delta > 0) setDragY(delta);
    }
  };

  const handleHoldEnd = (e: React.PointerEvent) => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    const delta =
      dragStartY.current !== null ? e.clientY - dragStartY.current : 0;
    dragStartY.current = null;

    if (delta > 90) {
      setDragY(0);
      onClose();
      return;
    }
    setDragY(0);
    if (isHolding) {
      setIsHolding(false);
      if (videoRef.current && currentStory?.contentType === "video") {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  if (!open || !currentStory) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="story-viewer"
        ref={containerRef}
        className="fixed inset-0 z-[60] touch-none bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        data-ocid="feed.story_viewer"
      >
        <motion.div
          className="relative w-full flex flex-col"
          style={{ height: "100dvh" }}
          animate={{ y: dragY, scale: dragY > 0 ? 1 - dragY * 0.0005 : 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 45 }}
        >
          {/* ── Full-screen media ── */}
          <div
            className="absolute inset-0 select-none"
            onPointerDown={handleHoldStart}
            onPointerMove={handleHoldMove}
            onPointerUp={handleHoldEnd}
            onPointerLeave={handleHoldEnd}
          >
            {currentStory.contentType === "image" ? (
              <img
                src={contentUrl}
                alt="Story"
                className="w-full h-full"
                style={{ objectFit: "contain", background: "#000" }}
                draggable={false}
              />
            ) : (
              <video
                ref={videoRef}
                src={contentUrl}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                onEnded={handleNext}
                onPlay={() => setIsPaused(false)}
                onPause={() => setIsPaused(true)}
              />
            )}

            {/* Hold pause badge */}
            <AnimatePresence>
              {isHolding && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <div
                    className="px-6 py-3 rounded-2xl"
                    style={{
                      background: "rgba(0,0,0,0.65)",
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    <span className="text-white text-sm font-bold tracking-widest uppercase">
                      Paused
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tap left = previous */}
            <button
              type="button"
              aria-label="Previous story"
              data-ocid="feed.story_prev_button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrevious();
              }}
              className="absolute left-0 inset-y-0 w-1/3 focus:outline-none"
            />
            {/* Tap right = next */}
            <button
              type="button"
              aria-label="Next story"
              data-ocid="feed.story_next_button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-0 inset-y-0 w-1/3 focus:outline-none"
            />
          </div>

          {/* ── Top gradient for readability ── */}
          <div
            className="absolute top-0 left-0 right-0 h-32 z-10 pointer-events-none"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 70%, transparent 100%)",
            }}
          />

          {/* ── Bottom gradient ── */}
          <div
            className="absolute bottom-0 left-0 right-0 h-40 z-10 pointer-events-none"
            style={{
              background:
                "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)",
            }}
          />

          {/* ── Progress bars ── */}
          <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-2 pt-[env(safe-area-inset-top,12px)] pt-3">
            {stories.map((story, index) => (
              <div
                key={`${story.creator.toString()}-${index}`}
                className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden"
              >
                <motion.div
                  className="h-full rounded-full bg-white"
                  style={{
                    width:
                      index < currentIndex
                        ? "100%"
                        : index === currentIndex
                          ? `${progress}%`
                          : "0%",
                  }}
                  transition={{ duration: 0 }}
                />
              </div>
            ))}
          </div>

          {/* ── Header ── */}
          <div className="absolute top-5 left-0 right-0 z-20 flex items-center justify-between px-3 pt-3">
            <div className="flex items-center gap-3">
              {/* Gradient story ring */}
              <div
                className="h-9 w-9 rounded-full p-[2px] shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, #f9a825, #e91e63, #9c27b0)",
                }}
              >
                <div
                  className="h-full w-full rounded-full overflow-hidden"
                  style={{ border: "2px solid black" }}
                >
                  <Avatar className="h-full w-full">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt={creatorName} />
                    ) : null}
                    <AvatarFallback className="bg-white/20 text-white text-xs font-bold">
                      {getInitials(creatorName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <div>
                <p className="text-white text-[13px] font-semibold leading-tight drop-shadow-sm">
                  {creatorName}
                </p>
                <p className="text-white/70 text-[11px] leading-tight">
                  {timeAgo}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isOwner && (
                <button
                  type="button"
                  onClick={handleDelete}
                  aria-label="Delete story"
                  data-ocid="feed.story_delete_button"
                  className="h-9 w-9 flex items-center justify-center rounded-full text-white
                    active:scale-90 transition-transform"
                  style={{
                    background: "rgba(0,0,0,0.4)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                data-ocid="feed.story_close_button"
                aria-label="Close story"
                className="h-9 w-9 flex items-center justify-center rounded-full text-white
                  active:scale-90 transition-transform"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>

          {/* ── Bottom area ── */}
          <div className="absolute bottom-0 left-0 right-0 z-20 px-3 pb-[env(safe-area-inset-bottom,20px)] pb-5">
            {isOwner ? (
              /* Owner: viewers count */
              <div className="flex items-center gap-2 justify-center">
                <div
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full"
                  style={{
                    background: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <Eye className="h-4 w-4 text-white/80" />
                  <span className="text-white/90 text-sm font-medium">
                    Seen by viewers
                  </span>
                </div>
              </div>
            ) : (
              /* Other's story: reply input */
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 flex items-center rounded-full px-4 py-2.5"
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    backdropFilter: "blur(12px)",
                    border: "1.5px solid rgba(255,255,255,0.2)",
                  }}
                >
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onFocus={() => setReplyFocused(true)}
                    onBlur={() => setReplyFocused(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleReplySend();
                    }}
                    placeholder={`Reply to ${creatorName}...`}
                    data-ocid="feed.story_reply_input"
                    className="flex-1 bg-transparent text-white placeholder-white/50 text-sm outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleReplySend}
                  aria-label="Send reply"
                  data-ocid="feed.story_reply_button"
                  className="h-11 w-11 flex items-center justify-center rounded-full text-white shrink-0
                    active:scale-90 transition-transform"
                  style={{
                    background: "linear-gradient(135deg, #e91e63, #9c27b0)",
                  }}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* ── Close-drag hint ── */}
          {dragY > 20 && (
            <div className="absolute bottom-24 left-0 right-0 flex justify-center z-30 pointer-events-none">
              <span
                className="text-white/70 text-xs font-medium px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(0,0,0,0.5)",
                  backdropFilter: "blur(8px)",
                }}
              >
                Release to close
              </span>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
