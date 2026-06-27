import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Video {
    id: string;
    title: string;
    creator: Principal;
    thumbnail?: ExternalBlob;
    file: ExternalBlob;
    description: string;
    uploadTime: Time;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export type Time = bigint;
export interface PushSubscription {
    endpoint: string;
    p256dhKey: string;
    authKey: string;
}
export type PaymentMethod = {
    __kind__: "upi";
    upi: {
        provider: string;
    };
} | {
    __kind__: "creditCard";
    creditCard: null;
} | {
    __kind__: "digitalWallet";
    digitalWallet: {
        provider: string;
    };
} | {
    __kind__: "debitCard";
    debitCard: null;
} | {
    __kind__: "netBanking";
    netBanking: {
        bank: string;
    };
};
export interface PaymentTransaction {
    status: PaymentStatus;
    paymentMethod: PaymentMethod;
    failureReason?: string;
    recipient: Principal;
    sender: Principal;
    timestamp: Time;
    amount: bigint;
    transactionId: string;
}
export interface FriendRequest {
    status: FriendRequestStatus;
    recipient: Principal;
    sender: Principal;
}
export interface ReelStats {
    shares: bigint;
    views: bigint;
    likes: bigint;
    comments: Array<Comment>;
    dislikes: bigint;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface UploadVideoRequest {
    title: string;
    thumbnail?: ExternalBlob;
    file: ExternalBlob;
    description: string;
}
export type StripeSessionStatus = {
    __kind__: "completed";
    completed: {
        userPrincipal?: string;
        response: string;
    };
} | {
    __kind__: "failed";
    failed: {
        error: string;
    };
};
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export interface SearchUsersResult {
    pendingRequests: Array<FriendRequest>;
    friends: Array<Principal>;
    profiles: Array<[Principal, UserProfile]>;
}
export interface Comment {
    text: string;
    author: string;
}
export interface Story {
    id: string;
    title: string;
    creator: Principal;
    thumbnail?: ExternalBlob;
    contentType: StoryContentType;
    file: ExternalBlob;
    uploadTime: Time;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export interface SignalingEntryPublic {
    data: string;
    sender: Principal;
    dataType: string;
}
export interface Notification {
    content: string;
    notificationType: NotificationType;
    recipient: Principal;
    isRead: boolean;
    sender: Principal;
    timestamp: Time;
    senderName: string;
}
export interface Message {
    content: string;
    recipient: Principal;
    sender: Principal;
    timestamp: Time;
    attachments?: Array<ExternalBlob>;
}
export interface UploadStoryRequest {
    title: string;
    thumbnail?: ExternalBlob;
    contentType: StoryContentType;
    file: ExternalBlob;
}
export interface UserProfile {
    bio?: string;
    balance: bigint;
    name: string;
    avatar?: ExternalBlob;
}
export enum FriendRequestStatus {
    pending = "pending",
    rejected = "rejected",
    accepted = "accepted"
}
export enum NotificationType {
    paymentNotification = "paymentNotification",
    videoCall = "videoCall",
    friendRequestAccepted = "friendRequestAccepted",
    newMessage = "newMessage",
    friendRequest = "friendRequest"
}
export enum PaymentStatus {
    pending = "pending",
    completed = "completed",
    processing = "processing",
    failed = "failed"
}
export enum StoryContentType {
    video = "video",
    image = "image"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    acceptFriendRequest(sender: Principal): Promise<void>;
    addComment(reelId: string, comment: Comment): Promise<void>;
    adminCancelPayment(transactionId: string, reason: string): Promise<void>;
    adminDeleteStory(storyId: string): Promise<void>;
    adminDeleteVideo(id: string): Promise<void>;
    adminDownload(blob: ExternalBlob): Promise<void>;
    adminGetAllPayments(): Promise<Array<PaymentTransaction>>;
    adminGetAllVideoCalls(): Promise<Array<[Principal, Principal, Time, Time]>>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    canMessageUser(targetUser: Principal): Promise<boolean>;
    cleanupExpiredStories(): Promise<bigint>;
    clearSignalingData(sessionId: string): Promise<void>;
    completePayment(transactionId: string): Promise<void>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    deleteOwnStory(storyId: string): Promise<void>;
    deleteVideo(id: string): Promise<void>;
    dislikeReel(reelId: string): Promise<void>;
    download(blob: ExternalBlob): Promise<void>;
    failPayment(transactionId: string, reason: string): Promise<void>;
    getActiveStoriesByUser(user: Principal): Promise<Array<Story>>;
    getAllActiveStories(): Promise<Array<Story>>;
    getAllComments(reelId: string): Promise<Array<Comment>>;
    getAllMessages(): Promise<Array<Message>>;
    getAllUserProfiles(): Promise<Array<[Principal, UserProfile]>>;
    getAllVideos(): Promise<Array<Video>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getFeed(): Promise<Array<Video>>;
    getFriendRequestStatus(otherUser: Principal): Promise<FriendRequestStatus>;
    getFriends(): Promise<Array<Principal>>;
    getFriendsWithProfiles(): Promise<Array<UserProfile>>;
    getImageStoriesByUser(user: Principal): Promise<Array<Story>>;
    getLogo(): Promise<ExternalBlob | null>;
    getMessagesWithUser(otherUser: Principal): Promise<Array<Message>>;
    getOtherUsersActiveStories(user: Principal): Promise<Array<Story>>;
    getOwnVideosAndStories(): Promise<{
        stories: Array<Story>;
        videos: Array<Video>;
    }>;
    getPaymentTransaction(transactionId: string): Promise<PaymentTransaction>;
    getPushSubscription(user: Principal): Promise<PushSubscription | null>;
    getReelStats(reelId: string): Promise<ReelStats>;
    getSignalingData(sessionId: string): Promise<Array<SignalingEntryPublic>>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getTotalVideoCount(): Promise<bigint>;
    getUnreadNotificationCount(): Promise<bigint>;
    getUserNotifications(): Promise<Array<Notification>>;
    getUserPaymentHistory(): Promise<Array<PaymentTransaction>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVapidPublicKey(): Promise<string>;
    getVideo(id: string): Promise<Video>;
    getVideoCallHistory(): Promise<Array<[Principal, Principal, Time, Time]>>;
    getVideoStoriesByUser(user: Principal): Promise<Array<Story>>;
    getVideosByCreator(creator: Principal): Promise<Array<Video>>;
    incrementViews(reelId: string): Promise<void>;
    initializeAccessControl(): Promise<void>;
    initiatePayment(recipient: Principal, amount: bigint, paymentMethod: PaymentMethod): Promise<string>;
    initiateVideoCall(receiver: Principal): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    likeReel(reelId: string): Promise<void>;
    markNotificationAsRead(notificationId: string): Promise<void>;
    processPayment(transactionId: string): Promise<void>;
    recordVideoCall(receiver: Principal, startTime: Time, endTime: Time): Promise<void>;
    registerPushSubscription(endpoint: string, p256dhKey: string, authKey: string): Promise<void>;
    rejectFriendRequest(sender: Principal): Promise<void>;
    removePushSubscription(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchUserProfiles(searchTerm: string): Promise<Array<[Principal, UserProfile]>>;
    searchUsers(searchTerm: string): Promise<SearchUsersResult>;
    searchVideos(searchTerm: string): Promise<Array<Video>>;
    sendFriendRequest(recipient: Principal): Promise<void>;
    sendMessage(recipient: Principal, content: string, attachments: Array<ExternalBlob> | null): Promise<void>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    setVapidJwt(jwt: string): Promise<void>;
    shareReel(reelId: string): Promise<void>;
    startChatWithUser(targetUser: Principal): Promise<string>;
    storeSignalingData(sessionId: string, dataType: string, data: string): Promise<void>;
    transferBetweenUsers(sender: Principal, recipient: Principal, amount: bigint): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateProfileImage(newAvatarFile: ExternalBlob): Promise<void>;
    uploadAvatar(file: ExternalBlob): Promise<string>;
    uploadLogo(file: ExternalBlob): Promise<void>;
    uploadStory(request: UploadStoryRequest): Promise<string>;
    uploadVideo(request: UploadVideoRequest): Promise<string>;
}
