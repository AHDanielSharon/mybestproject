import { useEffect, useRef, useState } from "react";
import type { Story } from "../backend";
import { useGetUserProfile } from "../hooks/useQueries";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface StoryCardProps {
  story: Story;
  onClick: () => void;
  seen?: boolean;
}

export default function StoryCard({
  story,
  onClick,
  seen = false,
}: StoryCardProps) {
  const { data: creatorProfile } = useGetUserProfile(story.creator);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [pressed, setPressed] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (story.contentType === "image") {
      setThumbnailUrl(story.file.getDirectURL());
    } else if (story.thumbnail) {
      setThumbnailUrl(story.thumbnail.getDirectURL());
    }
  }, [story]);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const creatorName = creatorProfile?.name || "User";
  const avatarUrl = creatorProfile?.avatar?.getDirectURL();

  const handlePointerDown = () => {
    setPressed(true);
    pressTimer.current = setTimeout(() => setPressed(false), 200);
  };
  const handlePointerUp = () => {
    setPressed(false);
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      data-ocid="feed.story_card"
      aria-label={`View ${creatorName}'s story`}
      className="flex flex-col items-center gap-1.5 shrink-0 min-w-[64px]"
      style={{
        transform: pressed ? "scale(0.92)" : "scale(1)",
        transition: "transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      {/* Neon gradient ring */}
      <div
        className="w-[60px] h-[60px] rounded-full p-[2.5px]"
        style={{
          background: seen
            ? "linear-gradient(135deg, #666, #444)"
            : "linear-gradient(135deg, #00e5ff, #a855f7, #ff00b4)",
        }}
      >
        <div className="w-full h-full rounded-full bg-card p-[2px]">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={creatorName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <Avatar className="w-full h-full">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={creatorName} />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-primary/40 to-secondary/40 text-primary text-xs font-bold">
                {getInitials(creatorName)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
      <span
        className="text-[10px] text-foreground truncate max-w-[60px] text-center leading-tight"
        style={{ fontWeight: seen ? 400 : 600 }}
      >
        {creatorName}
      </span>
    </button>
  );
}
