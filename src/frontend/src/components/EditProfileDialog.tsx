import { Camera, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ExternalBlob } from "../backend";
import type { UserProfile } from "../backend";
import {
  useSaveCallerUserProfile,
  useUpdateProfileImage,
} from "../hooks/useQueries";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface EditProfileDialogProps {
  currentProfile: UserProfile;
}

export default function EditProfileDialog({
  currentProfile,
}: EditProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentProfile.name);
  const [bio, setBio] = useState(currentProfile.bio || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveProfile = useSaveCallerUserProfile();
  const updateProfileImage = useUpdateProfileImage();

  // isMobile breakpoint
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < 768,
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (avatarFile) {
      const url = URL.createObjectURL(avatarFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [avatarFile]);

  useEffect(() => {
    if (open) {
      setName(currentProfile.name);
      setBio(currentProfile.bio || "");
      setAvatarFile(null);
      setPreviewUrl(null);
    }
  }, [open, currentProfile.name, currentProfile.bio]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type.startsWith("image/")) setAvatarFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      if (avatarFile) {
        const arrayBuffer = await avatarFile.arrayBuffer();
        const blob = ExternalBlob.fromBytes(new Uint8Array(arrayBuffer));
        await updateProfileImage.mutateAsync(blob);
      }
      await saveProfile.mutateAsync({
        name: name.trim(),
        bio: bio.trim() || undefined,
        avatar: currentProfile.avatar,
        balance: currentProfile.balance,
      });
      setOpen(false);
    } catch (error) {
      console.error("Profile update error:", error);
    }
  };

  const getInitials = (n: string) =>
    n
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const currentAvatarUrl = currentProfile.avatar?.getDirectURL();
  const displayAvatar = previewUrl || currentAvatarUrl;
  const isPending = saveProfile.isPending || updateProfileImage.isPending;

  const formContent = (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Avatar */}
      <div className="flex flex-col items-center pt-5 pb-5 border-b border-border/20">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative group"
          data-ocid="profile.avatar_edit_button"
          aria-label="Change profile photo"
        >
          <div className="p-[3px] rounded-full bg-gradient-to-br from-primary via-accent to-secondary shadow-lg transition-transform duration-200 group-active:scale-95">
            <div className="p-[2px] rounded-full bg-card">
              <Avatar className="h-[88px] w-[88px]">
                {displayAvatar ? (
                  <AvatarImage src={displayAvatar} alt={name} />
                ) : null}
                <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                  {getInitials(name || "?")}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
          {/* Dimmed camera overlay */}
          <div className="absolute inset-0 rounded-full bg-black/35 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <Camera className="h-6 w-6 text-white" />
          </div>
          {/* Badge */}
          <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-md border-2 border-background">
            <Camera className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-3 text-[13px] text-primary font-semibold hover:text-primary/80 transition-colors duration-200"
        >
          Change Photo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          data-ocid="profile.avatar_upload"
        />
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-3 space-y-5">
        <div className="space-y-1.5">
          <label
            htmlFor="edit-name"
            className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider"
          >
            Name
          </label>
          <input
            id="edit-name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            data-ocid="profile.name_input"
            className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border/40 text-foreground placeholder:text-muted-foreground text-[14px] focus:outline-none focus:border-primary/60 transition-colors duration-200"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="edit-bio"
            className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider"
          >
            Bio
          </label>
          <textarea
            id="edit-bio"
            placeholder="Tell people about yourself..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            data-ocid="profile.bio_input"
            className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border/40 text-foreground placeholder:text-muted-foreground text-[14px] focus:outline-none focus:border-primary/60 transition-colors duration-200 resize-none"
          />
          <div className="text-right">
            <span
              className={`text-[11px] ${bio.length > 145 ? "text-destructive" : "text-muted-foreground"}`}
            >
              {bio.length}/150
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="edit-website"
            className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider"
          >
            Website
          </label>
          <input
            id="edit-website"
            type="url"
            placeholder="https://"
            data-ocid="profile.website_input"
            className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border/40 text-foreground placeholder:text-muted-foreground text-[14px] focus:outline-none focus:border-primary/60 transition-colors duration-200"
          />
        </div>
      </div>

      {/* Save */}
      <div className="px-5 pb-6 pt-3 border-t border-border/20">
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          data-ocid="profile.save_button"
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-[14px] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </button>
      </div>
    </form>
  );

  if (isMobile) {
    // Full-screen bottom sheet on mobile
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-ocid="profile.edit_button"
          className="flex-1 flex items-center justify-center gap-1.5 h-[34px] rounded-lg bg-muted/60 border border-border/40 text-[13px] font-semibold text-foreground transition-all duration-200 active:scale-95"
        >
          Edit profile
        </button>

        {open && (
          <div
            className="fixed inset-0 z-50 flex flex-col"
            data-ocid="profile.edit_dialog"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setOpen(false)}
              onKeyDown={() => setOpen(false)}
              role="button"
              tabIndex={-1}
              aria-label="Close dialog"
            />
            {/* Sheet */}
            <div className="relative mt-auto w-full bg-card rounded-t-2xl flex flex-col max-h-[92svh] shadow-2xl">
              {/* Sheet drag handle */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/20">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  data-ocid="profile.edit_cancel_button"
                  className="text-[14px] text-foreground font-medium min-h-[44px] flex items-center"
                >
                  Cancel
                </button>
                <span className="text-[15px] font-bold text-foreground">
                  Edit Profile
                </span>
                <div className="w-14" />
              </div>
              {formContent}
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop: centered dialog
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          data-ocid="profile.edit_button"
          className="flex-1 flex items-center justify-center gap-1.5 h-[34px] rounded-lg bg-muted/60 border border-border/40 text-[13px] font-semibold text-foreground transition-all duration-200 active:scale-95 hover:bg-muted"
        >
          Edit profile
        </button>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-[420px] p-0 overflow-hidden rounded-2xl border border-border/30 bg-card shadow-2xl"
        data-ocid="profile.edit_dialog"
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between px-5 pt-5 pb-4 border-b border-border/20">
          <button
            type="button"
            onClick={() => setOpen(false)}
            data-ocid="profile.edit_cancel_button"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium min-h-[44px] flex items-center"
          >
            Cancel
          </button>
          <DialogTitle className="text-[15px] font-bold text-foreground absolute left-1/2 -translate-x-1/2">
            Edit Profile
          </DialogTitle>
          <div className="w-14" />
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
