import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  Upload,
  Video as VideoIcon,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { ExternalBlob, StoryContentType } from "../backend";
import { useUploadStory } from "../hooks/useQueries";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

interface UploadStoryDialogProps {
  trigger?: React.ReactNode;
}

export default function UploadStoryDialog({ trigger }: UploadStoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [contentType, setContentType] = useState<StoryContentType | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const uploadStory = useUploadStory();

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    let type: StoryContentType | null = null;
    if (file.type.startsWith("image/")) type = StoryContentType.image;
    else if (file.type.startsWith("video/")) type = StoryContentType.video;
    if (!type) return;
    setContentFile(file);
    setContentType(type);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e.target.files?.[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileChange(e.dataTransfer.files?.[0]);
  };

  const clearFile = () => {
    setContentFile(null);
    setContentType(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentFile || !contentType) return;
    try {
      const arrayBuffer = await contentFile.arrayBuffer();
      const blob = ExternalBlob.fromBytes(
        new Uint8Array(arrayBuffer),
      ).withUploadProgress((pct) => setUploadProgress(pct));
      await uploadStory.mutateAsync({
        title: "Story",
        contentType,
        file: blob,
      });
      setOpen(false);
      clearFile();
      setUploadProgress(0);
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  const defaultTrigger = (
    <Button
      size="sm"
      variant="outline"
      data-ocid="feed.add_story_dialog_button"
      className="gap-2 rounded-full px-4 font-semibold"
    >
      <Camera className="h-4 w-4" />
      Add Story
    </Button>
  );

  const fileSizeMB = contentFile
    ? (contentFile.size / 1024 / 1024).toFixed(1)
    : "0.0";

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) clearFile();
        setOpen(v);
      }}
    >
      <SheetTrigger asChild>{trigger ?? defaultTrigger}</SheetTrigger>

      <SheetContent
        side="bottom"
        className="p-0 border-0 rounded-t-3xl overflow-y-auto flex flex-col"
        style={{
          background: "oklch(var(--card))",
          maxHeight: "92dvh",
        }}
        data-ocid="feed.upload_story_dialog"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <SheetHeader className="px-5 pt-1 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 flex items-center justify-center rounded-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, #f9a825, #e91e63, #9c27b0)",
                }}
              >
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-foreground leading-tight">
                  Add to Your Story
                </SheetTitle>
                <p className="text-xs text-muted-foreground">
                  Visible for 24 hours
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="h-8 w-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground
                active:scale-90 transition-transform"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 pb-6">
          {/* Media picker or preview */}
          <AnimatePresence mode="wait">
            {previewUrl ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="relative w-full rounded-2xl overflow-hidden bg-black"
                style={{ aspectRatio: "9/16", maxHeight: 480 }}
              >
                {contentType === StoryContentType.image ? (
                  <img
                    src={previewUrl}
                    alt="Story preview"
                    className="w-full h-full"
                    style={{ objectFit: "contain" }}
                  />
                ) : (
                  <video
                    src={previewUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                )}
                {/* Gradient overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 50%)",
                  }}
                />

                {/* Remove button */}
                <button
                  type="button"
                  onClick={clearFile}
                  aria-label="Remove file"
                  className="absolute top-3 right-3 flex items-center justify-center w-9 h-9 rounded-full
                    text-white active:scale-90 transition-transform"
                  style={{
                    background: "rgba(0,0,0,0.6)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <X className="h-4 w-4" />
                </button>

                {/* File info badge */}
                <div
                  className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{
                    background: "rgba(0,0,0,0.6)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {contentType === StoryContentType.image ? (
                    <ImageIcon className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <VideoIcon className="h-3.5 w-3.5 text-white" />
                  )}
                  <span className="text-xs text-white font-medium">
                    {fileSizeMB} MB
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="picker"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-3"
              >
                {/* Drop zone */}
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  data-ocid="feed.story_dropzone"
                  className="w-full rounded-2xl flex flex-col items-center justify-center gap-4 py-10
                    transition-all duration-200 active:scale-[0.98]"
                  style={{
                    border: dragOver
                      ? "2px dashed #e91e63"
                      : "2px dashed rgba(255,255,255,0.15)",
                    background: dragOver
                      ? "rgba(233,30,99,0.08)"
                      : "oklch(var(--muted) / 0.4)",
                  }}
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #f9a825, #e91e63, #9c27b0)",
                    }}
                  >
                    <Camera className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="text-[15px] font-semibold text-foreground">
                      {dragOver ? "Drop here!" : "Tap to choose photo"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG up to 50 MB
                    </p>
                  </div>
                </button>

                {/* Video pick button */}
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  data-ocid="feed.story_video_button"
                  className="w-full rounded-2xl flex items-center justify-center gap-3 py-4
                    transition-all active:scale-[0.98]"
                  style={{
                    border: "1.5px solid oklch(var(--border) / 0.5)",
                    background: "oklch(var(--muted) / 0.25)",
                  }}
                >
                  <VideoIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    Choose Video
                  </span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={handleInputChange}
            className="hidden"
          />

          {/* Upload progress */}
          <AnimatePresence>
            {uploadProgress > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-2 p-3 rounded-xl" style={{background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.12)"}}
              >
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {uploadProgress < 10 ? "Starting…" :
                     uploadProgress < 80 ? "Encoding story…" :
                     uploadProgress < 100 ? "Saving to server…" :
                     "Complete!"}
                  </span>
                  <span className="font-bold gradient-text">
                    {uploadProgress}%
                  </span>
                </div>
                <div className="w-full bg-muted/20 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: `${uploadProgress}%`,
                      background: uploadProgress >= 100
                        ? "linear-gradient(90deg, oklch(0.72 0.22 145), oklch(0.80 0.17 70))"
                        : "linear-gradient(90deg, oklch(0.65 0.20 45), oklch(0.88 0.12 85))",
                      boxShadow: uploadProgress < 100
                        ? "0 0 8px oklch(0.80 0.17 70 / 0.4)"
                        : "0 0 12px oklch(0.72 0.22 145 / 0.5)",
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <Button
            type="submit"
            data-ocid="feed.story_submit_button"
            disabled={uploadStory.isPending || !contentFile}
            className="w-full h-13 rounded-2xl font-bold text-[15px] text-white"
            style={{
              background: "linear-gradient(135deg, #f9a825, #e91e63, #9c27b0)",
              paddingBlock: 14,
              opacity: !contentFile || uploadStory.isPending ? 0.6 : 1,
            }}
          >
            {uploadStory.isPending ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-pulse" />
                Sharing Story…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Add to Story
              </>
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
