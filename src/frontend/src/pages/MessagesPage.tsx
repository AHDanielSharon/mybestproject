import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Principal } from "@icp-sdk/core/principal";
import {
  ArrowLeft,
  Camera,
  Check,
  Download,
  Edit3,
  File,
  FileText,
  Image as ImageIcon,
  MessageCircle,
  Mic,
  Music,
  Phone,
  Search,
  Send,
  Smile,
  User,
  UserPlus,
  Video as VideoIcon,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SignalingEntryPublic } from "../backend";
import { ExternalBlob, FriendRequestStatus } from "../backend";
import {
  broadcastCallNotification,
  clearCallNotification,
} from "../components/GlobalCallManager";
import VideoCallDialog, {
  IncomingCallBanner,
  deriveSessionId,
} from "../components/VideoCallDialog";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { usePushNotifications } from "../hooks/usePushNotifications";
import {
  useAcceptFriendRequest,
  useClearSignalingData,
  useGetFriends,
  useGetMessagesWithUser,
  useGetSignalingData,
  useGetUserProfile,
  useRejectFriendRequest,
  useSearchUsers,
  useSendFriendRequest,
  useSendMessage,
} from "../hooks/useQueries";
import UserProfilePage from "./UserProfilePage";
import { Strings } from "../Strings";

type View = "list" | "chat" | "profile";
type InboxTab = "chats" | "requests";

// Helper: safely get text from a Principal — works for both real and mock principals.
const pText = (p: any): string => {
  if (!p) return "";
  if (typeof p.toText === "function") return p.toText();
  return p.toString?.() ?? "";
};

type AttachmentPreview = {
  file: File;
  blob: ExternalBlob;
  type: "image" | "video" | "audio" | "document";
  url: string;
};

// ─── Sub-components ─────────────────────────────────────────────────────────

