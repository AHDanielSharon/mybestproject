import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Film,
  Grid3X3,
  LogOut,
  Play,
  Settings,
  Share2,
} from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import EditProfileDialog from "../components/EditProfileDialog";
import ReelCard from "../components/ReelCard";
import StoryCard from "../components/StoryCard";
import StoryViewer from "../components/StoryViewer";
import UploadStoryDialog from "../components/UploadStoryDialog";
import VideoCard from "../components/VideoCard";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Skeleton } from "../components/ui/skeleton";
import {
  useGetActiveStoriesByUser,
  useGetAllVideos,
  useGetCallerUserProfile,
  useUpdateProfileImage,
} from "../hooks/useQueries";
import { ExternalBlob } from "../backend";

type ContentTab = "posts" | "reels" | "tagged";
type VideoView = "grid" | "fullscreen";

export default function ProfilePage() {
  const { clear, identity } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading } = useGetCallerUserProfile();
  const { data: allVideos, isLoading: videosLoading } = useGetAllVideos();
  const principal = identity?.getPrincipal();
  const { data: userStories } = useGetActiveStoriesByUser(
    principal || (null as unknown as Parameters<typeof useGetActiveStoriesByUser>[0]),
  );
  const queryClient = useQueryClient();
  const updateProfileImage = useUpdateProfileImage();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<ContentTab>("posts");
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [videoView, setVideoView] = useState<VideoView>("grid");
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);

  const userVideos = allVideos?.filter(
    (video) => principal && video.creator.toString() === principal.toString(),
  );

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleStoryClick = (index: number) => {
    setSelectedStoryIndex(index);
    setViewerOpen(true);
  };

  const handleVideoThumbClick = (id: string) => {
    setActiveVideoId(id);
    setVideoView("fullscreen");
  };

  const handleReelThumbClick = (index: number) => {
    setActiveReelIndex(index);
    setVideoView("grid"); // reuse videoView state to show reel player
    setActiveTab("reels");
  };

  const handleShareProfile = () => {
    if (navigator.share) {
      navigator.share({ title: userProfile?.name ?? "Profile", url: window.location.href });
    } else {
      navigator.clipboard?.writeText(window.location.href);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    const arrayBuffer = await file.arrayBuffer();
    const blob = ExternalBlob.fromBytes(new Uint8Array(arrayBuffer));
    (blob as any).__mimeType = file.type;
    updateProfileImage.mutate(blob);
  };

  if (!principal) return null;

  const avatarUrl = userProfile?.avatar?.getDirectURL();
  const selectedVideo = userVideos?.find((v) => v.id === activeVideoId) ?? null;

  // ── Fullscreen video player ─────────────────────────────────────────────
  if (videoView === "fullscreen" && selectedVideo) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setVideoView("grid")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl glass-btn text-foreground text-sm font-medium min-h-[44px]"
          >
            ← Back
          </button>
          <span className="text-sm font-semibold text-white truncate max-w-[55vw]">
            {selectedVideo.title}
          </span>
          <div className="w-16" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <VideoCard video={selectedVideo} autoPlay />
        </div>
      </div>
    );
  }

  // ── Fullscreen reel player ──────────────────────────────────────────────
  if (activeTab === "reels" && userVideos && userVideos.length > 0 && videoView !== "grid") {
    const currentReel = userVideos[activeReelIndex];
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-md absolute top-0 left-0 right-0 z-10">
          <button
            type="button"
            onClick={() => setVideoView("grid")}
            className="px-3 py-2 rounded-xl bg-black/40 text-white text-sm font-medium min-h-[44px]"
          >
            ← Back
          </button>
          <span className="text-white text-sm font-semibold">
            {activeReelIndex + 1} / {userVideos.length}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={activeReelIndex === 0}
              onClick={() => setActiveReelIndex((i) => i - 1)}
              className="px-3 py-1 rounded-lg bg-white/20 text-white text-sm disabled:opacity-30"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={activeReelIndex === userVideos.length - 1}
              onClick={() => setActiveReelIndex((i) => i + 1)}
              className="px-3 py-1 rounded-lg bg-white/20 text-white text-sm disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
        <div className="flex-1">
          {currentReel && <ReelCard video={currentReel} autoPlay />}
        </div>
      </div>
    );
  }

  // ── Profile page ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-nav" data-ocid="profile.page">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-2.5 bg-background/90 backdrop-blur-xl border-b border-border/20">
        <span className="text-base font-bold text-foreground truncate">
          {profileLoading ? "Profile" : (userProfile?.name ?? "Profile")}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Settings"
            className="h-9 w-9 rounded-full flex items-center justify-center text-foreground hover:bg-muted/60 transition-colors duration-200"
          >
            <Settings className="h-[22px] w-[22px]" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sign out"
            className="h-9 w-9 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors duration-200"
          >
            <LogOut className="h-[22px] w-[22px]" />
          </button>
        </div>
      </header>

      {/* Avatar + Info */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-start gap-5">
          {/* Avatar — clickable to change photo */}
          <div className="relative flex-shrink-0">
            {profileLoading ? (
              <Skeleton className="h-24 w-24 rounded-full md:h-[120px] md:w-[120px]" />
            ) : (
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="relative group"
                aria-label="Change profile photo"
              >
                <div className="p-[3px] rounded-full bg-gradient-to-tr from-accent via-primary to-secondary shadow-lg">
                  <div className="p-[2px] rounded-full bg-background">
                    <Avatar className="h-[86px] w-[86px] md:h-[116px] md:w-[116px]" data-ocid="profile.avatar">
                      {avatarUrl ? <AvatarImage src={avatarUrl} alt={userProfile?.name} /> : null}
                      <AvatarFallback className="bg-primary/20 text-primary text-3xl font-bold">
                        {userProfile ? getInitials(userProfile.name) : "?"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                {/* Camera overlay on hover */}
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-7 w-7 text-white" />
                </div>
                {/* Loading spinner */}
                {updateProfileImage.isPending && (
                  <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                    <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </button>
            )}
            {/* Story upload button */}
            <div className="absolute -bottom-1 -right-1">
              <UploadStoryDialog />
            </div>
          </div>

          {/* Hidden avatar file input */}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />

          {/* Stats — desktop */}
          <div className="hidden md:flex flex-1 justify-around pt-4">
            <StatItem value={userVideos?.length ?? 0} label="Posts" />
            <StatItem value={userStories?.length ?? 0} label="Stories" />
            <StatItem value={0} label="Followers" />
            <StatItem value={0} label="Following" />
          </div>
        </div>

        {/* Name + bio */}
        <div className="mt-3">
          {profileLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-52" />
            </div>
          ) : userProfile ? (
            <>
              <h1 className="text-[15px] font-bold text-foreground leading-tight" data-ocid="profile.username">
                {userProfile.name}
              </h1>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(principal.toString());
                  const btn = document.getElementById('id-copy-toast');
                  if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = `ID: ${principal.toString()}`; }, 1500); }
                }}
                className="mt-1 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors"
                style={{
                  background: "oklch(0.80 0.17 70 / 0.10)",
                  color: "oklch(0.88 0.12 85)",
                  border: "1px solid oklch(0.80 0.17 70 / 0.25)",
                }}
                title="Click to copy your ID"
              >
                <span id="id-copy-toast">ID: {principal.toString()}</span>
              </button>
              {userProfile.bio && (
                <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
                  {userProfile.bio}
                </p>
              )}
            </>
          ) : null}
        </div>

        {/* Action buttons */}
        {!profileLoading && userProfile && (
          <div className="flex gap-2 mt-3">
            <EditProfileDialog currentProfile={userProfile} />
            <button
              type="button"
              onClick={handleShareProfile}
              aria-label="Share profile"
              className="flex-1 flex items-center justify-center gap-1.5 h-[34px] rounded-lg bg-muted/60 border border-border/40 text-[13px] font-semibold text-foreground transition-all duration-200 active:scale-95 hover:bg-muted"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share Profile
            </button>
          </div>
        )}

        {/* Stats — mobile */}
        <div className="flex md:hidden mt-4 border-t border-b border-border/20 py-3" data-ocid="profile.stats">
          <StatItem value={userVideos?.length ?? 0} label="Posts" clickable />
          <StatItem value={userStories?.length ?? 0} label="Stories" clickable />
          <StatItem value={0} label="Followers" clickable />
          <StatItem value={0} label="Following" clickable />
        </div>
      </div>

      {/* Story highlights */}
      {userStories && userStories.length > 0 && (
        <section className="px-3 pb-4 border-b border-border/20">
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-1">
            {userStories.map((story, index) => (
              <button
                key={story.id}
                type="button"
                onClick={() => handleStoryClick(index)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 min-w-[64px]"
              >
                <StoryCard story={story} onClick={() => handleStoryClick(index)} />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border/30" role="tablist" data-ocid="profile.tabs">
        {(
          [
            { id: "posts", icon: <Grid3X3 className="h-[22px] w-[22px]" />, label: "Posts" },
            { id: "reels", icon: <Film className="h-[22px] w-[22px]" />, label: "Reels" },
            { id: "tagged", icon: <Camera className="h-[22px] w-[22px]" />, label: "Stories" },
          ] as { id: ContentTab; icon: React.ReactNode; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            data-ocid={`profile.tab.${tab.id}`}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all duration-200 border-b-2 ${
              activeTab === tab.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            <span className="text-[10px] font-semibold">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <section data-ocid="profile.videos_section">
        {/* POSTS TAB */}
        {activeTab === "posts" && (
          videosLoading ? (
            <div className="grid grid-cols-3 gap-[1.5px]">
              {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="aspect-square" />)}
            </div>
          ) : userVideos && userVideos.length > 0 ? (
            <div className="grid grid-cols-3 gap-[1.5px]">
              {userVideos.map((video, idx) => (
                <VideoThumbnail
                  key={video.id}
                  video={video}
                  index={idx + 1}
                  onClick={() => handleVideoThumbClick(video.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState icon={<Film className="h-7 w-7 text-muted-foreground" />} title="Share Photos and Videos" desc="When you share photos and videos, they'll appear here." />
          )
        )}

        {/* REELS TAB */}
        {activeTab === "reels" && (
          userVideos && userVideos.length > 0 ? (
            <div className="grid grid-cols-3 gap-[1.5px]">
              {userVideos.map((video, idx) => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => {
                    setActiveReelIndex(idx);
                    setVideoView("fullscreen" as any);
                  }}
                  className="relative aspect-square overflow-hidden bg-card group transition-all duration-200 active:scale-95"
                >
                  <video
                    src={video.file.getDirectURL()}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-200" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="h-9 w-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
                      <Play className="h-4 w-4 text-white" fill="white" />
                    </div>
                  </div>
                  {/* Reel icon badge */}
                  <div className="absolute top-2 right-2">
                    <Film className="h-4 w-4 text-white drop-shadow" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Play className="h-7 w-7 text-muted-foreground" />} title="No Reels Yet" desc="Upload a video to see your reels here." />
          )
        )}

        {/* TAGGED / STORIES TAB */}
        {activeTab === "tagged" && (
          userStories && userStories.length > 0 ? (
            <div className="grid grid-cols-3 gap-[1.5px]">
              {userStories.map((story, idx) => (
                <button
                  key={story.id}
                  type="button"
                  onClick={() => handleStoryClick(idx)}
                  className="relative aspect-square overflow-hidden bg-card group transition-all duration-200 active:scale-95"
                >
                  <video
                    src={story.file.getDirectURL()}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="h-9 w-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
                      <Play className="h-4 w-4 text-white" fill="white" />
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Camera className="h-4 w-4 text-white drop-shadow" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Camera className="h-7 w-7 text-muted-foreground" />} title="No Stories Yet" desc="Add a story to share moments with your followers." />
          )
        )}
      </section>

      {/* Story Viewer */}
      {userStories && userStories.length > 0 && (
        <StoryViewer
          stories={userStories}
          initialIndex={selectedStoryIndex}
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatItem({ value, label, clickable }: { value: number; label: string; clickable?: boolean }) {
  return (
    <button
      type="button"
      className={`flex-1 flex flex-col items-center gap-0.5 py-1 ${clickable ? "active:opacity-70 transition-opacity" : "cursor-default"}`}
    >
      <span className="text-[17px] font-bold text-foreground leading-tight">{value.toLocaleString()}</span>
      <span className="text-[13px] text-muted-foreground">{label}</span>
    </button>
  );
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="h-16 w-16 rounded-full border-2 border-dashed border-border flex items-center justify-center mb-4">
        {icon}
      </div>
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 text-center">{desc}</p>
    </div>
  );
}

function VideoThumbnail({
  video,
  index,
  onClick,
}: {
  video: { id: string; file: { getDirectURL: () => string }; title: string };
  index: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-ocid={`profile.video_thumb.${index}`}
      className="relative aspect-square overflow-hidden bg-card group transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <video
        src={video.file.getDirectURL()}
        className="w-full h-full object-cover"
        muted
        playsInline
        preload="metadata"
      />
      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-200" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="h-9 w-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
          <Play className="h-4 w-4 text-white" fill="white" />
        </div>
      </div>
    </button>
  );
}
