import type { Principal } from "@icp-sdk/core/principal";
import { ArrowLeft, Plus, Upload, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import UploadVideoDialog from "../components/UploadVideoDialog";
import VideoCard from "../components/VideoCard";
import { useGetAllVideos } from "../hooks/useQueries";
import UserProfilePage from "./UserProfilePage";
import { Strings } from "../Strings";

type View = "reels" | "profile";

export default function ReelsPage() {
  const { data: videos, isLoading } = useGetAllVideos();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentView, setCurrentView] = useState<View>("reels");
  const [viewingProfile, setViewingProfile] = useState<Principal | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-observe when video list changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const children = Array.from(container.children) as HTMLElement[];
    const reelElements = children.filter(c => c.hasAttribute('data-reel-container'));
    if (reelElements.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = reelElements.indexOf(entry.target as HTMLElement);
            if (idx !== -1) setCurrentIndex(idx);
          }
        }
      },
      { root: container, threshold: 0.6 },
    );
    for (const el of reelElements) observer.observe(el);
    return () => observer.disconnect();
  }, [videos, isLoading]);

  const handleCreatorClick = (creatorPrincipal: Principal) => {
    setViewingProfile(creatorPrincipal);
    setCurrentView("profile");
  };

  const handleBackFromProfile = () => {
    setViewingProfile(null);
    setCurrentView("reels");
  };

  if (currentView === "profile" && viewingProfile) {
    return (
      <UserProfilePage
        userPrincipal={viewingProfile}
        onBack={handleBackFromProfile}
      />
    );
  }

  const hasRealVideos = !isLoading && videos && videos.length > 0;

  return (
    <div
      ref={containerRef}
      data-ocid="reels.page"
      className="hide-scrollbar"
      style={{
        position: "fixed",
        inset: 0,
        overflowY: "scroll",
        scrollSnapType: "y mandatory",
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
        background: "#000",
        zIndex: 50,
      }}
    >
      {/* Top bar — always visible */}
      <div
        className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between px-4 pt-3 pb-2 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)" }}
      >
        <button
          type="button"
          onClick={() => window.history.back()}
          className="pointer-events-auto w-9 h-9 rounded-full flex items-center justify-center text-white transition-all active:scale-90"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
          aria-label={Strings.reels.goBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <span className="text-white font-bold text-base tracking-wide pointer-events-none" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>
          {Strings.reels.title}
        </span>

        <UploadVideoDialog
          trigger={
            <button
              type="button"
              className="pointer-events-auto w-9 h-9 rounded-full flex items-center justify-center text-white transition-all active:scale-90"
              style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
              aria-label={Strings.reels.uploadReel}
              data-ocid="reels.upload_button"
            >
              <Plus className="h-5 w-5" />
            </button>
          }
        />
      </div>

      {isLoading ? (
        <div
          style={{
            height: "100dvh",
            scrollSnapAlign: "start",
            scrollSnapStop: "always",
            position: "relative",
            overflow: "hidden",
          }}
          data-ocid="reels.loading_state"
        >
          <ReelSkeleton />
        </div>
      ) : hasRealVideos ? (
        videos.map((video, index) => (
          <div
            key={video.id}
            data-reel-container="true"
            style={{
              height: "100dvh",
              scrollSnapAlign: "start",
              scrollSnapStop: "always",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <VideoCard
              video={video}
              autoPlay={index === currentIndex}
              onCreatorClick={handleCreatorClick}
            />
          </div>
        ))
      ) : (
        /* Beautiful empty state */
        <div
          className="flex flex-col items-center justify-center w-full text-center px-8"
          style={{ height: "100dvh", background: "linear-gradient(160deg, #0d0117 0%, #050d1f 50%, #000d10 100%)" }}
        >
          {/* Glow blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full opacity-20"
              style={{ background: "radial-gradient(circle, #a855f7 0%, transparent 70%)", filter: "blur(50px)" }} />
            <div className="absolute bottom-1/3 right-1/4 w-56 h-56 rounded-full opacity-15"
              style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)", filter: "blur(40px)" }} />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)", boxShadow: "0 0 40px rgba(124, 58, 237, 0.4)" }}>
              <Video className="h-10 w-10 text-white" />
            </div>

            <div>
              <h2 className="text-white text-2xl font-bold mb-2">{Strings.reels.emptyTitle}</h2>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
                {Strings.reels.emptyDesc}
              </p>
            </div>

            <UploadVideoDialog
              trigger={
                <button
                  type="button"
                  className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-white font-semibold text-base transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)", boxShadow: "0 4px 20px rgba(124, 58, 237, 0.4)" }}
                  data-ocid="reels.empty_upload_button"
                >
                  <Upload className="h-5 w-5" />
                  {Strings.reels.btnFirstReel}
                </button>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ReelSkeleton() {
  return (
    <div className="w-full h-full animate-pulse relative" style={{ background: "#0a0a0a" }}>
      <div className="absolute bottom-32 left-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-white/10" />
        <div className="flex flex-col gap-2">
          <div className="w-28 h-3 rounded-full bg-white/10" />
          <div className="w-44 h-2.5 rounded-full bg-white/8" />
        </div>
      </div>
      <div className="absolute right-4 bottom-36 flex flex-col gap-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-white/10" />
            <div className="w-7 h-2 rounded-full bg-white/8" />
          </div>
        ))}
      </div>
    </div>
  );
}
