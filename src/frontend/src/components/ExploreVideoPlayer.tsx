import { Loader2, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ExploreVideoPlayerProps {
  externalId?: string;
  internalUrl?: string;
  title: string;
  creatorName: string;
  onClose: () => void;
}

export default function ExploreVideoPlayer({
  externalId,
  internalUrl,
  title,
  creatorName,
  onClose,
}: ExploreVideoPlayerProps) {
  const [streamUrl, setStreamUrl] = useState<string | null>(internalUrl || null);
  const [isLoading, setIsLoading] = useState(!!externalId);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    async function fetchStream() {
      if (!externalId) {
        setIsLoading(false);
        return;
      }
      
      // Since all decentralized proxies for raw MP4 extraction are currently
      // being blocked by Cloudflare or are shut down, we skip stream extraction
      // and directly use the standard YouTube iframe below.
      setIsLoading(false);
    }

    fetchStream();
  }, [externalId]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-50 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white backdrop-blur-lg border border-white/10 transition-all"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative w-full max-w-4xl max-h-[90vh] aspect-video bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl border border-white/5 mx-4">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
            <Loader2 className="h-10 w-10 text-white animate-spin mb-4" />
            <p className="text-white/60 text-sm font-medium">Loading video...</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            <p className="text-red-400 font-medium">{error}</p>
          </div>
        ) : externalId ? (
          // YOUTUBE IFRAME FALLBACK
          <iframe
            src={`https://www.youtube.com/embed/${externalId}?autoplay=1&modestbranding=1&rel=0`}
            title={title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : streamUrl ? (
          // NATIVE HTML5 PLAYER - NO BRANDING!
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            ref={videoRef}
            src={streamUrl}
            className="w-full h-full object-contain"
            autoPlay
            controls
            controlsList="nodownload nofullscreen noremoteplayback"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        ) : null}

        {/* Custom Premium Overlay UI (hide for iframes to prevent overlapping controls) */}
        {!externalId && (
          <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
            <h2 className="text-white text-xl font-bold line-clamp-1 drop-shadow-md mb-1">{title}</h2>
            <p className="text-white/80 font-medium text-sm drop-shadow">@{creatorName}</p>
          </div>
        )}
      </div>
    </div>
  );
}
