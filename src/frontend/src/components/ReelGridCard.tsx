import { Eye, Heart, Play } from "lucide-react";
import { motion } from "motion/react";
import type { Video } from "../backend";
import { useGetReelStats, useGetUserProfile } from "../hooks/useQueries";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface ReelGridCardProps {
  reel: Video;
  index?: number;
  onClick?: () => void;
}

function formatCount(n: bigint): string {
  const num = Number(n);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * ReelGridCard — compact card for grid/explore views.
 * Shows a 9:16 thumbnail with play overlay, creator avatar, and stats.
 * Not a full-screen player — use ReelCard for that.
 */
export default function ReelGridCard({
  reel,
  index = 0,
  onClick,
}: ReelGridCardProps) {
  const { data: creatorProfile } = useGetUserProfile(reel.creator);
  const { data: stats } = useGetReelStats(reel.id);
  const creatorName = creatorProfile?.name || "User";
  const avatarUrl = creatorProfile?.avatar?.getDirectURL();
  const thumbnailUrl = reel.thumbnail?.getDirectURL();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      data-ocid={`reels.grid_card.${index + 1}`}
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: (index % 6) * 0.06, duration: 0.22 }}
      whileTap={{ scale: 0.96 }}
      className="relative block w-full overflow-hidden rounded-2xl text-left focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-primary/60"
      style={{ aspectRatio: "9/16" }}
      aria-label={`Play reel: ${reel.title}`}
    >
      {/* Thumbnail or colorful gradient placeholder */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={reel.title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            background: `linear-gradient(145deg,
              hsl(${(index * 53) % 360}deg 55% 22%),
              hsl(${(index * 53 + 160) % 360}deg 45% 12%))`,
          }}
        />
      )}

      {/* Gradient overlay — dark at bottom for readability */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.06) 0%, transparent 38%, rgba(0,0,0,0.72) 100%)",
        }}
      />

      {/* Centered play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(0,0,0,0.50)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
        >
          <Play className="h-4 w-4 text-white fill-white ml-0.5" />
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
        {/* Creator */}
        <div className="flex items-center gap-1.5 mb-1">
          <Avatar
            className="h-5 w-5 shrink-0"
            style={{ border: "1.5px solid rgba(255,255,255,0.5)" }}
          >
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={creatorName} />
            ) : null}
            <AvatarFallback className="bg-white/25 text-white text-[8px] font-bold">
              {getInitials(creatorName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-white text-[10px] font-semibold truncate">
            {creatorName}
          </span>
        </div>

        {/* Title */}
        <p className="text-white text-[11px] font-medium line-clamp-2 leading-tight mb-1.5">
          {reel.title}
        </p>

        {/* Likes + views */}
        {stats && (
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-0.5">
              <Heart className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
              <span className="text-white/80 text-[9px] font-semibold">
                {formatCount(stats.likes)}
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <Eye className="h-2.5 w-2.5 text-white/55" />
              <span className="text-white/75 text-[9px] font-semibold">
                {formatCount(stats.views)}
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.button>
  );
}
