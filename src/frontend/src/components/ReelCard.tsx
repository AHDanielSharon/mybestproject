import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import type { Principal } from "@icp-sdk/core/principal";
import {
  Bookmark,
  Download,
  Heart,
  MessageCircle,
  Music2,
  Share2,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Video } from "../backend";
import {
  useAddComment,
  useDeleteVideo,
  useGetCallerUserProfile,
  useGetReelStats,
  useGetUserProfile,
  useIncrementViews,
  useLikeReel,
  useShareReel,
} from "../hooks/useQueries";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";

interface ReelCardProps {
  video: Video;
  autoPlay?: boolean;
  onCreatorClick?: (creatorPrincipal: Principal) => void;
}

const SPRING = { type: "spring" as const, stiffness: 340, damping: 22 };
const BTN_SPRING = { type: "spring" as const, stiffness: 480, damping: 20 };

function ActionButton({
  children,
  label,
  count,
  active,
  activeColor,
  onClick,
  ocid,
}: {
  children: React.ReactNode;
  label: string;
  count?: string | number;
  active?: boolean;
  activeColor?: string;
  onClick: (e: React.MouseEvent) => void;
  ocid: string;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      data-ocid={ocid}
      onClick={onClick}
      whileTap={{ scale: 0.75 }}
      transition={BTN_SPRING}
      className="flex flex-col items-center gap-[5px] touch-target"
    >
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center
          backdrop-blur-md border transition-all duration-200
          ${
            active
              ? `bg-black/25 border-${activeColor ?? "yellow"}-500/50 shadow-[0_0_14px_rgba(255,215,0,0.5)]`
              : "bg-black/30 border-white/20 hover:bg-white/10"
          }`}
      >
        {children}
      </div>
      {count !== undefined && (
        <span className="text-white text-[11px] font-semibold leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          {count}
        </span>
      )}
    </motion.button>
  );
}

export default function ReelCard({
  video,
  autoPlay = false,
  onCreatorClick,
}: ReelCardProps) {
  const { identity } = useInternetIdentity();
  const deleteVideo = useDeleteVideo();
  const { data: creatorProfile } = useGetUserProfile(video.creator);
  const { data: currentUserProfile } = useGetCallerUserProfile();
  const { data: reelStats } = useGetReelStats(video.id);
  const likeReel = useLikeReel();
  const addComment = useAddComment();
  const shareReel = useShareReel();
  const incrementViews = useIncrementViews();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [isLiked, setIsLiked] = useState(() => localStorage.getItem(`liked_${video.id}`) === "true");
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(() => localStorage.getItem(`saved_${video.id}`) === "true");
  const lastTapRef = useRef<number>(0);

  const isOwner =
    identity?.getPrincipal().toString() === video.creator.toString();

  useEffect(() => {
    const url = video.file.getDirectURL();
    setVideoUrl(url);
  }, [video.file]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) return;
    if (autoPlay) {
      setHasInteracted(true);
      vid.muted = true;
      vid.play().catch(() => setIsPlaying(false));
    } else {
      vid.pause();
      vid.currentTime = 0;
      setIsPlaying(false);
    }
  }, [autoPlay, videoUrl]);

  useEffect(() => {
    if (isPlaying && !hasTrackedView && autoPlay) {
      incrementViews.mutate(video.id);
      setHasTrackedView(true);
    }
  }, [isPlaying, hasTrackedView, autoPlay, video.id, incrementViews]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onTimeUpdate = () => {
      if (vid.duration) setProgress((vid.currentTime / vid.duration) * 100);
    };
    vid.addEventListener("timeupdate", onTimeUpdate);
    return () => vid.removeEventListener("timeupdate", onTimeUpdate);
  }, []);

  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    setHasInteracted(true);
    if (isPlaying) {
      vid.pause();
    } else {
      vid.play().catch(() => {});
    }
    setIsPlaying((p) => !p);
  }, [isPlaying]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    const next = !isMuted;
    vid.muted = next;
    setIsMuted(next);
  };

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      if (newLikedState) {
        localStorage.setItem(`liked_${video.id}`, "true");
      } else {
        localStorage.removeItem(`liked_${video.id}`);
      }
      setShowHeartBurst(true);
      likeReel.mutate(video.id);
      setTimeout(() => setShowHeartBurst(false), 900);
    } else {
      const t = setTimeout(() => {
        if (Date.now() - lastTapRef.current >= 350) togglePlay();
      }, 200);
      return () => clearTimeout(t);
    }
    lastTapRef.current = now;
  }, [likeReel, video.id, togglePlay]);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    likeReel.mutate(video.id);
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    if (newLikedState) {
      localStorage.setItem(`liked_${video.id}`, "true");
    } else {
      localStorage.removeItem(`liked_${video.id}`);
    }
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !isBookmarked;
    setIsBookmarked(newState);
    if (newState) {
      localStorage.setItem(`saved_${video.id}`, "true");
    } else {
      localStorage.removeItem(`saved_${video.id}`);
    }
    toast.success(newState ? "Saved!" : "Removed from saved");
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    shareReel.mutate(video.id);
    const url = `${window.location.origin}/reels/${video.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title, url });
      } catch {
        /* user cancelled */
      }
    } else {
      navigator.clipboard
        .writeText(url)
        .then(() => toast.success("Link copied!"));
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(videoUrl);
      const blob = await res.blob();
      const href = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `${video.title}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(href);
      document.body.removeChild(a);
      toast.success("Download started");
    } catch {
      toast.error("Failed to download");
    }
  };

  const handleAddComment = () => {
    if (!commentText.trim() || !currentUserProfile) return;
    addComment.mutate({
      reelId: video.id,
      comment: { author: currentUserProfile.name, text: commentText.trim() },
    });
    setCommentText("");
  };

  const handleDelete = () => deleteVideo.mutate(video.id);

  const formatCount = (count: bigint) => {
    const n = Number(count);
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const avatarUrl = creatorProfile?.avatar?.getDirectURL();
  const creatorName = creatorProfile?.name || "Creator";
  const likes = reelStats ? formatCount(reelStats.likes) : "0";
  const comments = reelStats ? reelStats.comments.length : 0;
  const shares = reelStats ? formatCount(reelStats.shares ?? 0n) : "0";

  return (
    <div
      className="relative w-full h-full bg-black select-none"
      data-ocid={`reel.card.${video.id}`}
    >
      {/* ── Thin progress bar (top) ── */}
      <div className="absolute top-0 left-0 right-0 z-30 h-[2px] bg-white/10">
        <motion.div
          className="h-full"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, oklch(0.88 0.12 85), oklch(0.80 0.17 70))",
          }}
          transition={{ duration: 0.1, ease: "linear" }}
        />
      </div>

      {/* ── Video ── */}
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          className="absolute inset-0 w-full h-full object-cover"
          loop
          playsInline
          muted={isMuted}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {/* ── Tap zone ── */}
      <button
        type="button"
        aria-label={isPlaying ? "Pause" : "Play"}
        className="absolute inset-0 z-10"
        onClick={handleTap}
        data-ocid="reel.toggle_play"
      />

      {/* ── Top gradient (readability for top buttons) ── */}
      <div
        className="absolute top-0 left-0 right-0 h-36 z-20 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)",
        }}
      />

      {/* ── Bottom gradient (creator info + actions) ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none"
        style={{
          height: "70%",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 40%, transparent 100%)",
        }}
      />

      {/* ── Mute (top-right) ── */}
      <button
        type="button"
        onClick={toggleMute}
        aria-label={isMuted ? "Unmute" : "Mute"}
        data-ocid="reel.mute_toggle"
        className="absolute top-4 right-4 z-30 w-10 h-10 flex items-center justify-center
          rounded-full bg-black/45 backdrop-blur-md border border-white/20
          active:scale-90 transition-transform duration-150"
      >
        {isMuted ? (
          <VolumeX className="h-[18px] w-[18px] text-white" />
        ) : (
          <Volume2 className="h-[18px] w-[18px] text-white" />
        )}
      </button>

      {/* ── Delete (owner, top-right behind mute) ── */}
      {isOwner && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              aria-label="Delete reel"
              data-ocid="reel.delete_button"
              className="absolute top-4 right-16 z-30 w-10 h-10 flex items-center justify-center
                rounded-full bg-black/45 backdrop-blur-md border border-white/20
                active:scale-90 transition-transform duration-150"
            >
              <Trash2 className="h-4 w-4 text-white" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">
                Delete Reel?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                className="rounded-xl border-white/15 text-white bg-transparent"
                data-ocid="reel.cancel_button"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="rounded-xl bg-red-500/90 text-white hover:bg-red-600"
                data-ocid="reel.confirm_button"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* ── Creator info (bottom-left) ── */}
      <div className="absolute bottom-6 left-4 z-30 max-w-[63%] space-y-2">
        <button
          type="button"
          onClick={() => !isOwner && onCreatorClick?.(video.creator)}
          className="flex items-center gap-2.5 group"
          data-ocid="reel.creator_button"
        >
          {/* Gradient ring */}
          <div
            className="w-10 h-10 rounded-full p-[2px] shrink-0"
            style={{
              background: "linear-gradient(135deg, oklch(0.88 0.12 85), oklch(0.80 0.17 70), oklch(0.65 0.20 45))",
            }}
          >
            <div className="w-full h-full rounded-full bg-black/70 p-[1.5px]">
              <Avatar className="w-full h-full">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={creatorName} />
                ) : null}
                <AvatarFallback className="bg-primary/25 text-primary text-xs font-bold">
                  {getInitials(creatorName)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
          <div className="text-left min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate drop-shadow">
              @{creatorName}
            </p>
            {!isOwner && (
              <span className="text-[11px] font-semibold gradient-text">
                + Follow
              </span>
            )}
          </div>
        </button>

        {/* Title */}
        <p className="text-white text-sm font-semibold leading-snug drop-shadow-md line-clamp-2">
          {video.title}
        </p>
        {video.description && (
          <p className="text-white/70 text-xs leading-relaxed line-clamp-2">
            {video.description}
          </p>
        )}

        {/* Audio info row */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <Music2 className="h-3 w-3 text-white/70 shrink-0" />
          <p className="text-white/70 text-[11px] truncate">
            {creatorName} · Original audio
          </p>
        </div>
      </div>

      {/* ── Right action column ── */}
      <div className="absolute right-3 bottom-6 z-30 flex flex-col items-center gap-4">
        {/* Like */}
        <ActionButton
          label="Like"
          count={likes}
          active={isLiked}
          activeColor="pink"
          onClick={handleLike}
          ocid="reel.like_button"
        >
          <motion.div
            animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
            transition={SPRING}
          >
            <Heart
              className={`h-[22px] w-[22px] transition-colors duration-200 ${
                isLiked ? "text-yellow-500 fill-yellow-500" : "text-white"
              }`}
            />
          </motion.div>
        </ActionButton>

        {/* Comment */}
        <Dialog open={showComments} onOpenChange={setShowComments}>
          <DialogTrigger asChild>
            <ActionButton
              label="Comments"
              count={comments}
              active={false}
              onClick={(e) => e.stopPropagation()}
              ocid="reel.open_modal_button"
            >
              <MessageCircle className="h-[22px] w-[22px] text-white" />
            </ActionButton>
          </DialogTrigger>
          <DialogContent
            className="max-w-md rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-white/10"
            data-ocid="reel.dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <DialogHeader>
              <DialogTitle className="text-white">Comments</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[280px] pr-2">
              {reelStats && reelStats.comments.length > 0 ? (
                <div className="space-y-4">
                  {reelStats.comments.map((comment, index) => (
                    <div
                      key={`${comment.author}-${index}`}
                      className="border-b border-white/8 pb-3"
                    >
                      <p className="text-sm font-semibold text-primary">
                        {comment.author}
                      </p>
                      <p className="text-sm text-white/70 mt-0.5">
                        {comment.text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-white/40 py-10">
                  No comments yet
                </p>
              )}
            </ScrollArea>
            <div className="flex gap-2 mt-3">
              <Input
                placeholder="Add a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddComment();
                }}
                className="bg-white/8 border-white/15 text-white placeholder:text-white/40 rounded-xl"
                data-ocid="reel.input"
              />
              <Button
                type="button"
                onClick={handleAddComment}
                disabled={!commentText.trim() || addComment.isPending}
                className="rounded-xl bg-primary text-primary-foreground"
                data-ocid="reel.submit_button"
              >
                Post
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Share */}
        <ActionButton
          label="Share"
          count={shares}
          active={false}
          onClick={handleShare}
          ocid="reel.share_button"
        >
          <Share2 className="h-[22px] w-[22px] text-white" />
        </ActionButton>

        {/* Bookmark */}
        <ActionButton
          label="Save"
          active={isBookmarked}
          activeColor="yellow"
          onClick={handleBookmark}
          ocid="reel.bookmark_button"
        >
          <Bookmark
            className={`h-[22px] w-[22px] transition-colors duration-200 ${
              isBookmarked ? "text-yellow-400 fill-yellow-400" : "text-white"
            }`}
          />
        </ActionButton>

        {/* Download */}
        <ActionButton
          label="Download"
          active={false}
          onClick={handleDownload}
          ocid="reel.download_button"
        >
          <Download className="h-[22px] w-[22px] text-white" />
        </ActionButton>
      </div>

      {/* ── Pause indicator (center) ── */}
      <AnimatePresence>
        {!isPlaying && hasInteracted && !showHeartBurst && (
          <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={SPRING}
          >
            <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="h-10 w-10 text-white fill-white"
                role="img"
                aria-label="Paused"
              >
                <title>Paused</title>
                <rect x="5" y="3" width="4" height="18" rx="1" />
                <rect x="15" y="3" width="4" height="18" rx="1" />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Double-tap heart burst ── */}
      <AnimatePresence>
        {showHeartBurst && (
          <motion.div
            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1.4 }}
            exit={{ opacity: 0, scale: 1.7 }}
            transition={{ type: "spring", stiffness: 280, damping: 18 }}
          >
            <Heart className="h-32 w-32 text-yellow-500 fill-yellow-500 drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
