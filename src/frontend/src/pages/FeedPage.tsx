import type { Principal } from "@icp-sdk/core/principal";
import { Bell, Sparkles, Upload, Video } from "lucide-react";
import { useState } from "react";
import FeedVideoCard from "../components/FeedVideoCard";
import StoryCard from "../components/StoryCard";
import StoryViewer from "../components/StoryViewer";
import UploadStoryDialog from "../components/UploadStoryDialog";
import UploadVideoDialog from "../components/UploadVideoDialog";
import { Skeleton } from "../components/ui/skeleton";
import { useGetAllActiveStories, useGetAllVideos } from "../hooks/useQueries";
import UserProfilePage from "./UserProfilePage";
import { Strings } from "../Strings";

type View = "feed" | "profile";

function StorySkeleton() {
  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0">
      <Skeleton className="h-[66px] w-[66px] rounded-full bg-zinc-800" />
      <Skeleton className="h-2 w-12 rounded bg-zinc-800" />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="w-full animate-pulse border-b border-zinc-900">
      <div className="flex items-center gap-3 px-3 py-3">
        <Skeleton className="h-9 w-9 rounded-full shrink-0 bg-zinc-800" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-28 bg-zinc-800" />
          <Skeleton className="h-2.5 w-16 bg-zinc-800" />
        </div>
      </div>
      <Skeleton className="w-full aspect-[4/5] bg-zinc-800" />
      <div className="px-3 py-3 space-y-2">
        <div className="flex gap-4">
          <Skeleton className="h-7 w-7 rounded-full bg-zinc-800" />
          <Skeleton className="h-7 w-7 rounded-full bg-zinc-800" />
          <Skeleton className="h-7 w-7 rounded-full bg-zinc-800" />
        </div>
        <Skeleton className="h-3 w-24 bg-zinc-800" />
        <Skeleton className="h-3 w-full bg-zinc-800" />
      </div>
    </div>
  );
}

