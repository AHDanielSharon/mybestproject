import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import type { Principal } from "@icp-sdk/core/principal";
import {
  ArrowLeft,
  Camera,
  Check,
  Film,
  Grid3X3,
  MessageCircle,
  Play,
  UserCheck,
  UserPlus,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { FriendRequestStatus } from "../backend";
import StoryCard from "../components/StoryCard";
import StoryViewer from "../components/StoryViewer";
import VideoCard from "../components/VideoCard";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Skeleton } from "../components/ui/skeleton";
import {
  useGetActiveStoriesByUser,
  useGetFriendRequestStatus,
  useGetFriends,
  useGetUserProfile,
  useGetVideosByCreator,
  useSendFriendRequest,
  useStartChatWithUser,
} from "../hooks/useQueries";

type ContentTab = "posts" | "reels" | "tagged";

interface UserProfilePageProps {
  userPrincipal: Principal;
  onBack: () => void;
  onMessage?: (principal: Principal) => void;
}

export default function UserProfilePage({
  userPrincipal,
  onBack,
  onMessage,
}: UserProfilePageProps) {
  const { identity } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading } =
    useGetUserProfile(userPrincipal);
  const { data: userVideos, isLoading: videosLoading } =
    useGetVideosByCreator(userPrincipal);
  const { data: userStories } = useGetActiveStoriesByUser(userPrincipal);
  const { data: friendRequestStatus } =
    useGetFriendRequestStatus(userPrincipal);
  const { data: friends = [] } = useGetFriends();
  const sendFriendRequestMutation = useSendFriendRequest();
  const startChatMutation = useStartChatWithUser();

  const [activeTab, setActiveTab] = useState<ContentTab>("posts");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [videoFullscreen, setVideoFullscreen] = useState(false);

  const currentUserPrincipal = identity?.getPrincipal();
  const isOwnProfile =
    currentUserPrincipal?.toString() === userPrincipal.toString();
  const isFriend = friends.some(
    (f) => f.toString() === userPrincipal.toString(),
  );
  const areFriends =
    isFriend || friendRequestStatus === FriendRequestStatus.accepted;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleStoryClick = (index: number) => {
    setSelectedStoryIndex(index);
    setViewerOpen(true);
  };

  const handleSendFriendRequest = () => {
    sendFriendRequestMutation.mutate(userPrincipal);
  };

  const handleMessage = async () => {
    try {
      await startChatMutation.mutateAsync(userPrincipal);
      if (onMessage) onMessage(userPrincipal);
    } catch (error) {
      console.error("Failed to start chat:", error);
    }
  };

  const handleVideoThumbClick = (id: string) => {
    setActiveVideoId(id);
    setVideoFullscreen(true);
  };

  const avatarUrl = userProfile?.avatar?.getDirectURL();
  const selectedVideo = userVideos?.find((v) => v.id === activeVideoId) ?? null;

  // ── Fullscreen player ───────────────────────────────────────────────────
  if (videoFullscreen && selectedVideo) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md">
          <button
            type="button"
            data-ocid="user_profile.video_close_button"
            onClick={() => setVideoFullscreen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl glass-btn text-white text-sm font-medium min-h-[44px]"
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

  // ── Action buttons ────────────────────────────────────────────────
  const renderFollowButton = (): React.ReactNode => {
    if (areFriends) {
      return (
        <button
          type="button"
          disabled
          className="flex-1 flex items-center justify-center gap-1.5 h-[34px] rounded-lg bg-muted/60 border border-border/40 text-[13px] font-semibold text-foreground cursor-default"
        >
          <UserCheck className="h-4 w-4" />
          Following
        </button>
      );
    }
    if (friendRequestStatus === FriendRequestStatus.pending) {
      return (
        <button
          type="button"
          disabled
          className="flex-1 flex items-center justify-center gap-1.5 h-[34px] rounded-lg bg-muted/60 border border-border/40 text-[13px] font-semibold text-muted-foreground"
        >
          <Check className="h-4 w-4" />
          Requested
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={handleSendFriendRequest}
        disabled={sendFriendRequestMutation.isPending}
        data-ocid="user_profile.add_friend_button"
        className="flex-1 flex items-center justify-center gap-1.5 h-[34px] rounded-lg bg-primary text-primary-foreground text-[13px] font-bold transition-all duration-200 active:scale-95 disabled:opacity-50"
      >
        <UserPlus className="h-4 w-4" />
        Follow
      </button>
    );
  };

  return (
    <div
      className="min-h-screen bg-background pb-nav"
      data-ocid="user_profile.page"
    >
      {/* ── Sticky back header ──────────────────────────────────── */}
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-2.5 bg-background/90 backdrop-blur-xl border-b border-border/20">
        <button
          type="button"
          onClick={onBack}
          data-ocid="user_profile.back_button"
          aria-label="Go back"
          className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted/60 transition-colors duration-200"
        >
          <ArrowLeft className="h-[22px] w-[22px]" />
        </button>
        <h1 className="text-base font-bold text-foreground truncate flex-1">
          {profileLoading ? "Profile" : (userProfile?.name ?? "Profile")}
        </h1>
      </header>

      {/* ── Avatar + Info block ─────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="p-[3px] rounded-full bg-gradient-to-tr from-secondary via-primary to-accent shadow-lg">
              <div className="p-[2px] rounded-full bg-background">
                {profileLoading ? (
                  <Skeleton className="h-[86px] w-[86px] rounded-full md:h-[116px] md:w-[116px]" />
                ) : (
                  <Avatar
                    className="h-[86px] w-[86px] md:h-[116px] md:w-[116px]"
                    data-ocid="user_profile.avatar"
                  >
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt={userProfile?.name} />
                    ) : null}
                    <AvatarFallback className="bg-secondary/20 text-secondary text-3xl font-bold">
                      {userProfile ? getInitials(userProfile.name) : "?"}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
          </div>

          {/* Stats — desktop */}
          <div className="hidden md:flex flex-1 justify-around pt-4">
            <UPStatItem value={userVideos?.length ?? 0} label="Posts" />
            <UPStatItem value={userStories?.length ?? 0} label="Stories" />
            <UPStatItem value={0} label="Followers" />
            <UPStatItem value={0} label="Following" />
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
              <h2 className="text-[15px] font-bold text-foreground leading-tight">
                {userProfile.name}
              </h2>
              <span
                className="mt-1 inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-semibold"
                style={{
                  background: "oklch(0.80 0.17 70 / 0.10)",
                  color: "oklch(0.88 0.12 85)",
                  border: "1px solid oklch(0.80 0.17 70 / 0.25)",
                }}
              >
                ID: {userPrincipal.toString()}
              </span>
              {userProfile.bio && (
                <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
                  {userProfile.bio}
                </p>
              )}
            </>
          ) : null}
        </div>

        {/* Action buttons */}
        {!isOwnProfile && !profileLoading && (
          <div className="flex gap-2 mt-3" data-ocid="user_profile.actions">
            {renderFollowButton()}
            <button
              type="button"
              onClick={handleMessage}
              disabled={startChatMutation.isPending}
              data-ocid="user_profile.message_button"
              className="flex-1 flex items-center justify-center gap-1.5 h-[34px] rounded-lg bg-muted/60 border border-border/40 text-[13px] font-semibold text-foreground transition-all duration-200 active:scale-95 disabled:opacity-50"
            >
              <MessageCircle className="h-4 w-4" />
              {startChatMutation.isPending ? "Opening..." : "Message"}
            </button>
          </div>
        )}

        {/* Stats — mobile */}
        <div
          className="flex md:hidden mt-4 border-t border-b border-border/20 py-3"
          data-ocid="user_profile.stats"
        >
          <UPStatItem value={userVideos?.length ?? 0} label="Posts" clickable />
          <UPStatItem
            value={userStories?.length ?? 0}
            label="Stories"
            clickable
          />
          <UPStatItem value={0} label="Followers" clickable />
          <UPStatItem value={0} label="Following" clickable />
        </div>
      </div>

      {/* ── Story highlights ──────────────────────────────────── */}
      {userStories && userStories.length > 0 && (
        <section className="px-3 pb-4 border-b border-border/20">
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-1">
            {userStories.map((story, index) => (
              <StoryCard
                key={story.id}
                story={story}
                onClick={() => handleStoryClick(index)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Content Tabs ─────────────────────────────────────── */}
      <div
        className="flex border-b border-border/30"
        role="tablist"
        data-ocid="user_profile.tabs"
      >
        {(
          [
            { id: "posts", icon: <Grid3X3 className="h-[22px] w-[22px]" /> },
            { id: "reels", icon: <Film className="h-[22px] w-[22px]" /> },
            { id: "tagged", icon: <Camera className="h-[22px] w-[22px]" /> },
          ] as { id: ContentTab; icon: React.ReactNode }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            data-ocid={`user_profile.tab.${tab.id}`}
            className={`flex-1 flex items-center justify-center py-3 transition-all duration-200 border-b-2 ${
              activeTab === tab.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
          </button>
        ))}
      </div>

      {/* ── Media Grid ───────────────────────────────────────── */}
      <section data-ocid="user_profile.videos_section">
        {activeTab === "posts" &&
          (videosLoading ? (
            <div className="grid grid-cols-3 gap-[1.5px]">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="aspect-square" />
              ))}
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
            <div
              className="flex flex-col items-center justify-center py-20 px-6"
              data-ocid="user_profile.videos_empty_state"
            >
              <div className="h-16 w-16 rounded-full border-2 border-dashed border-border flex items-center justify-center mb-4">
                <Film className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-base font-semibold text-foreground">
                No Posts Yet
              </p>
              <p className="text-sm text-muted-foreground mt-1 text-center">
                When {userProfile?.name ?? "this user"} shares posts, they'll
                appear here.
              </p>
            </div>
          ))}
        {activeTab === "reels" && (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-border flex items-center justify-center mb-4">
              <Play className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-base font-semibold text-foreground">
              No Reels Yet
            </p>
          </div>
        )}
        {activeTab === "tagged" && (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-border flex items-center justify-center mb-4">
              <Camera className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-base font-semibold text-foreground">
              No Tagged Posts
            </p>
          </div>
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

function UPStatItem({
  value,
  label,
  clickable,
}: {
  value: number;
  label: string;
  clickable?: boolean;
}) {
  return (
    <button
      type="button"
      className={`flex-1 flex flex-col items-center gap-0.5 py-1 ${
        clickable ? "active:opacity-70 transition-opacity" : "cursor-default"
      }`}
    >
      <span className="text-[17px] font-bold text-foreground leading-tight">
        {value.toLocaleString()}
      </span>
      <span className="text-[13px] text-muted-foreground">{label}</span>
    </button>
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
      data-ocid={`user_profile.video_thumb.${index}`}
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