export function ConversationItem({
  friend,
  idx,
  onClick,
}: {
  friend: Principal;
  idx: number;
  onClick: () => void;
}) {
  const { data: profile } = useGetUserProfile(friend);
  const initials = profile?.name?.[0]?.toUpperCase() || "?";

  return (
    <button
      type="button"
      onClick={onClick}
      data-ocid={`messages.item.${idx + 1}`}
      className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/40 transition-colors"
    >
      <div className="relative shrink-0">
        <Avatar className="h-14 w-14">
          <AvatarImage src={profile?.avatar?.getDirectURL()} />
          <AvatarFallback
            className="text-base font-bold text-primary-foreground"
            style={{
              background:
                "linear-gradient(135deg, oklch(var(--primary)), oklch(var(--accent)))",
            }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-semibold text-foreground text-[15px] truncate">
            {profile?.name || Strings.messages.defaultUser}
          </span>
          <span className="text-[11px] text-muted-foreground ml-2 shrink-0">
            {Strings.messages.now}
          </span>
        </div>
        <p className="text-[13px] text-muted-foreground truncate">
          {Strings.messages.tapToChat}
        </p>
      </div>
    </button>
  );
}

export function StoryCircle({ friend }: { friend: Principal }) {
  const { data: profile } = useGetUserProfile(friend);
  const initials = profile?.name?.[0]?.toUpperCase() || "?";

  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div className="p-[2.5px] rounded-full story-ring">
        <div className="p-[2px] bg-background rounded-full">
          <Avatar className="h-14 w-14">
            <AvatarImage src={profile?.avatar?.getDirectURL()} />
            <AvatarFallback
              className="text-sm font-bold text-primary-foreground"
              style={{
                background:
                  "linear-gradient(135deg, oklch(var(--primary)), oklch(var(--secondary)))",
              }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
      <span className="text-[11px] text-foreground truncate w-16 text-center">
        {profile?.name?.split(" ")[0] || Strings.messages.defaultUser}
      </span>
    </div>
  );
}

export default function MessagesPage() {
  const { identity } = useInternetIdentity();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<Principal | null>(null);
  const [viewingProfile, setViewingProfile] = useState<Principal | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [currentView, setCurrentView] = useState<View>("list");
  const [inboxTab, setInboxTab] = useState<InboxTab>("chats");
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [videoCallOpen, setVideoCallOpen] = useState(false);
  const [callType, setCallType] = useState<"video" | "audio">("video");
  const [isCallInitiator, setIsCallInitiator] = useState(false);
  const [incomingCallOffer, setIncomingCallOffer] = useState<string | null>(
    null,
  );
  const [incomingCallPrincipal, setIncomingCallPrincipal] = useState<
    string | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  usePushNotifications();

  useEffect(() => {
    function handleSWMessage(event: MessageEvent) {
      if (!event.data) return;
      if (event.data.type === "INCOMING_CALL") {
        const {
          callerPrincipal,
          callSessionId,
        } = event.data;
        if (!callerPrincipal) return;
        try {
          const principal = Principal.fromText(callerPrincipal);
          setSelectedFriend(principal);
          setCurrentView("chat");
          setIsCallInitiator(false);
          setIncomingCallOffer(callSessionId || "sw-push");
          setIncomingCallPrincipal(callerPrincipal);
        } catch {
        }
      }
    }
    navigator.serviceWorker?.addEventListener("message", handleSWMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const acceptCallParam = params.get("acceptCall");
    const callerParam = params.get("caller");
    const fromParam = params.get("from");

    if (acceptCallParam && callerParam && identity) {
      try {
        const callerPrincipal = Principal.fromText(callerParam);
        setSelectedFriend(callerPrincipal);
        setCurrentView("chat");
        setIsCallInitiator(false);
        setIncomingCallPrincipal(callerParam);
        setTimeout(() => setVideoCallOpen(true), 300);
        window.history.replaceState({}, "", window.location.pathname);
      } catch {
      }
    } else if (fromParam && identity) {
      try {
        const senderPrincipal = Principal.fromText(fromParam);
        setSelectedFriend(senderPrincipal);
        setCurrentView("chat");
        window.history.replaceState({}, "", window.location.pathname);
      } catch {
      }
    }
  }, [identity]);

  const { data: searchResults } = useSearchUsers(searchTerm);
  const { data: friends = [] } = useGetFriends();
  const { data: messages = [] } = useGetMessagesWithUser(selectedFriend);
  const { data: selectedFriendProfile } = useGetUserProfile(selectedFriend);

  const sendFriendRequestMutation = useSendFriendRequest();
  const acceptFriendRequestMutation = useAcceptFriendRequest();
  const rejectFriendRequestMutation = useRejectFriendRequest();
  const sendMessageMutation = useSendMessage();
  const clearSignaling = useClearSignalingData();

  const currentUserPrincipal = identity?.getPrincipal()?.toString();

  const incomingSessionId =
    selectedFriend && currentUserPrincipal
      ? deriveSessionId(currentUserPrincipal, pText(selectedFriend))
      : "";
  const { refetch: fetchIncomingSignaling } = useGetSignalingData(
    incomingSessionId,
    false,
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (
      currentView !== "chat" ||
      !selectedFriend ||
      !currentUserPrincipal ||
      videoCallOpen
    )
      return;
    const poll = setInterval(async () => {
      try {
        const result = await fetchIncomingSignaling();
        const entries = result.data as SignalingEntryPublic[] | undefined;
        if (!entries) return;
        const offerEntry = entries.find(
          (e) =>
            e.dataType === "offer" &&
            e.sender.toString() !== currentUserPrincipal,
        );
        if (offerEntry) {
          setIncomingCallOffer(offerEntry.data);
          setIncomingCallPrincipal(pText(selectedFriend));
        } else {
          setIncomingCallOffer(null);
          setIncomingCallPrincipal(null);
        }
      } catch {
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [
    currentView,
    selectedFriend,
    currentUserPrincipal,
    videoCallOpen,
    fetchIncomingSignaling,
  ]);

  const getFileType = (
    file: File,
  ): "image" | "video" | "audio" | "document" => {
    const type = file.type;
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) return "video";
    if (type.startsWith("audio/")) return "audio";
    return "document";
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newAttachments: AttachmentPreview[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileType = getFileType(file);
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress(
        (pct) => setUploadProgress(pct),
      );
      const url = URL.createObjectURL(file);
      newAttachments.push({ file, blob, type: fileType, url });
    }
    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].url);
      next.splice(index, 1);
      return next;
    });
  };

  const handleSendMessage = () => {
    if (!selectedFriend || (!messageInput.trim() && attachments.length === 0))
      return;
    const attachmentBlobs =
      attachments.length > 0 ? attachments.map((a) => a.blob) : null;
    sendMessageMutation.mutate(
      {
        recipient: selectedFriend,
        content: messageInput.trim() || Strings.messages.attachment,
        attachments: attachmentBlobs,
      },
      {
        onSuccess: () => {
          setMessageInput("");
          for (const a of attachments) URL.revokeObjectURL(a.url);
          setAttachments([]);
          setUploadProgress(0);
          inputRef.current?.focus();
        },
      },
    );
  };

  const handleSelectChat = (friend: Principal) => {
    setSelectedFriend(friend);
    setCurrentView("chat");
  };
  const handleBackFromChat = () => {
    setSelectedFriend(null);
    setCurrentView("list");
  };
  const handleViewProfile = (principal: Principal) => {
    setViewingProfile(principal);
    setCurrentView("profile");
  };
  const handleBackFromProfile = () => {
    setViewingProfile(null);
    setCurrentView(selectedFriend ? "chat" : "list");
  };
  const handleMessageFromProfile = (principal: Principal) => {
    setSelectedFriend(principal);
    setViewingProfile(null);
    setCurrentView("chat");
  };
  const handleStartVideoCall = () => {
    if (!selectedFriend || !currentUserPrincipal) return;
    setCallType("video");
    setIsCallInitiator(true);
    setVideoCallOpen(true);
    broadcastCallNotification(pText(selectedFriend), currentUserPrincipal, "video");
  };
  const handleStartAudioCall = () => {
    if (!selectedFriend || !currentUserPrincipal) return;
    setCallType("audio");
    setIsCallInitiator(true);
    setVideoCallOpen(true);
    broadcastCallNotification(pText(selectedFriend), currentUserPrincipal, "audio");
  };
  const handleAcceptIncomingCall = () => {
    setIncomingCallOffer(null);
    setIsCallInitiator(false);
    setVideoCallOpen(true);
  };
  const handleDeclineIncomingCall = () => {
    if (incomingSessionId)
      clearSignaling.mutate({ sessionId: incomingSessionId });
    setIncomingCallOffer(null);
    setIncomingCallPrincipal(null);
  };

  const isFriend = (userPrincipal: Principal) =>
    friends.some((f) => pText(f) === pText(userPrincipal));

  const getFriendRequestStatus = (
    userPrincipal: Principal,
  ): FriendRequestStatus | null => {
    if (!searchResults) return null;
    const hasPending = searchResults.pendingRequests.some(
      (req) => pText(req.sender) === pText(userPrincipal),
    );
    if (hasPending) return FriendRequestStatus.pending;
    if (isFriend(userPrincipal)) return FriendRequestStatus.accepted;
    return null;
  };

  const formatTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMins < 1) return Strings.messages.now;
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatMsgTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const pendingRequests = searchResults?.pendingRequests ?? [];
  const isSearching = searchTerm.trim() !== "";

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (!identity || !currentUserPrincipal) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">{Strings.messages.loading}</p>
        </div>
      </div>
    );
  }

  // ─── Profile view ─────────────────────────────────────────────────────────
  if (currentView === "profile" && viewingProfile) {
    return (
      <UserProfilePage
        userPrincipal={viewingProfile}
        onBack={handleBackFromProfile}
        onMessage={handleMessageFromProfile}
      />
    );
  }

  // ─── CHAT VIEW ────────────────────────────────────────────────────────────
  if (currentView === "chat" && selectedFriend) {
    const sortedMessages = [...messages].reverse();
    return (
      <div className="flex flex-col bg-background" style={{ height: "100dvh" }}>
        {/* Chat Header */}
        <header
          className="shrink-0 z-20 border-b border-border/30"
          style={{
            background: "var(--glass-bg)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ paddingTop: "max(env(safe-area-inset-top), 8px)" }}
          >
            {/* Back */}
            <button
              type="button"
              onClick={handleBackFromChat}
              data-ocid="messages.back_button"
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted/50 active:bg-muted transition-colors shrink-0"
              aria-label={Strings.reels.goBack}
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>

            {/* Avatar + name */}
            <button
              type="button"
              onClick={() => handleViewProfile(selectedFriend)}
              className="flex items-center gap-2.5 flex-1 min-w-0 py-1"
            >
              <div className="relative shrink-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={selectedFriendProfile?.avatar?.getDirectURL()}
                  />
                  <AvatarFallback
                    className="text-sm font-bold text-primary-foreground"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(var(--primary)), oklch(var(--accent)))",
                    }}
                  >
                    {selectedFriendProfile?.name?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-semibold text-foreground text-[15px] truncate leading-tight">
                  {selectedFriendProfile?.name || Strings.messages.defaultUser}
                </p>
                <p className="text-[11px] text-green-500 leading-tight">
                  {Strings.messages.activeNow}
                </p>
              </div>
            </button>

            {/* Call icons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleStartAudioCall}
                data-ocid="audiocall.start_button"
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted/50 active:bg-muted transition-colors"
                aria-label="Audio call"
              >
                <Phone className="h-5 w-5 text-foreground" />
              </button>
              <button
                type="button"
                onClick={handleStartVideoCall}
                data-ocid="videocall.start_button"
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted/50 active:bg-muted transition-colors"
                aria-label="Video call"
              >
                <VideoIcon className="h-5 w-5 text-foreground" />
              </button>
            </div>
          </div>
        </header>

        {/* ── Messages scroll area ── */}
        <div
          className="flex-1 overflow-y-auto hide-scrollbar"
          style={{ paddingBottom: "76px" }}
        >
          <div className="px-3 py-4 space-y-1">
            {sortedMessages.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-24 space-y-4"
                data-ocid="messages.empty_state"
              >
                <div className="w-20 h-20 rounded-full glass-card flex items-center justify-center animate-floating">
                  <MessageCircle className="w-9 h-9 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">
                    {Strings.messages.startConversation}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {Strings.messages.sayHiTo(selectedFriendProfile?.name || Strings.messages.defaultUser)}
                  </p>
                </div>
              </div>
            ) : (
              sortedMessages.filter(m => m?.sender).map((message, idx) => {
                const isOwn =
                  message.sender ? pText(message.sender) === currentUserPrincipal : false;
                const prevMessage = idx > 0 ? sortedMessages[idx - 1] : null;
                const isNewGroup =
                  !prevMessage ||
                  !prevMessage.sender ||
                  pText(prevMessage.sender) !== pText(message.sender);
                const showAvatar = !isOwn && isNewGroup;

                return (
                  <div
                    key={`${message.sender.toString()}-${idx}`}
                    className={`flex items-end gap-1.5 ${
                      isOwn ? "justify-end" : "justify-start"
                    } ${isNewGroup ? "mt-3" : "mt-0.5"} fade-in-spring`}
                    style={{ animationDelay: `${Math.min(idx * 15, 200)}ms` }}
                  >
                    {!isOwn && (
                      <div className="w-7 shrink-0 self-end mb-1">
                        {showAvatar ? (
                          <Avatar className="h-7 w-7">
                            <AvatarImage
                              src={selectedFriendProfile?.avatar?.getDirectURL()}
                            />
                            <AvatarFallback className="text-[10px] bg-muted">
                              {selectedFriendProfile?.name?.[0]?.toUpperCase() ||
                                "?"}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-7" />
                        )}
                      </div>
                    )}

                    <div className="max-w-[75%] space-y-0.5">
                      <div
                        className={`px-3.5 py-2.5 text-white ${
                          isOwn
                            ? "rounded-2xl rounded-br-sm ml-auto"
                            : "rounded-2xl rounded-bl-sm mr-auto bg-zinc-800 dark:bg-zinc-700"
                        }`}
                        style={
                          isOwn
                            ? {
                                background:
                                  "linear-gradient(135deg, oklch(0.88 0.12 85), oklch(0.80 0.17 70), oklch(0.65 0.20 45))",
                                boxShadow: "0 3px 12px oklch(0.80 0.17 70 / 0.35)",
                                color: "#1a1000",
                                fontWeight: 500,
                              }
                            : undefined
                        }
                      >
                        {message.content && (
                          <p className="text-[14px] break-words leading-relaxed">
                            {message.content}
                          </p>
                        )}
                        {message.attachments &&
                          message.attachments.length > 0 && (
                            <div className="mt-1.5 space-y-1.5">
                              {message.attachments.map((attachment, attIdx) => (
                                <MessageAttachment
                                  key={
                                    attachment.getDirectURL() ||
                                    `attachment-${attIdx}`
                                  }
                                  attachment={attachment}
                                  isOwn={isOwn}
                                />
                              ))}
                            </div>
                          )}
                      </div>
                      <p
                        className={`text-[10px] px-1 text-muted-foreground ${
                          isOwn ? "text-right" : "text-left"
                        }`}
                      >
                        {formatMsgTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── Floating input bar ── */}
        <div
          className="fixed left-0 right-0 z-30 border-t border-zinc-800 md:bottom-0"
          style={{
            bottom: "64px",
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
          }}
        >
          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="px-3 pt-2">
              <div className="flex gap-2 flex-wrap">
                {attachments.map((attachment, idx) => (
                  <AttachmentPreviewCard
                    key={`${attachment.file.name}-${attachment.type}`}
                    attachment={attachment}
                    onRemove={() => removeAttachment(idx)}
                  />
                ))}
              </div>
              {sendMessageMutation.isPending &&
                uploadProgress > 0 && (
                  <div className="mt-1.5">
                    <Progress value={uploadProgress} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground mt-0.5 text-center">
                      {uploadProgress < 80 ? Strings.messages.encoding :
                       uploadProgress < 100 ? Strings.messages.saving :
                       Strings.messages.complete} {uploadProgress}%
                    </p>
                  </div>
                )}
            </div>
          )}

          {/* Input row */}
          <div className="flex items-center gap-2 px-3 py-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sendMessageMutation.isPending}
              data-ocid="messages.upload_button"
              className="flex items-center justify-center w-11 h-11 rounded-full shrink-0 disabled:opacity-50 active:bg-muted/40 transition-colors"
              aria-label="Attach media"
            >
              <Camera className="h-6 w-6 text-muted-foreground" />
            </button>

            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                placeholder={Strings.messages.inputPlaceholder}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={sendMessageMutation.isPending}
                data-ocid="messages.input"
                className="w-full bg-zinc-900 border border-zinc-700 px-4 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-zinc-500 rounded-full transition-colors"
              />
            </div>

            {messageInput.trim() === "" && attachments.length === 0 ? (
              <button
                type="button"
                className="flex items-center justify-center w-11 h-11 rounded-full shrink-0 active:bg-muted/40 transition-colors"
                aria-label="Voice message"
              >
                <Mic className="h-6 w-6 text-muted-foreground" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={
                  (!messageInput.trim() && attachments.length === 0) ||
                  sendMessageMutation.isPending
                }
                data-ocid="messages.submit_button"
                className="flex items-center justify-center w-11 h-11 rounded-full shrink-0 transition-all duration-200 disabled:opacity-40 active:scale-95 btn-gold border-0"
                aria-label="Send message"
              >
                <Send className="h-4.5 w-4.5 text-[#1a1000]" />
              </button>
            )}
          </div>
        </div>

        {incomingCallOffer && incomingCallPrincipal && !videoCallOpen && (
          <IncomingCallBanner
            callerName={selectedFriendProfile?.name || "Someone"}
            onAccept={handleAcceptIncomingCall}
            onDecline={handleDeclineIncomingCall}
          />
        )}

        {selectedFriend && currentUserPrincipal && (
          <VideoCallDialog
            isOpen={videoCallOpen}
            onClose={() => {
              setVideoCallOpen(false);
              setIncomingCallOffer(null);
              setIncomingCallPrincipal(null);
              if (selectedFriend) clearCallNotification(pText(selectedFriend));
            }}
            recipientPrincipal={pText(selectedFriend)}
            callerPrincipal={currentUserPrincipal}
            isInitiator={isCallInitiator}
            recipientName={selectedFriendProfile?.name}
          />
        )}
      </div>
    );
  }

  // ─── LIST VIEW ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-background" style={{ height: "100dvh" }}>
      <header
        className="shrink-0 z-10 border-b border-border/40"
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
        }}
      >
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-black text-foreground tracking-tight gradient-text">
              {Strings.messages.title}
            </h1>
            <button
              type="button"
              className="glass-btn flex items-center justify-center w-10 h-10 rounded-full touch-target"
              aria-label="New message"
              data-ocid="messages.compose_button"
            >
              <Edit3 className="h-4.5 w-4.5 text-primary" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder={Strings.messages.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-ocid="messages.search_input"
              className="w-full glass-input text-[14px] pl-11 pr-10 py-2.5 rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors touch-target flex items-center justify-center"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {!isSearching && (
            <div className="flex gap-1 mt-3">
              <TabButton
                label={Strings.messages.tabChats}
                active={inboxTab === "chats"}
                onClick={() => setInboxTab("chats")}
                badge={friends.length > 0 ? friends.length : undefined}
                ocid="messages.chats.tab"
              />
              <TabButton
                label={Strings.messages.tabRequests}
                active={inboxTab === "requests"}
                onClick={() => setInboxTab("requests")}
                badge={
                  pendingRequests.length > 0
                    ? pendingRequests.length
                    : undefined
                }
                ocid="messages.requests.tab"
              />
            </div>
          )}
        </div>
      </header>

      <div
        className="flex-1 overflow-y-auto hide-scrollbar"
        style={{ paddingBottom: "72px" }}
      >
        {isSearching ? (
          <div className="px-4 py-3 space-y-4">
            {pendingRequests.length > 0 && (
              <section>
                <SectionLabel label={Strings.messages.friendRequests} accent="pink" />
                <div className="space-y-2">
                  {pendingRequests.filter(r => r?.sender).map((request) => (
                    <FriendRequestItem
                      key={pText(request.sender)}
                      request={request}
                      onAccept={() =>
                        acceptFriendRequestMutation.mutate(request.sender)
                      }
                      onReject={() =>
                        rejectFriendRequestMutation.mutate(request.sender)
                      }
                      onViewProfile={() => handleViewProfile(request.sender)}
                      isAccepting={acceptFriendRequestMutation.isPending}
                      isRejecting={rejectFriendRequestMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            )}

            <section>
              <SectionLabel
                label={`${Strings.messages.people}${searchResults ? ` (${searchResults.profiles.length})` : ""}`}
              />
              {searchResults && searchResults.profiles.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.profiles.map(([principal, profile], idx) => {
                    const isOwnProfile =
                      currentUserPrincipal === pText(principal);
                    const friendStatus = getFriendRequestStatus(principal);
                    const isFriendUser = isFriend(principal);
                    return (
                      <div
                        key={pText(principal)}
                        data-ocid={`messages.item.${idx + 1}`}
                        className="flex items-center gap-3 p-3 rounded-2xl glass-surface spring-interactive"
                      >
                        <button
                          type="button"
                          onClick={() => handleViewProfile(principal)}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          <Avatar className="h-12 w-12 ring-2 ring-border/50 shrink-0">
                            <AvatarImage src={profile.avatar?.getDirectURL()} />
                            <AvatarFallback className="bg-primary/20 text-primary font-bold">
                              {profile.name[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate text-sm">
                              {profile.name}
                            </p>
                            {profile.bio && (
                              <p className="text-xs text-muted-foreground truncate">
                                {profile.bio}
                              </p>
                            )}
                            {isOwnProfile && (
                              <Badge
                                variant="secondary"
                                className="mt-1 text-[10px]"
                              >
                                {Strings.explore.you}
                              </Badge>
                            )}
                          </div>
                        </button>
                        {!isOwnProfile && (
                          <div className="shrink-0">
                            {friendStatus === FriendRequestStatus.accepted ||
                            isFriendUser ? (
                              <button
                                type="button"
                                data-ocid={`messages.primary_button.${idx + 1}`}
                                onClick={() => {
                                  setSelectedFriend(principal);
                                  setCurrentView("chat");
                                }}
                                className="px-4 py-2 rounded-full text-xs font-semibold text-primary-foreground btn-spring"
                                style={{
                                  background:
                                    "linear-gradient(135deg, oklch(var(--primary)), oklch(var(--accent)))",
                                }}
                              >
                                {Strings.messages.message}
                              </button>
                            ) : friendStatus === FriendRequestStatus.pending ? (
                              <div className="px-3 py-1.5 rounded-full text-xs font-semibold text-muted-foreground glass-surface flex items-center gap-1">
                                <Check className="h-3 w-3" /> {Strings.messages.sent}
                              </div>
                            ) : (
                              <button
                                type="button"
                                data-ocid={`messages.secondary_button.${idx + 1}`}
                                onClick={() =>
                                  sendFriendRequestMutation.mutate(principal)
                                }
                                disabled={sendFriendRequestMutation.isPending}
                                className="px-3 py-1.5 rounded-full text-xs font-semibold glass-btn flex items-center gap-1.5 disabled:opacity-50 btn-spring"
                              >
                                <UserPlus className="h-3 w-3" /> {Strings.messages.add}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  className="text-center py-12 space-y-3"
                  data-ocid="messages.empty_state"
                >
                  <Search className="w-10 h-10 text-muted-foreground/50 mx-auto" />
                  <p className="text-muted-foreground text-sm">
                    {Strings.messages.noUsersFound(searchTerm)}
                  </p>
                </div>
              )}
            </section>
          </div>
        ) : inboxTab === "requests" ? (
          <div className="px-4 py-3">
            {pendingRequests.length > 0 ? (
              <div className="space-y-2">
                {pendingRequests.map((request) => (
                  <FriendRequestItem
                    key={request.sender.toString()}
                    request={request}
                    onAccept={() =>
                      acceptFriendRequestMutation.mutate(request.sender)
                    }
                    onReject={() =>
                      rejectFriendRequestMutation.mutate(request.sender)
                    }
                    onViewProfile={() => handleViewProfile(request.sender)}
                    isAccepting={acceptFriendRequestMutation.isPending}
                    isRejecting={rejectFriendRequestMutation.isPending}
                  />
                ))}
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center py-24 space-y-4"
                data-ocid="messages.empty_state"
              >
                <div className="w-20 h-20 rounded-full glass-card flex items-center justify-center animate-floating">
                  <UserPlus className="w-9 h-9 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-foreground">
                    {Strings.messages.noPendingRequests}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {Strings.messages.requestsDesc}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-2">
            {friends.length > 0 ? (
              <>
                <div className="px-4 pb-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                    {Strings.messages.quickMessage}
                  </p>
                  <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
                    {friends.slice(0, 10).map((friend) => (
                      <QuickAvatarItem
                        key={friend.toString()}
                        friend={friend}
                        onClick={() => handleSelectChat(friend)}
                      />
                    ))}
                  </div>
                </div>

                <div className="h-px bg-border/30 mx-4 mb-2" />

                <div>
                  {friends.map((friend, idx) => (
                    <div
                      key={friend.toString()}
                      data-ocid={`messages.item.${idx + 1}`}
                      className="fade-in-spring"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <FriendChatItem
                        friend={friend}
                        onClick={() => handleSelectChat(friend)}
                        onViewProfile={() => handleViewProfile(friend)}
                        formatTime={formatTime}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div
                className="flex flex-col items-center justify-center py-24 space-y-5 px-6"
                data-ocid="messages.empty_state"
              >
                <div className="w-24 h-24 rounded-full glass-card flex items-center justify-center animate-floating">
                  <MessageCircle className="w-11 h-11 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-foreground text-lg">
                    {Strings.messages.noMessagesYet}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-[260px]">
                    {Strings.messages.noMessagesDesc}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TabButton({
  label,
  active,
  onClick,
  badge,
  ocid,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
  ocid: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-ocid={ocid}
      className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-200 btn-spring ${
        active
          ? "text-primary-foreground"
          : "text-muted-foreground glass-surface"
      }`}
      style={
        active
          ? {
              background:
                "linear-gradient(135deg, oklch(var(--primary)), oklch(var(--secondary)))",
              boxShadow: "0 4px 12px oklch(var(--primary) / 0.35)",
            }
          : undefined
      }
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span
          className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1 ${
            active
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-primary/20 text-primary"
          }`}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

function SectionLabel({ label, accent }: { label: string; accent?: "pink" }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h3
        className={`text-[11px] font-bold uppercase tracking-widest ${
          accent === "pink" ? "text-destructive" : "text-muted-foreground"
        }`}
      >
        {label}
      </h3>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}

function QuickAvatarItem({
  friend,
  onClick,
}: {
  friend: Principal;
  onClick: () => void;
}) {
  const { data: profile } = useGetUserProfile(friend);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 shrink-0 btn-spring"
      style={{ minWidth: "56px" }}
    >
      <div className="relative">
        <Avatar className="h-14 w-14 ring-2 ring-primary/40">
          <AvatarImage src={profile?.avatar?.getDirectURL()} />
          <AvatarFallback className="bg-primary/20 text-primary font-bold">
            {profile?.name?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
      </div>
      <span className="text-[11px] text-foreground font-medium truncate w-14 text-center">
        {profile?.name?.split(" ")[0] || Strings.messages.defaultUser}
      </span>
    </button>
  );
}

function FriendChatItem({
  friend,
  onClick,
  onViewProfile,
  formatTime,
}: {
  friend: Principal;
  onClick: () => void;
  onViewProfile: () => void;
  formatTime: (t: bigint) => string;
}) {
  const { data: profile } = useGetUserProfile(friend);
  const { data: messages = [] } = useGetMessagesWithUser(friend);
  const { identity } = useInternetIdentity();

  const lastMessage = messages[0];
  const currentUserPrincipal = identity?.getPrincipal()?.toString();
  const isOwn =
    lastMessage && currentUserPrincipal && lastMessage.sender
      ? pText(lastMessage.sender) === currentUserPrincipal
      : false;

  const getPreview = () => {
    if (!lastMessage) return Strings.messages.tapToStartChatting;
    if (lastMessage.attachments && lastMessage.attachments.length > 0)
      return `📎 ${lastMessage.content || Strings.messages.attachment}`;
    return lastMessage.content;
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 spring-interactive transition-all active:bg-muted/30">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <div className="relative shrink-0">
          <Avatar className="h-14 w-14">
            <AvatarImage src={profile?.avatar?.getDirectURL()} />
            <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
              {profile?.name?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className="font-semibold text-foreground truncate text-[15px]">
              {profile?.name || Strings.messages.defaultUser}
            </p>
            {lastMessage && (
              <span className="text-[11px] text-muted-foreground shrink-0">
                {formatTime(lastMessage.timestamp)}
              </span>
            )}
          </div>
          <p className="text-[13px] text-muted-foreground truncate">
            {isOwn && lastMessage ? "You: " : ""}
            {getPreview()}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onViewProfile();
        }}
        className="glass-btn flex items-center justify-center w-8 h-8 rounded-full shrink-0"
        aria-label="View profile"
      >
        <User className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}

function FriendRequestItem({
  request,
  onAccept,
  onReject,
  onViewProfile,
  isAccepting,
  isRejecting,
}: {
  request: { sender: Principal };
  onAccept: () => void;
  onReject: () => void;
  onViewProfile: () => void;
  isAccepting: boolean;
  isRejecting: boolean;
}) {
  const { data: profile } = useGetUserProfile(request.sender);
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl glass-surface">
      <button
        type="button"
        onClick={onViewProfile}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <Avatar className="h-12 w-12 shrink-0 ring-2 ring-destructive/30">
          <AvatarImage src={profile?.avatar?.getDirectURL()} />
          <AvatarFallback className="bg-destructive/20 text-destructive font-bold">
            {profile?.name?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate text-[15px]">
            {profile?.name || Strings.messages.unknownUser}
          </p>
          <p className="text-[12px] text-muted-foreground">{Strings.messages.wantsToConnect}</p>
        </div>
      </button>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={onAccept}
          disabled={isAccepting || isRejecting}
          data-ocid="messages.confirm_button"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20 text-green-500 hover:bg-green-500/30 transition-colors btn-spring disabled:opacity-50 touch-target"
          aria-label="Accept friend request"
        >
          <Check className="h-4.5 w-4.5" />
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={isAccepting || isRejecting}
          data-ocid="messages.cancel_button"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors btn-spring disabled:opacity-50 touch-target"
          aria-label="Decline friend request"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  );
}

function AttachmentPreviewCard({
  attachment,
  onRemove,
}: {
  attachment: AttachmentPreview;
  onRemove: () => void;
}) {
  const getIcon = () => {
    switch (attachment.type) {
      case "image":
        return <ImageIcon className="h-4 w-4" />;
      case "video":
        return <VideoIcon className="h-4 w-4" />;
      case "audio":
        return <Music className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };
  return (
    <div className="relative group">
      <div className="flex items-center gap-2 glass-surface rounded-xl p-2 pr-8">
        {attachment.type === "image" ? (
          <img
            src={attachment.url}
            alt="Preview"
            className="h-10 w-10 object-cover rounded-lg"
          />
        ) : (
          <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center">
            {getIcon()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{attachment.file.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {(attachment.file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      </div>
      <button
        type="button"
        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
        onClick={onRemove}
        aria-label="Remove attachment"
      >
        <XCircle className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function MessageAttachment({
  attachment,
  isOwn,
}: {
  attachment: ExternalBlob;
  isOwn: boolean;
}) {
  const [mediaType, setMediaType] = useState<
    "image" | "video" | "audio" | "document"
  >("document");
  const [isLoading, setIsLoading] = useState(true);
  const url = attachment.getDirectURL();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(url, { method: "HEAD" });
        const ct = res.headers.get("content-type") || "";
        if (ct.startsWith("image/")) setMediaType("image");
        else if (ct.startsWith("video/")) setMediaType("video");
        else if (ct.startsWith("audio/")) setMediaType("audio");
      } catch {
      } finally {
        setIsLoading(false);
      }
    })();
  }, [url]);

  if (isLoading)
    return (
      <div className="flex items-center justify-center p-3 rounded-xl glass-surface">
        <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      </div>
    );

  if (mediaType === "image")
    return (
      <button
        type="button"
        onClick={() => window.open(url, "_blank")}
        className="block"
      >
        <img
          src={url}
          alt="Attachment"
          className="max-w-full rounded-xl hover:opacity-90 transition-opacity"
          style={{ maxHeight: "220px" }}
        />
      </button>
    );

  if (mediaType === "video")
    return (
      <video
        src={url}
        controls
        className="max-w-full rounded-xl"
        style={{ maxHeight: "220px" }}
      />
    );

  if (mediaType === "audio")
    return (
      <div
        className={`flex items-center gap-2 p-2 rounded-xl ${
          isOwn ? "bg-primary-foreground/10" : "glass-surface"
        }`}
      >
        <Music className="h-4 w-4 shrink-0" />
        <audio src={url} controls className="flex-1" />
      </div>
    );

  return (
    <a
      href={url}
      download
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 p-2.5 rounded-xl ${
        isOwn ? "bg-primary-foreground/10" : "glass-surface"
      } hover:opacity-80 transition-opacity`}
    >
      <File className="h-4 w-4" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium">{Strings.messages.document}</p>
        <p className="text-[10px] opacity-70">{Strings.messages.tapToDownload}</p>
      </div>
      <Download className="h-3.5 w-3.5" />
    </a>
  );
}
