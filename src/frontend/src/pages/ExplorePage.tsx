import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import type { Principal } from "@icp-sdk/core/principal";
import {
  Check,
  Play,
  Search,
  Sparkles,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import { useMemo, useRef, useState, useEffect } from "react";
import { FriendRequestStatus } from "../backend";
import ExploreVideoPlayer from "../components/ExploreVideoPlayer";
import UploadVideoDialog from "../components/UploadVideoDialog";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Skeleton } from "../components/ui/skeleton";
import {
  useGetAllVideos,
  useGetFriends,
  useSearchExternalVideos,
  useSearchUsers,
  useSearchVideos,
  useSendFriendRequest,
} from "../hooks/useQueries";
import UserProfilePage from "./UserProfilePage";
import { Strings } from "../Strings";

type Tab = "videos" | "people";
type View = "explore" | "profile";

interface PlayerState {
  externalId?: string;
  internalUrl?: string;
  title: string;
  creatorName: string;
}

const TRENDING_TOPICS = [
  "trending",
  "blockchain",
  "reels",
  "music",
  "art",
  "dance",
  "tech",
  "comedy",
  "fashion",
  "viral",
];

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.floor(n / 1_000)}K`;
  return String(n);
}

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("videos");
  const [currentView, setCurrentView] = useState<View>("explore");
  const [viewingProfile, setViewingProfile] = useState<Principal | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const { identity } = useInternetIdentity();
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: allVideos, isLoading: allLoading } = useGetAllVideos();
  const { data: trendingExternalVideos, isLoading: trendingLoading } = useSearchExternalVideos("trending viral reels");
  const { data: internalSearchResults, isLoading: internalSearchLoading } = useSearchVideos(query);
  const { data: externalSearchResults, isLoading: externalSearchLoading } = useSearchExternalVideos(query);
  const { data: searchUserResults, isLoading: searchUserLoading } = useSearchUsers(query);
  const { data: friends = [] } = useGetFriends();
  const sendFriendRequest = useSendFriendRequest();

  const currentUserPrincipal = identity?.getPrincipal();
  const isSearching = query.length > 0;

  const mergedSearchResults = useMemo(() => {
    const internal = internalSearchResults || [];
    const external = externalSearchResults || [];
    return [...internal, ...external];
  }, [internalSearchResults, externalSearchResults]);

  const mergedDefaultVideos = useMemo(() => {
    const internal = allVideos || [];
    const external = trendingExternalVideos || [];
    return [...internal, ...external];
  }, [allVideos, trendingExternalVideos]);

  const isLoadingVideos = isSearching
    ? internalSearchLoading || externalSearchLoading
    : allLoading || trendingLoading;

  const videos = isSearching ? mergedSearchResults : mergedDefaultVideos;

  // Auto-switch to "people" tab if we found users but no videos
  useEffect(() => {
    if (isSearching && activeTab === "videos" && !isLoadingVideos && !searchUserLoading) {
      if (searchUserResults && searchUserResults.profiles.length > 0 && videos.length === 0) {
        setActiveTab("people");
      }
    }
  }, [isSearching, activeTab, isLoadingVideos, searchUserLoading, searchUserResults, videos.length]);

  const isFriend = (p: Principal) =>
    friends.some((f) => f.toString() === p.toString());

  const getFriendStatus = (p: Principal): FriendRequestStatus | null => {
    if (!searchUserResults) return null;
    const hasPending = searchUserResults.pendingRequests.some(
      (req) => req.sender.toString() === p.toString(),
    );
    if (hasPending) return FriendRequestStatus.pending;
    if (isFriend(p)) return FriendRequestStatus.accepted;
    return null;
  };

  const handleVideoClick = (video: any) => {
    const isExt = !!(video as any).isExternal;
    const extId = (video as any).externalId;

    if (isExt && extId) {
      setPlayerState({
        externalId: extId,
        title: video.title,
        creatorName: video.creator?.toText?.() || "Creator",
      });
    } else {
      const url = video.file?.getDirectURL?.();
      if (url) {
        setPlayerState({
          internalUrl: url,
          title: video.title,
          creatorName: video.creator?.toText?.() || "Creator",
        });
      } else {
        handleCreatorClick(video.creator as unknown as Principal);
      }
    }
  };

  const handleCreatorClick = (p: Principal) => {
    setViewingProfile(p);
    setCurrentView("profile");
  };

  if (currentView === "profile" && viewingProfile) {
    return (
      <UserProfilePage
        userPrincipal={viewingProfile}
        onBack={() => {
          setViewingProfile(null);
          setCurrentView("explore");
        }}
        onMessage={() => {
          setViewingProfile(null);
          setCurrentView("explore");
        }}
      />
    );
  }

  return (
    <>
      {playerState && (
        <ExploreVideoPlayer
          {...playerState}
          onClose={() => setPlayerState(null)}
        />
      )}

      <div className="min-h-screen bg-background animate-page-in" data-ocid="explore.page">

        {/* ═══ PREMIUM GOLD BANNER ═══ */}
        <div className="banner-container h-[180px] md:h-[220px]">
          <div className="banner-bg" />
          <div className="banner-stars" />
          <div className="banner-grid" />
          <div className="banner-glow-left" />
          <div className="banner-glow-right" />
          <div className="banner-content">
            <div className="flex flex-col items-center gap-3 mt-4 md:mt-0">
              <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 neon-glow-gold" style={{
                background: "linear-gradient(135deg, oklch(0.88 0.12 85 / 0.25), oklch(0.80 0.17 70 / 0.25))",
                border: "1.5px solid oklch(0.88 0.12 85 / 0.35)",
              }}>
                <Sparkles className="h-7 w-7 text-white animate-pulse" />
              </div>
              <div className="text-center">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight gradient-text" style={{ letterSpacing: '-0.3px', margin: 0 }}>
                  {Strings.explore.title}
                </h1>
                <p className="text-[11px] md:text-xs font-semibold tracking-wide mt-1" style={{ color: "oklch(0.72 0.10 70)", margin: 0 }}>
                  {Strings.explore.discover}
                </p>
              </div>
            </div>
          </div>
          <div className="banner-overlay" />
        </div>

        {/* ── Sticky Header ─────────────────────────────────────────────── */}
        <div className="sticky top-[52px] md:top-0 z-20 glass-panel border-x-0 border-t-0 rounded-none md:rounded-[24px] md:mx-auto md:max-w-2xl md:mt-[-24px]" style={{
          background: "rgba(12, 9, 3, 0.95)",
          borderBottom: "1px solid rgba(212, 175, 55, 0.15)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,175,55,0.08)",
        }}>
          <div className="px-4 md:px-6 pt-4 pb-4">
            {/* Title bar */}
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-foreground tracking-tight gradient-text" style={{ letterSpacing: '-0.3px', margin: 0 }}>{Strings.explore.title}</h1>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full card-premium" style={{
                background: "linear-gradient(135deg, oklch(0.88 0.12 85 / 0.15), oklch(0.80 0.17 70 / 0.1))",
                border: "1px solid oklch(0.88 0.12 85 / 0.22)",
              }}>
                <Sparkles className="h-3 w-3" style={{ color: "oklch(0.88 0.12 85)" }} />
                <span className="text-[10px] font-bold" style={{ color: "oklch(0.88 0.12 85)" }}>{Strings.explore.liveSearch}</span>
              </div>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                ref={searchRef}
                type="search"
                placeholder={Strings.explore.searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                data-ocid="explore.search_input"
                className="w-full h-12 pl-11 pr-4 rounded-2xl text-sm font-medium focus:outline-none transition-all duration-200 glass-input"
              />
            </div>

            {/* Tabs (when searching) */}
            {isSearching && (
              <div className="flex gap-2 mt-3">
                {(["videos", "people"] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    data-ocid={`explore.${tab}_tab`}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-[13px] font-bold transition-all duration-200 ${
                      activeTab === tab
                        ? "text-[#1a1000] shadow-md btn-gold border-0"
                        : "glass-button text-muted-foreground hover:text-white"
                    }`}
                  >
                    {tab === "videos" ? <Play className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                    {tab === "videos" ? Strings.explore.tabVideos : Strings.explore.tabPeople}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────────────── */}
        <div className="pb-28 w-full md:max-w-2xl md:mx-auto">

          {!isSearching ? (
            <div>
              {/* Trending chips */}
              <div className="px-4 md:px-0 pt-4 pb-3">
                <div className="flex items-center gap-1.5 mb-3">
                  <TrendingUp className="h-4 w-4" style={{ color: "oklch(0.88 0.12 85)" }} />
                  <span className="text-sm font-bold text-foreground">{Strings.explore.trending}</span>
                </div>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                  {TRENDING_TOPICS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setQuery(tag)}
                      data-ocid="explore.trending_chip"
                      className="shrink-0 h-8 px-4 rounded-full text-xs font-semibold glass-button text-muted-foreground hover:text-foreground active:scale-95 transition-all duration-150"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-4 md:px-0 pb-2 flex items-center justify-between">
                <span className="text-[17px] font-black text-foreground tracking-tight">{Strings.explore.forYou}</span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {mergedDefaultVideos?.length || 0} {Strings.explore.videosCount}
                </span>
              </div>

              {isLoadingVideos ? (
                <div className="grid gap-[2px] md:gap-1" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                  {Array.from({ length: 9 }, (_, i) => (
                    <Skeleton
                      key={`skeleton-grid-${i}`}
                      className="bg-[#1a1200]"
                      style={Object.assign(
                        { display: "block" },
                        (i + 1) % 5 === 0
                          ? { gridRow: "span 2", aspectRatio: "1/2" }
                          : { aspectRatio: "1/1" },
                      )}
                    />
                  ))}
                </div>
              ) : videos && videos.length > 0 ? (
                <div className="grid gap-[2px] md:gap-1" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                  {videos.map((video, idx) => {
                    const isTall = (idx + 1) % 5 === 0;
                    const thumbUrl = (video as any).thumbnail?.getDirectURL?.() || "";
                    return (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => handleVideoClick(video)}
                        data-ocid={`explore.video_thumb.${idx + 1}`}
                        className="relative overflow-hidden bg-black active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 group rounded-none md:rounded-lg"
                        style={isTall ? { gridRow: "span 2" } : undefined}
                      >
                        <div style={{ aspectRatio: isTall ? "1/2" : "1/1" }}>
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={video.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <video
                              src={(video as any).file?.getDirectURL?.() || ""}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          )}
                          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, oklch(0.07 0.02 40 / 0.85) 0%, transparent 40%)" }} />
                          
                          {!!(video as any).isExternal && (
                            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md" style={{ background: "oklch(0.88 0.12 85 / 0.85)" }}>
                              <span className="text-[9px] font-black text-[#1a1000] tracking-wide">▶</span>
                            </div>
                          )}

                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="h-12 w-12 rounded-full glass-button flex items-center justify-center border border-[#d4af37]/30">
                              <Play className="h-5 w-5 text-white" fill="white" />
                            </div>
                          </div>
                          <div className="absolute bottom-1.5 left-1.5 right-1.5">
                            <p className="text-white text-[11px] font-bold drop-shadow-md line-clamp-1">{video.title}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 px-8 text-center animate-scale-in">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-5 neon-glow-gold"
                    style={{
                      background: "linear-gradient(135deg, oklch(0.80 0.17 70 / 0.15), oklch(0.65 0.20 45 / 0.15))",
                      border: "1.5px solid oklch(0.80 0.17 70 / 0.3)",
                    }}
                  >
                    <Video className="h-8 w-8" style={{ color: "oklch(0.88 0.12 85)" }} />
                  </div>
                  <p className="text-foreground text-lg font-bold mb-2">{Strings.explore.noVideos}</p>
                  <p className="text-muted-foreground text-[13px] mb-6 leading-relaxed max-w-[240px]">
                    {Strings.explore.emptyDesc}
                  </p>
                  <UploadVideoDialog
                    trigger={
                      <button
                        type="button"
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[#1a1000] font-bold text-[14px] transition-all active:scale-95 btn-gold border-0"
                      >
                        <Upload className="h-4 w-4" />
                        {Strings.explore.btnUploadReel}
                      </button>
                    }
                  />
                </div>
              )}
            </div>

          ) : (
            <div className="animate-page-in px-4 md:px-0">

              {activeTab === "videos" && (
                <div>
                  {isLoadingVideos ? (
                    <div className="pt-4">
                      <div className="mb-3">
                        <Skeleton className="h-4 w-32 bg-[#1a1200]" />
                      </div>
                      <div className="grid grid-cols-2 gap-[2px] md:gap-1">
                        {Array.from({ length: 6 }, (_, i) => (
                          <Skeleton key={`skeleton-videos-${i}`} className="aspect-video bg-[#1a1200]" />
                        ))}
                      </div>
                    </div>
                  ) : videos && videos.length > 0 ? (
                    <div>
                      <div className="pt-4 pb-2 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                          {videos.length} {Strings.explore.resultsFor} "{query}"
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-[2px] md:gap-1">
                        {videos.map((video, idx) => {
                          const isExt = !!(video as any).isExternal;
                          const thumbUrl = (video as any).thumbnail?.getDirectURL?.() || "";
                          const creatorText = video.creator?.toText?.() || "Creator";
                          return (
                            <button
                              key={video.id}
                              type="button"
                              onClick={() => handleVideoClick(video)}
                              data-ocid={`explore.search_video.${idx + 1}`}
                              className="relative overflow-hidden bg-black active:opacity-80 focus-visible:outline-none group rounded-none md:rounded-lg"
                            >
                              <div className="aspect-video">
                                {thumbUrl ? (
                                  <img
                                    src={thumbUrl}
                                    alt={video.title}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <video
                                    src={(video as any).file?.getDirectURL?.() || ""}
                                    className="w-full h-full object-cover"
                                    muted
                                    playsInline
                                    preload="metadata"
                                  />
                                )}
                                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, oklch(0.07 0.02 40 / 0.9) 0%, transparent 60%)" }} />

                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <div className="h-10 w-10 rounded-full glass-button flex items-center justify-center">
                                    <Play className="h-4 w-4 text-white" fill="white" />
                                  </div>
                                </div>

                                {isExt && (
                                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md" style={{ background: "oklch(0.88 0.12 85 / 0.85)" }}>
                                    <span className="text-[9px] font-black text-[#1a1000] tracking-wide">▶</span>
                                  </div>
                                )}

                                <div className="absolute bottom-0 left-0 right-0 p-2.5 text-left">
                                  <p className="text-white text-[12px] font-bold line-clamp-2 leading-tight mb-0.5 drop-shadow-md">{video.title}</p>
                                  <p className="text-white/70 text-[10px] truncate font-medium">@{creatorText}</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 animate-scale-in" data-ocid="explore.videos_empty_state">
                      <div className="h-16 w-16 rounded-full glass-surface flex items-center justify-center mb-4 border border-[#d4af37]/20">
                        <Search className="h-6 w-6 text-[#d4af37]/60" />
                      </div>
                      <p className="text-[15px] font-bold text-foreground">{Strings.explore.noResults}</p>
                      <p className="text-[13px] text-muted-foreground mt-1 text-center">
                        {Strings.explore.tryDifferentSearch}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "people" && (
                <div className="pt-3" data-ocid="explore.people_list">
                  {searchUserLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-2xl glass-surface">
                          <Skeleton className="h-12 w-12 rounded-full shrink-0 bg-[#1a1200]" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32 bg-[#1a1200]" />
                            <Skeleton className="h-3 w-24 bg-[#1a1200]" />
                          </div>
                          <Skeleton className="h-9 w-20 rounded-full bg-[#1a1200]" />
                        </div>
                      ))}
                    </div>
                  ) : searchUserResults && searchUserResults.profiles.length > 0 ? (
                    <div className="space-y-2.5">
                      {searchUserResults.profiles.map(([principal, profile], idx) => {
                        const isOwn = currentUserPrincipal?.toString() === principal.toString();
                        const friendStatus = getFriendStatus(principal);
                        const isAlreadyFriend = isFriend(principal);
                        const isAccepted = friendStatus === FriendRequestStatus.accepted || isAlreadyFriend;

                        return (
                          <div
                            key={principal.toString()}
                            data-ocid={`explore.user_card.${idx + 1}`}
                            className="flex items-center gap-3 p-3 rounded-2xl glass-surface"
                          >
                            <button
                              type="button"
                              onClick={() => handleCreatorClick(principal)}
                              className="flex items-center gap-3 flex-1 min-w-0 text-left"
                            >
                              <Avatar className="h-12 w-12 shrink-0 border-2" style={{ borderColor: "oklch(0.80 0.17 70 / 0.5)" }}>
                                <AvatarImage src={profile.avatar?.getDirectURL()} />
                                <AvatarFallback className="text-[#1a1000] font-bold text-sm" style={{
                                  background: "linear-gradient(135deg, oklch(0.88 0.12 85), oklch(0.80 0.17 70))",
                                }}>
                                  {profile?.name?.[0]?.toUpperCase() || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-foreground truncate text-sm">{profile.name}</p>
                                {profile.bio && (
                                  <p className="text-[11px] font-medium text-muted-foreground truncate mt-0.5">{profile.bio}</p>
                                )}
                                {isOwn && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "oklch(0.88 0.12 85)" }}>{Strings.explore.you}</span>
                                )}
                                {isAlreadyFriend && !isOwn && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "oklch(0.72 0.14 55)" }}>{Strings.explore.following}</span>
                                )}
                              </div>
                            </button>

                            {!isOwn && (
                              <div className="shrink-0">
                                {isAccepted ? (
                                  <button
                                    type="button"
                                    onClick={() => handleCreatorClick(principal)}
                                    data-ocid={`explore.message_button.${idx + 1}`}
                                    className="h-9 px-4 rounded-full text-xs font-semibold glass-button text-foreground hover:text-white"
                                  >
                                    {Strings.explore.message}
                                  </button>
                                ) : friendStatus === FriendRequestStatus.pending ? (
                                  <button
                                    type="button"
                                    disabled
                                    className="h-9 px-4 rounded-full text-xs font-semibold glass-button text-muted-foreground flex items-center gap-1.5 opacity-60"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    {Strings.explore.sent}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => sendFriendRequest.mutate(principal)}
                                    disabled={sendFriendRequest.isPending}
                                    data-ocid={`explore.add_friend_button.${idx + 1}`}
                                    className="h-9 px-4 rounded-full text-[13px] font-bold text-[#1a1000] flex items-center gap-1.5 hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50 btn-gold border-0"
                                  >
                                    <UserPlus className="h-3.5 w-3.5" />
                                    {Strings.explore.follow}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 animate-scale-in" data-ocid="explore.people_empty_state">
                      <div className="h-16 w-16 rounded-full glass-surface flex items-center justify-center mb-4 border border-[#d4af37]/20">
                        <Users className="h-6 w-6 text-[#d4af37]/60" />
                      </div>
                      <p className="text-[15px] font-bold text-foreground">{Strings.explore.noPeople}</p>
                      <p className="text-[13px] text-muted-foreground mt-1 text-center">{Strings.explore.tryDifferentName}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
