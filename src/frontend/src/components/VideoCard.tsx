import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import type { Principal } from "@icp-sdk/core/principal";
import { Send, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

interface VideoCardProps {
  video: Video;
  autoPlay?: boolean;
  onCreatorClick?: (creatorPrincipal: Principal) => void;
}

function formatCount(n: bigint): string {
  const v = Number(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toString();
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function VideoCard({
  video,
  autoPlay = false,
  onCreatorClick,
}: VideoCardProps) {
  const { identity } = useInternetIdentity();
  const deleteVideo = useDeleteVideo();
  const likeReel = useLikeReel();
  const shareReel = useShareReel();
  const addComment = useAddComment();
  const incrementViews = useIncrementViews();
  const { data: creatorProfile } = useGetUserProfile(video.creator);
  const { data: currentUserProfile } = useGetCallerUserProfile();
  const { data: reelStats } = useGetReelStats(video.id);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [liked, setLiked] = useState(() => localStorage.getItem(`liked_${video.id}`) === "true");
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const viewsTracked = useRef(false);

  const isOwner =
    identity?.getPrincipal().toString() === video.creator.toString();

  const avatarUrl = creatorProfile?.avatar?.getDirectURL();
  const creatorName = creatorProfile?.name || video.title;
  const likesCount = reelStats ? formatCount(reelStats.likes) : "0";
  const commentsCount = reelStats
    ? formatCount(BigInt(reelStats.comments.length))
    : "0";

  useEffect(() => {
    const raw = video.file.getDirectURL();
    if (!raw) return;

    let blobUrl: string | null = null;
    let cancelled = false;

    if (raw.startsWith('data:')) {
      // fetch() handles large base64 data URIs efficiently on mobile
      fetch(raw)
        .then(r => r.blob())
        .then(blob => {
          if (!cancelled) {
            blobUrl = URL.createObjectURL(blob);
            setVideoUrl(blobUrl);
          }
        })
        .catch(() => {
          if (!cancelled) setVideoUrl(raw);
        });
    } else {
      setVideoUrl(raw);
    }

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [video.file]);

  // Auto-play / pause based on visibility
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) return;
    if (autoPlay) {
      vid.muted = isMuted;
      vid
        .play()
        .then(() => {
          setIsPlaying(true);
          // Track view once per card
          if (!viewsTracked.current) {
            viewsTracked.current = true;
            incrementViews.mutate(video.id);
          }
        })
        .catch(() => setIsPlaying(false));
    } else {
      vid.pause();
      setIsPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, videoUrl, video.id]);

  // Keep mute state in sync
  useEffect(() => {
    const vid = videoRef.current;
    if (vid) vid.muted = isMuted;
  }, [isMuted]);

  const handleTap = (e: React.MouseEvent | React.KeyboardEvent) => {
    // Don't toggle when clicking on overlay buttons
    if ((e.target as HTMLElement).closest("[data-no-toggle]")) return;
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setShowPauseIcon(true);
      setTimeout(() => setShowPauseIcon(false), 800);
    } else {
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleSoundToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((m) => !m);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    likeReel.mutate(video.id);
    const newLikedState = !liked;
    setLiked(newLikedState);
    if (newLikedState) {
      localStorage.setItem(`liked_${video.id}`, "true");
    } else {
      localStorage.removeItem(`liked_${video.id}`);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    shareReel.mutate(video.id);
    const url = `${window.location.origin}/reels/${video.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: video.title, url }); } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url).catch(() => null);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUserProfile) return;
    addComment.mutate({
      reelId: video.id,
      comment: { author: currentUserProfile.name, text: commentText.trim() },
    });
    setCommentText("");
  };

  const handleCreatorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCreatorClick && !isOwner) onCreatorClick(video.creator);
  };

  return (
    <div
      data-ocid={`reel.${video.id}`}
      className="relative w-full h-full bg-black overflow-hidden cursor-pointer select-none rounded-2xl glass-panel"
      onClick={handleTap}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleTap(e);
        }
      }}
      // biome-ignore lint/a11y/useSemanticElements: full-screen tap target
      role="button"
      tabIndex={0}
      aria-label={`Reel: ${video.title}`}
    >
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
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background:
              "linear-gradient(160deg, #1a0533 0%, #0d1a3a 50%, #001a1a 100%)",
          }}
        >
          <div className="h-10 w-10 rounded-full border-4 border-white/40 border-t-transparent animate-spin" />
        </div>
      )}

      {/* ── Top gradient ── */}
      <div
        className="absolute top-0 inset-x-0 h-32 pointer-events-none z-10"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)",
        }}
      />

      {/* ── Bottom gradient ── */}
      <div
        className="absolute bottom-0 inset-x-0 h-72 pointer-events-none z-10"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
        }}
      />

      {/* ── Play overlay if paused ── */}
      {!isPlaying && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-md border border-white/20 shadow-lg">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white" style={{ marginLeft: "4px" }}>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* ── Pause flash icon (when tapped) ── */}
      <div
        className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none transition-opacity duration-300"
        style={{ opacity: showPauseIcon ? 1 : 0 }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.25)",
          }}
        >
          {isPlaying ? (
            /* pause bars */
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <title>Pause</title>
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <title>Play</title>
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </div>
      </div>

      {/* ── Sound toggle (top-right) ── */}
      <div className="absolute top-14 right-4 z-30" data-no-toggle="true">
        <button
          type="button"
          onClick={handleSoundToggle}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
          aria-label={isMuted ? "Unmute" : "Mute"}
          data-ocid="reel.sound_toggle"
        >
          {isMuted ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
            >
              <title>Unmute</title>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
            >
              <title>Mute</title>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Owner delete (top-left) ── */}
      {isOwner && (
        <div
          className="absolute top-14 left-4 z-30"
          data-no-toggle="true"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-white"
                style={{
                  background: "rgba(0,0,0,0.5)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
                data-ocid="reel.delete_button"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Reel?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  className="rounded-xl"
                  data-ocid="reel.cancel_button"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteVideo.mutate(video.id)}
                  className="rounded-xl bg-destructive text-destructive-foreground"
                  data-ocid="reel.confirm_button"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* ── Bottom-left: Creator info + caption ── */}
      <div
        className="absolute bottom-24 left-4 z-30"
        style={{ right: "76px" }}
        data-no-toggle="true"
      >
        {/* Username */}
        <button
          type="button"
          onClick={handleCreatorClick}
          className="flex items-center gap-2.5 mb-2"
          style={{ cursor: isOwner ? "default" : "pointer" }}
        >
          <Avatar
            className="h-9 w-9 shrink-0"
            style={{ border: "2px solid white" }}
          >
            {avatarUrl && <AvatarImage src={avatarUrl} alt={creatorName} />}
            <AvatarFallback
              className="text-xs font-bold"
              style={{
                background: "linear-gradient(135deg, #a855f7, #06b6d4)",
                color: "white",
              }}
            >
              {getInitials(creatorName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-white font-bold text-[15px] drop-shadow-sm">
            @{creatorName}
          </span>
        </button>

        {/* Caption */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCaptionExpanded((v) => !v);
          }}
          className="text-left"
        >
          <p
            className="text-white text-[14px] leading-snug drop-shadow-sm"
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              WebkitLineClamp: captionExpanded ? 99 : 2,
            }}
          >
            {video.title}
          </p>
          {!captionExpanded && (
            <span className="text-white/60 text-xs">more</span>
          )}
        </button>

        {/* Audio disc */}
        <div className="flex items-center gap-2 mt-2">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              animation: isPlaying ? "spin 3s linear infinite" : "none",
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
          </div>
          <span className="text-white/70 text-xs font-medium">
            Original audio
          </span>
        </div>
      </div>

      {/* ── Right side: Action buttons ── */}
      <div
        className="absolute right-3 z-30 flex flex-col items-center gap-5"
        style={{ bottom: "100px" }}
        data-no-toggle="true"
      >
        {/* Avatar with follow+ */}
        <div className="relative">
          <Avatar
            className="h-12 w-12"
            style={{
              border: "2.5px solid white",
              cursor: isOwner ? "default" : "pointer",
            }}
            onClick={handleCreatorClick}
          >
            {avatarUrl && <AvatarImage src={avatarUrl} alt={creatorName} />}
            <AvatarFallback
              className="text-xs font-bold"
              style={{
                background: "linear-gradient(135deg, #a855f7, #06b6d4)",
                color: "white",
              }}
            >
              {getInitials(creatorName)}
            </AvatarFallback>
          </Avatar>
          {!isOwner && (
            <div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: "#fe2c55" }}
            >
              <span
                className="text-white font-bold"
                style={{ fontSize: "14px", lineHeight: 1 }}
              >
                +
              </span>
            </div>
          )}
        </div>

        {/* Like */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={handleLike}
            className="w-12 h-12 flex items-center justify-center transition-transform active:scale-90"
            aria-label="Like"
            data-ocid="reel.like_button"
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill={liked ? "#fe2c55" : "none"}
              stroke={liked ? "#fe2c55" : "white"}
              strokeWidth="2"
            >
              <title>Like</title>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <span className="text-white text-xs font-semibold">{likesCount}</span>
        </div>

        {/* Comment */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
            className="w-12 h-12 flex items-center justify-center transition-transform active:scale-90"
            aria-label="Comment"
            data-ocid="reel.comment_button"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <title>Comment</title>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <span className="text-white text-xs font-semibold">{commentsCount}</span>
        </div>

        {/* Share */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={handleShare}
            className="w-12 h-12 flex items-center justify-center transition-transform active:scale-90"
            aria-label="Share"
            data-ocid="reel.share_button"
          >
            <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <title>Share</title>
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
          <span className="text-white text-xs font-semibold">Share</span>
        </div>

        {/* More */}
        <button
          type="button"
          className="w-12 h-12 flex items-center justify-center"
          aria-label="More options"
          data-ocid="reel.more_button"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <title>More</title>
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      {/* ── Comment Sheet ── */}
      {showComments && (
        <div
          className="absolute inset-0 z-50 flex flex-col justify-end"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowComments(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setShowComments(false); }}
          data-no-toggle="true"
        >
          <div
            className="rounded-t-3xl flex flex-col"
            style={{ background: "#111", maxHeight: "70vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-800">
              <span className="text-white font-bold text-base">
                Comments ({reelStats?.comments.length ?? 0})
              </span>
              <button
                type="button"
                onClick={() => setShowComments(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4" style={{ minHeight: 0 }}>
              {reelStats && reelStats.comments.length > 0 ? (
                reelStats.comments.map((c, i) => (
                  <div key={`${c.author}-${i}`} className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {c.author.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{c.author}</p>
                      <p className="text-[13px] text-zinc-300 mt-0.5 leading-relaxed">{c.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-zinc-500">
                  <p className="text-sm">No comments yet. Be the first!</p>
                </div>
              )}
            </div>

            {/* Comment input */}
            <form
              onSubmit={handleAddComment}
              className="flex items-center gap-3 px-4 py-3 border-t border-zinc-800"
              style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
            >
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 bg-zinc-800 text-white text-sm rounded-2xl px-4 py-2.5 outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-zinc-600"
                data-ocid="reel.comment_input"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || addComment.isPending}
                className="w-9 h-9 flex items-center justify-center rounded-full text-white disabled:opacity-40 transition-opacity"
                style={{ background: "linear-gradient(135deg, #a855f7, #2563eb)" }}
                data-ocid="reel.comment_submit"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
