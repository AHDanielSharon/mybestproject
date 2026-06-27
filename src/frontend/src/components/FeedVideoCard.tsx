import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import type { Principal } from "@icp-sdk/core/principal";
import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Play,
  Send,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Video } from "../backend";
import {
  useAddComment,
  useDeleteVideo,
  useDislikeReel,
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

interface FeedVideoCardProps {
  video: Video;
  onCreatorClick?: (creatorPrincipal: Principal) => void;
  index?: number;
}

export default function FeedVideoCard({
  video,
  onCreatorClick,
  index = 0,
}: FeedVideoCardProps) {
  const { identity } = useInternetIdentity();
  const deleteVideo = useDeleteVideo();
  const { data: creatorProfile } = useGetUserProfile(video.creator);
  const { data: currentUserProfile } = useGetCallerUserProfile();
  const { data: reelStats } = useGetReelStats(video.id);
  const likeReel = useLikeReel();
  const dislikeReel = useDislikeReel();
  const addComment = useAddComment();
  const shareReel = useShareReel();
  const incrementViews = useIncrementViews();

  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [commentText, setCommentText] = useState("");
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasLiked, setHasLiked] = useState(() => localStorage.getItem(`liked_${video.id}`) === "true");
  const [isSaved, setIsSaved] = useState(() => localStorage.getItem(`saved_${video.id}`) === "true");
  const [showComments, setShowComments] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);
  const lastTapRef = useRef(0);

  const isOwner =
    identity?.getPrincipal().toString() === video.creator.toString();

  useEffect(() => {
    const el = cardRef.current;
    const vid = videoRef.current;
    if (!el || !vid) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true); // for the fade-in animation
          if (entry.intersectionRatio >= 0.6) {
            vid.muted = isMuted;
            vid.play().catch(() => setIsPlaying(false));
          } else {
            vid.pause();
          }
        } else {
          vid.pause();
        }
      },
      { threshold: [0, 0.06, 0.6] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [isMuted]);

  useEffect(() => {
    setVideoUrl(video.file.getDirectURL());
  }, [video.file]);

  useEffect(() => {
    if (isPlaying && !hasTrackedView) {
      incrementViews.mutate(video.id);
      setHasTrackedView(true);
    }
  }, [isPlaying, hasTrackedView, video.id, incrementViews]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch((e) => console.error("Play failed:", e));
    }
    setIsPlaying(!isPlaying);
  };

  const handleMediaTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap = like
      if (!hasLiked) handleLike();
      setDoubleTapHeart(true);
      setTimeout(() => setDoubleTapHeart(false), 800);
    } else {
      togglePlay();
    }
    lastTapRef.current = now;
  };

  const handleLike = () => {
    likeReel.mutate(video.id);
    const newLikedState = !hasLiked;
    setHasLiked(newLikedState);
    if (newLikedState) {
      setHeartAnim(true);
      setTimeout(() => setHeartAnim(false), 300);
      localStorage.setItem(`liked_${video.id}`, "true");
    } else {
      localStorage.removeItem(`liked_${video.id}`);
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

  const handleShare = async () => {
    shareReel.mutate(video.id);
    const shareUrl = `${window.location.origin}/feed/${video.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title, url: shareUrl });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          await navigator.clipboard.writeText(shareUrl);
          toast.success("Link copied!");
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl).catch(() => null);
      toast.success("Link copied!");
    }
  };

  const formatDate = (ts: bigint) => {
    const date = new Date(Number(ts) / 1_000_000);
    const diffH = Math.floor((Date.now() - date.getTime()) / 3_600_000);
    const diffD = Math.floor(diffH / 24);
    if (diffH < 1) return "JUST NOW";
    if (diffH < 24) return `${diffH} HOURS AGO`;
    if (diffD < 7) return `${diffD} DAYS AGO`;
    return date
      .toLocaleDateString("en-US", { month: "short", day: "numeric" })
      .toUpperCase();
  };

  const formatCount = (n: bigint) => {
    const v = Number(n);
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toString();
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
  const likesCount = reelStats ? formatCount(reelStats.likes) : "0";
  const commentsCount = reelStats ? reelStats.comments.length : 0;

  const captionText = video.description || "";
  const captionLong = captionText.length > 100;

  return (
    <>
      <article
        ref={cardRef}
        data-ocid={`feed.item.${index + 1}`}
        style={{ transitionDelay: `${Math.min(index * 60, 300)}ms` }}
        className={`w-full bg-card border-b border-zinc-800/50 transition-all duration-500 card-premium ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* 1. Header row */}
        <div className="flex items-center justify-between px-4 py-3.5">
          <button
            type="button"
            onClick={() => !isOwner && onCreatorClick?.(video.creator)}
            disabled={isOwner}
            data-ocid="feed.creator_button"
            className="flex items-center gap-2.5 min-w-0 hover:opacity-70 transition-opacity"
          >
            {/* Avatar with gradient ring */}
            <div
              className="w-9 h-9 rounded-full shrink-0 card-premium"
              style={{
                background:
                  "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)",
                padding: "2px",
              }}
            >
              <div className="w-full h-full rounded-full bg-background overflow-hidden">
                <Avatar className="h-full w-full">
                  {avatarUrl && (
                    <AvatarImage src={avatarUrl} alt={creatorName} />
                  )}
                  <AvatarFallback className="bg-zinc-800 text-white text-[11px] font-bold">
                    {getInitials(creatorName)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            <span className="font-semibold text-[14px] text-white truncate">
              {creatorName}
            </span>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            {isOwner ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    data-ocid="feed.delete_button"
                    aria-label="Delete"
                    className="h-9 w-9 flex items-center justify-center text-white/50 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent
                  className="bg-zinc-900 border-zinc-700"
                  data-ocid="feed.dialog"
                >
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">
                      Delete Post?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400">
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      data-ocid="feed.cancel_button"
                      className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                    >
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteVideo.mutate(video.id)}
                      data-ocid="feed.confirm_button"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <button
                type="button"
                aria-label="More options"
                className="h-9 w-9 flex items-center justify-center text-white/60 hover:text-white"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* 2. Media area – full width, 4:5 portrait */}
        <div className="relative w-full bg-zinc-950">
          {videoUrl ? (
            <button
              type="button"
              onClick={handleMediaTap}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="relative w-full block focus:outline-none"
            >
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full aspect-[4/5] object-cover"
                loop
                playsInline
                muted={isMuted}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {/* Play overlay */}
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-[52px] w-[52px] rounded-full flex items-center justify-center bg-black/50 backdrop-blur-sm border border-white/20">
                    <Play className="h-6 w-6 text-white ml-0.5" fill="white" />
                  </div>
                </div>
              )}

              {/* Double-tap heart */}
              {doubleTapHeart && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Heart
                    className="h-[120px] w-[120px] text-white animate-ping"
                    fill="white"
                    style={{
                      animationDuration: "600ms",
                      animationIterationCount: 1,
                    }}
                  />
                </div>
              )}

              {/* Mute toggle */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (videoRef.current) {
                    videoRef.current.muted = !isMuted;
                    setIsMuted(!isMuted);
                  }
                }}
                data-ocid="feed.mute_toggle"
                aria-label={isMuted ? "Unmute" : "Mute"}
                className="absolute bottom-3 right-3 h-9 w-9 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm border border-white/20 text-white"
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
            </button>
          ) : (
            <div className="w-full aspect-[4/5] flex items-center justify-center bg-zinc-900">
              <div className="h-8 w-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            </div>
          )}
        </div>

        {/* 3. Action row */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <div className="flex items-center gap-0">
            {/* Like */}
            <button
              type="button"
              onClick={handleLike}
              disabled={likeReel.isPending}
              aria-label="Like"
              data-ocid="feed.like_button"
              className="h-11 w-11 flex items-center justify-center transition-transform active:scale-90"
            >
              <Heart
                className={`h-7 w-7 transition-all duration-150 ${
                  heartAnim ? "scale-125" : "scale-100"
                }`}
                fill={hasLiked ? "#ef4444" : "none"}
                stroke={hasLiked ? "#ef4444" : "white"}
                strokeWidth={1.75}
              />
            </button>

            {/* Comment */}
            <Dialog open={showComments} onOpenChange={setShowComments}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  aria-label="Comments"
                  data-ocid="feed.comment_button"
                  className="h-11 w-11 flex items-center justify-center"
                >
                  <MessageCircle
                    className="h-7 w-7 text-white"
                    strokeWidth={1.75}
                  />
                </button>
              </DialogTrigger>
              <DialogContent
                className="w-[96vw] max-w-md bg-zinc-900 border-zinc-700 rounded-2xl"
                data-ocid="feed.dialog"
              >
                <DialogHeader>
                  <DialogTitle className="text-white">
                    Comments ({commentsCount})
                  </DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-60 pr-2">
                  {reelStats && reelStats.comments.length > 0 ? (
                    <div className="space-y-3">
                      {reelStats.comments.map((comment, i) => (
                        <div
                          key={`${comment.author}-${i}`}
                          className="flex gap-2.5 items-start"
                        >
                          <div className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {comment.author.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">
                              {comment.author}
                            </p>
                            <p className="text-[13px] text-zinc-300 mt-0.5">
                              {comment.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-500">
                      <MessageCircle className="h-8 w-8 opacity-30" />
                      <p className="text-sm">No comments yet.</p>
                    </div>
                  )}
                </ScrollArea>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Add a comment…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    data-ocid="feed.comment_input"
                    className="flex-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 rounded-xl focus:border-zinc-500"
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || addComment.isPending}
                    data-ocid="feed.submit_button"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4"
                  >
                    Post
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Share */}
            <button
              type="button"
              aria-label="Share"
              onClick={handleShare}
              data-ocid="feed.share_button"
              className="h-11 w-11 flex items-center justify-center"
            >
              <Send className="h-7 w-7 text-white" strokeWidth={1.75} />
            </button>
          </div>

          {/* Save */}
          <button
            type="button"
            onClick={() => {
              const newState = !isSaved;
              setIsSaved(newState);
              if (newState) {
                localStorage.setItem(`saved_${video.id}`, "true");
              } else {
                localStorage.removeItem(`saved_${video.id}`);
              }
            }}
            aria-label="Save"
            data-ocid="feed.save_button"
            className="h-11 w-11 flex items-center justify-center transition-transform active:scale-90"
          >
            <Bookmark
              className="h-7 w-7"
              fill={isSaved ? "white" : "none"}
              stroke="white"
              strokeWidth={1.75}
            />
          </button>
        </div>

        {/* 4. Likes count */}
        <p className="px-3 text-[14px] font-semibold text-white">
          {likesCount} likes
        </p>

        {/* 5. Caption */}
        <div className="px-3 mt-1 pb-1">
          <p className="text-[14px] text-white leading-snug">
            <span className="font-semibold">{creatorName}</span>{" "}
            <span className="text-zinc-300">
              {captionLong && !captionExpanded
                ? `${captionText.slice(0, 100)}…`
                : captionText}
            </span>
            {captionLong && (
              <button
                type="button"
                onClick={() => setCaptionExpanded((p) => !p)}
                className="ml-1 text-zinc-500 text-[13px]"
              >
                {captionExpanded ? "less" : "more"}
              </button>
            )}
          </p>
        </div>

        {/* 6. Comments link */}
        {commentsCount > 0 && (
          <button
            type="button"
            onClick={() => setShowComments(true)}
            data-ocid="feed.view_comments_button"
            className="px-3 pb-1 text-[13px] text-zinc-500 block text-left"
          >
            View all {commentsCount} comments
          </button>
        )}

        {/* 7. Timestamp */}
        <p className="px-3 pb-4 text-[11px] text-zinc-600 uppercase tracking-wide">
          {formatDate(video.uploadTime)}
        </p>
      </article>
    </>
  );
}
