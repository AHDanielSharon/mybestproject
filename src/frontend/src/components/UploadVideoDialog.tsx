import { Film, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { ExternalBlob } from "../backend";
import { useUploadVideo } from "../hooks/useQueries";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import { Textarea } from "./ui/textarea";

interface UploadVideoDialogProps {
  trigger?: React.ReactNode;
}

export default function UploadVideoDialog({ trigger }: UploadVideoDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadVideo = useUploadVideo();

  const handleFileChange = (file: File | undefined) => {
    if (!file?.type.startsWith("video/")) return;
    if (file.size > 500 * 1024 * 1024) {
      alert("Video file is too large. Maximum size is 500MB.");
      return;
    }
    setVideoFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e.target.files?.[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileChange(e.dataTransfer.files?.[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile || !title.trim()) return;
    try {
      const arrayBuffer = await videoFile.arrayBuffer();
      const blob = ExternalBlob.fromBytes(
        new Uint8Array(arrayBuffer),
      ).withUploadProgress((pct) => setUploadProgress(pct));
      // Attach MIME type so the mock backend preserves it in the data URI
      (blob as any).__mimeType = videoFile.type || 'video/mp4';
      await uploadVideo.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        file: blob,
      });
      setOpen(false);
      setTitle("");
      setDescription("");
      setVideoFile(null);
      setUploadProgress(0);
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  const defaultTrigger = (
    <Button
      size="sm"
      data-ocid="feed.upload_video_button"
      className="gap-2 rounded-full px-4 font-semibold"
    >
      <Film className="h-4 w-4" />
      Upload Video
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent
        className="sm:max-w-md glass-card border-0 backdrop-blur-2xl"
        data-ocid="feed.upload_video_dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-bold gradient-text">
            Upload Video
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          {/* Drop zone */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            data-ocid="feed.video_dropzone"
            className={`w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 py-8 px-4 transition-all duration-200 cursor-pointer ${
              dragOver
                ? "border-primary bg-primary/10"
                : videoFile
                  ? "border-emerald-400/60 bg-emerald-400/5"
                  : "border-border/60 hover:border-primary/60 hover:bg-muted/30"
            }`}
          >
            {videoFile ? (
              <>
                <Film className="h-8 w-8 text-emerald-400" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                    {videoFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVideoFile(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Remove
                </button>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">
                    Drop video here
                  </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              or click to browse · max 500MB
            </p>
                </div>
              </>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            onChange={handleInputChange}
            className="hidden"
          />

          <div className="space-y-1.5">
            <Label
              htmlFor="upload-title"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Title *
            </Label>
            <Input
              id="upload-title"
              placeholder="Give your video a title…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              data-ocid="feed.video_title_input"
              className="glass-input bg-transparent"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="upload-desc"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Description
            </Label>
            <Textarea
              id="upload-desc"
              placeholder="What's this video about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              data-ocid="feed.video_desc_input"
              className="glass-input bg-transparent resize-none"
            />
          </div>

          {uploadProgress > 0 && (
            <div className="space-y-2 p-3 rounded-xl" style={{background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.12)"}}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  {uploadProgress < 10 ? "Starting..." :
                   uploadProgress < 90 ? "Encoding video..." :
                   uploadProgress < 100 ? "Saving to server..." :
                   "Complete!"}
                </span>
                <span className="text-sm font-bold gradient-text">{uploadProgress}%</span>
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
              {uploadProgress < 100 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Large files may take a moment — please wait
                </p>
              )}
            </div>
          )}

          <Button
            type="submit"
            data-ocid="feed.video_submit_button"
            className="w-full rounded-2xl font-bold py-5 btn-gold border-0 text-[#1a1000]"
            disabled={uploadVideo.isPending || !videoFile || !title.trim()}
          >
            {uploadVideo.isPending ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-pulse" /> Uploading…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" /> Share Video
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