export default function FeedPage() {
  const { data: videos, isLoading: videosLoading } = useGetAllVideos();
  const { data: stories, isLoading: storiesLoading } = useGetAllActiveStories();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [currentView, setCurrentView] = useState<View>("feed");
  const [viewingProfile, setViewingProfile] = useState<Principal | null>(null);

  const groupedStories = stories?.reduce(
    (acc, story) => {
      const creatorId = story.creator.toString();
      if (!acc[creatorId]) acc[creatorId] = [];
      acc[creatorId].push(story);
      return acc;
    },
    {} as Record<string, typeof stories>,
  );
  const storyGroups = groupedStories ? Object.values(groupedStories) : [];
  const hasRealStories = storyGroups.length > 0;

  const handleStoryClick = (groupIndex: number) => {
    setSelectedStoryIndex(groupIndex);
    setViewerOpen(true);
  };

  const handleCreatorClick = (creatorPrincipal: Principal) => {
    setViewingProfile(creatorPrincipal);
    setCurrentView("profile");
  };

  if (currentView === "profile" && viewingProfile) {
    return (
      <UserProfilePage
        userPrincipal={viewingProfile}
        onBack={() => {
          setViewingProfile(null);
          setCurrentView("feed");
        }}
      />
    );
  }

  return (
    <div className="w-full min-h-[100dvh] bg-background" data-ocid="feed.page">
      {/* ═══ PREMIUM GOLD BANNER ═══ */}
      <div className="banner-container">
        <div className="banner-bg" />
        <div className="banner-stars" />
        <div className="banner-orb banner-orb-1" />
        <div className="banner-orb banner-orb-2" />
        <div className="banner-orb banner-orb-3" />
        <div className="banner-grid" />
        <div className="banner-content">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 neon-glow-gold animate-pulse-glow" style={{
              background: "linear-gradient(135deg, oklch(0.80 0.17 70 / 0.25), oklch(0.65 0.20 45 / 0.25))",
              border: "1.5px solid oklch(0.80 0.17 70 / 0.35)",
            }}>
              <img src="/assets/generated/socionet-logo-transparent.dim_200x200.png" alt={Strings.welcome.logoAlt} className="w-7 h-7 md:w-9 md:h-9" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-black tracking-tight gradient-text" style={{ letterSpacing: '-0.3px', margin: 0 }}>
                {Strings.welcome.logoAlt}
              </h1>
              <p className="text-[10px] md:text-sm font-semibold tracking-wide" style={{ color: "oklch(0.72 0.10 70)", margin: 0 }}>
                {Strings.feed.premiumNetwork}
              </p>
            </div>
          </div>
        </div>
        <div className="banner-overlay" />
      </div>

      {/* Premium FIXED header — only title+actions, no stories */}
      <header className="md:hidden fixed left-0 right-0 z-30 w-full glass-panel border-x-0 border-t-0 rounded-none" style={{
        top: "52px",
        background: "rgba(12, 9, 3, 0.97)",
        borderBottom: "1px solid rgba(212, 175, 55, 0.15)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,175,55,0.08)",
      }}>
        <div className="flex items-center justify-between px-4 h-14">
          <span className="text-xl font-bold tracking-tight select-none gradient-text" style={{ letterSpacing: '-0.3px' }}>{Strings.feed.title}</span>
          <div className="flex items-center gap-2">
            <UploadVideoDialog trigger={
              <button type="button" aria-label={Strings.feed.uploadVideo} data-ocid="feed.upload_button"
                className="h-9 w-9 rounded-full flex items-center justify-center text-white btn-gold border-0 active:scale-90 transition-all">
                <Upload className="h-4 w-4" style={{ color: "#1a1000" }} />
              </button>
            } />
            <button type="button" aria-label={Strings.feed.notifications} data-ocid="feed.notifications_button"
              className="h-9 w-9 rounded-full flex items-center justify-center glass-button active:scale-90 transition-all">
              <Bell className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </header>
      {/* Desktop sticky header */}
      <header className="hidden md:block sticky top-0 z-30 w-full glass-panel border-x-0 border-t-0 rounded-none md:rounded-[24px] md:mx-auto md:max-w-2xl md:mt-[-24px]" style={{
        background: "rgba(12, 9, 3, 0.95)",
        borderBottom: "1px solid rgba(212, 175, 55, 0.15)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,175,55,0.08)",
      }}>
        <div className="flex items-center justify-between px-6 h-16">
          <span className="text-xl font-bold tracking-tight select-none gradient-text" style={{ letterSpacing: '-0.3px' }}>{Strings.feed.title}</span>
          <div className="flex items-center gap-2">
            <UploadVideoDialog trigger={
              <button type="button" aria-label={Strings.feed.uploadVideo} data-ocid="feed.upload_button_desktop"
                className="h-9 w-9 rounded-full flex items-center justify-center text-white btn-gold border-0 active:scale-90 transition-all">
                <Upload className="h-4 w-4" style={{ color: "#1a1000" }} />
              </button>
            } />
            <button type="button" aria-label={Strings.feed.notifications}
              className="h-9 w-9 rounded-full flex items-center justify-center glass-button active:scale-90 transition-all">
              <Bell className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Stories strip — scrolls with content (NOT fixed) */}
      <div
        className="flex gap-3 px-4 md:px-6 py-4 overflow-x-auto hide-scrollbar w-full md:max-w-2xl md:mx-auto"
        style={{ borderBottom: "1px solid rgba(212, 175, 55, 0.08)", paddingTop: "calc(56px + 16px)" }}
      >
        {/* Add Story button */}
        <UploadStoryDialog
          trigger={
            <button
              type="button"
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer select-none active:scale-95 transition-transform"
            >
              <div
                className="relative w-[64px] h-[64px] rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, oklch(0.88 0.12 85), oklch(0.80 0.17 70), oklch(0.65 0.20 45))",
                  padding: "2px",
                }}
              >
                <div className="w-full h-full rounded-full bg-[#0a0702] flex items-center justify-center">
                  <span className="text-2xl font-light text-[#d4af37] leading-none">+</span>
                </div>
              </div>
              <span className="text-[11px] font-medium text-[#d4af37] truncate max-w-[70px] text-center leading-tight">
                {Strings.feed.yourStory}
              </span>
            </button>
          }
        />

        {/* Real stories */}
        {storiesLoading
          ? [1, 2, 3, 4].map((i) => <StorySkeleton key={i} />)
          : hasRealStories
            ? storyGroups.map((group, index) => (
                <div key={group[0].creator.toString()} className="shrink-0">
                  <StoryCard
                    story={group[0]}
                    onClick={() => handleStoryClick(index)}
                  />
                </div>
              ))
            : null}
      </div>

      {/* Feed posts */}
      <div className="w-full md:max-w-2xl md:mx-auto mt-2 md:mt-6 px-0 md:px-4">
        {videosLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : videos && videos.length > 0 ? (
          <div className="flex flex-col gap-2 md:gap-6">
            {videos.map((video, idx) => (
              <FeedVideoCard
                key={video.id}
                video={video}
                onCreatorClick={handleCreatorClick}
                index={idx}
              />
            ))}
          </div>
        ) : (
          /* Premium empty state */
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center animate-scale-in">
            {/* Glowing icon */}
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 neon-glow-gold animate-pulse-glow-purple"
              style={{
                background: "linear-gradient(135deg, oklch(0.80 0.17 70 / 0.15), oklch(0.65 0.20 45 / 0.15))",
                border: "1.5px solid oklch(0.80 0.17 70 / 0.3)",
              }}
            >
              <Sparkles className="h-10 w-10" style={{ color: "oklch(0.88 0.12 85)" }} />
            </div>
            <h2 className="text-foreground text-xl font-bold mb-2 tracking-tight">{Strings.feed.emptyTitle}</h2>
            <p className="text-muted-foreground text-[13px] leading-relaxed mb-8 max-w-[260px]">
              {Strings.feed.emptyDesc}
            </p>
            <div className="flex flex-col gap-3 w-full max-w-[240px]">
              <UploadVideoDialog
                trigger={
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-[#1a1000] font-bold text-[14px] transition-all active:scale-[0.97] btn-gold border-0"
                  >
                    <Video className="h-[18px] w-[18px] relative z-10" />
                    <span className="relative z-10">{Strings.feed.btnUpload}</span>
                  </button>
                }
              />
              <UploadStoryDialog
                trigger={
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[#d4af37] font-medium text-[13px] transition-all active:scale-[0.97] glass-button border border-[#d4af37]/20"
                  >
                    {Strings.feed.btnAddStory}
                  </button>
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Story Viewer */}
      {hasRealStories && (
        <StoryViewer
          stories={storyGroups[selectedStoryIndex] || []}
          initialIndex={0}
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
}
