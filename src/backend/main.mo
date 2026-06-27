import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Storage "mo:caffeineai-object-storage/Storage";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import AccessControl "mo:caffeineai-authorization/access-control";
import Stripe "mo:caffeineai-stripe/stripe";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import WebRTCSignalingAPI "mixins/webrtc-signaling-api";
import WebRTCSignalingTypes "types/webrtc-signaling";
import PushNotificationsAPI "mixins/push-notifications-api";
import PushNotificationTypes "types/push-notifications";
import PushLib "lib/push-notifications";

actor {
  include MixinObjectStorage();

  // Authorization
  let accessControlState = AccessControl.initState();

  include MixinAuthorization(accessControlState);

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  // User Profiles
  type UserProfile = {
    name : Text;
    bio : ?Text;
    avatar : ?Storage.ExternalBlob;
    balance : Nat;
  };

  stable var userProfiles : Map.Map<Principal, UserProfile> = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    // Users can view any profile (social media feature)
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getAllUserProfiles() : async [(Principal, UserProfile)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.toArray();
  };

  public query ({ caller }) func searchUserProfiles(searchTerm : Text) : async [(Principal, UserProfile)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can search profiles");
    };
    let lowerSearch = searchTerm.toLower();
    userProfiles.toArray().filter(
      func((_, profile)) {
        profile.name.toLower().contains(#text lowerSearch);
      }
    );
  };

  // Video Content
  type Video = {
    id : Text;
    creator : Principal;
    title : Text;
    description : Text;
    uploadTime : Time.Time;
    file : Storage.ExternalBlob;
    thumbnail : ?Storage.ExternalBlob;
  };

  module Video {
    public func compareByUploadTime(a : Video, b : Video) : Order.Order {
      if (a.uploadTime < b.uploadTime) { #less } else if (a.uploadTime > b.uploadTime) { #greater } else { #equal };
    };
  };

  stable var videos : Map.Map<Text, Video> = Map.empty<Text, Video>();
  stable var videoCounter : Nat = 0;

  type UploadVideoRequest = {
    title : Text;
    description : Text;
    file : Storage.ExternalBlob;
    thumbnail : ?Storage.ExternalBlob;
  };

  public shared ({ caller }) func uploadVideo(request : UploadVideoRequest) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upload videos");
    };

    let videoId = "video_" # videoCounter.toText();
    videoCounter += 1;

    let video : Video = {
      id = videoId;
      creator = caller;
      title = request.title;
      description = request.description;
      uploadTime = Time.now();
      file = request.file;
      thumbnail = request.thumbnail;
    };

    videos.add(videoId, video);
    videoId;
  };

  public query ({ caller }) func getVideo(id : Text) : async Video {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view videos");
    };
    switch (videos.get(id)) {
      case (null) { Runtime.trap("Video not found") };
      case (?video) { video };
    };
  };

  public query ({ caller }) func getAllVideos() : async [Video] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view videos");
    };
    videos.values().toArray();
  };

  public query ({ caller }) func getVideosByCreator(creator : Principal) : async [Video] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view videos");
    };
    videos.values().toArray().filter(
      func(video) {
        video.creator == creator;
      }
    );
  };

  public shared ({ caller }) func deleteVideo(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete videos");
    };
    switch (videos.get(id)) {
      case (null) { Runtime.trap("Video not found") };
      case (?video) {
        if (caller != video.creator) {
          Runtime.trap("Unauthorized: Only the video creator can delete this video");
        };
        videos.remove(id);
      };
    };
  };

  public shared ({ caller }) func adminDeleteVideo(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete any video");
    };
    switch (videos.get(id)) {
      case (null) { Runtime.trap("Video not found") };
      case (_) {
        videos.remove(id);
      };
    };
  };

  public query ({ caller }) func searchVideos(searchTerm : Text) : async [Video] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can search videos");
    };
    let lowerSearch = searchTerm.toLower();
    videos.values().toArray().filter(
      func(video) {
        video.title.toLower().contains(#text(lowerSearch)) or video.description.toLower().contains(#text(lowerSearch));
      }
    );
  };

  public query ({ caller }) func getTotalVideoCount() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view video count");
    };
    videos.size();
  };

  // Stories
  public type StoryContentType = {
    #image;
    #video;
  };

  type Story = {
    id : Text;
    creator : Principal;
    contentType : StoryContentType;
    uploadTime : Time.Time;
    title : Text;
    file : Storage.ExternalBlob;
    thumbnail : ?Storage.ExternalBlob;
  };

  module Story {
    public func compareByUploadTime(a : Story, b : Story) : Order.Order {
      if (a.uploadTime < b.uploadTime) { #less } else if (a.uploadTime > b.uploadTime) { #greater } else { #equal };
    };
  };

  stable var stories : Map.Map<Text, Story> = Map.empty<Text, Story>();
  stable var storyCounter = 0;

  type UploadStoryRequest = {
    contentType : StoryContentType;
    title : Text;
    file : Storage.ExternalBlob;
    thumbnail : ?Storage.ExternalBlob;
  };

  public shared ({ caller }) func uploadStory(request : UploadStoryRequest) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upload stories");
    };

    let storyId = "story_" # storyCounter.toText();
    storyCounter += 1;

    let story : Story = {
      id = storyId;
      creator = caller;
      contentType = request.contentType;
      uploadTime = Time.now();
      title = request.title;
      file = request.file;
      thumbnail = request.thumbnail;
    };

    stories.add(storyId, story);
    storyId;
  };

  public shared ({ caller }) func deleteOwnStory(storyId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete stories");
    };
    switch (stories.get(storyId)) {
      case (null) { Runtime.trap("Story not found") };
      case (?story) {
        if (story.creator != caller) {
          Runtime.trap("Unauthorized: Only the story creator can delete this story");
        };
        stories.remove(storyId);
      };
    };
  };

  public shared ({ caller }) func adminDeleteStory(storyId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete any story");
    };
    switch (stories.get(storyId)) {
      case (null) { Runtime.trap("Story not found") };
      case (_) {
        stories.remove(storyId);
      };
    };
  };

  public query ({ caller }) func getActiveStoriesByUser(user : Principal) : async [Story] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stories");
    };
    let currentTime = Time.now();
    stories.values().toArray().filter(
      func(story) {
        story.creator == user and (currentTime - story.uploadTime) <= 24 * 60 * 60 * 1000000000;
      }
    );
  };

  public query ({ caller }) func getAllActiveStories() : async [Story] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stories");
    };
    let currentTime = Time.now();
    stories.values().toArray().filter(
      func(story) {
        (currentTime - story.uploadTime) <= 24 * 60 * 60 * 1000000000;
      }
    );
  };

  public query ({ caller }) func getOtherUsersActiveStories(user : Principal) : async [Story] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stories");
    };
    let currentTime = Time.now();
    stories.values().toArray().filter(
      func(story) {
        story.creator != user and (currentTime - story.uploadTime) <= 24 * 60 * 60 * 1000000000;
      }
    );
  };

  public query ({ caller }) func getVideoStoriesByUser(user : Principal) : async [Story] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stories");
    };
    let currentTime = Time.now();
    stories.values().toArray().filter(
      func(story) {
        story.creator == user and story.contentType == #video and (currentTime - story.uploadTime) <= 24 * 60 * 60 * 1000000000;
      }
    );
  };

  public query ({ caller }) func getImageStoriesByUser(user : Principal) : async [Story] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stories");
    };
    let currentTime = Time.now();
    stories.values().toArray().filter(
      func(story) {
        story.creator == user and story.contentType == #image and (currentTime - story.uploadTime) <= 24 * 60 * 60 * 1000000000;
      }
    );
  };

  public shared ({ caller }) func cleanupExpiredStories() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can cleanup stories");
    };
    let currentTime = Time.now();
    let expiredStoryIds = stories.toArray().filter(
      func((id, story)) {
        (currentTime - story.uploadTime) > 24 * 60 * 60 * 1000000000;
      }
    ).map(func((id, _)) { id });

    let count = expiredStoryIds.size();
    expiredStoryIds.values().forEach(func(id) { stories.remove(id) });
    count;
  };

  public query ({ caller }) func getOwnVideosAndStories() : async {
    videos : [Video];
    stories : [Story];
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their content");
    };
    let userVideos = videos.values().toArray().filter(
      func(video) { video.creator == caller }
    );
    let currentTime = Time.now();
    let userStories : [Story] = stories.values().toArray().filter(
      func(story) {
        story.creator == caller and (currentTime - story.uploadTime) <= 24 * 60 * 60 * 1000000000;
      }
    );
    { videos = userVideos; stories = userStories };
  };

  public shared ({ caller }) func uploadAvatar(file : Storage.ExternalBlob) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upload avatars");
    };
    let fileId = "avatar_" # caller.toText() # "_" # Time.now().toText();
    fileId;
  };

  public shared ({ caller }) func updateProfileImage(newAvatarFile : Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update profile images");
    };

    var userProfile = switch (userProfiles.get(caller)) {
      case (null) {
        Runtime.trap("User profile not found");
      };
      case (?existingProfile) { existingProfile };
    };

    userProfile := {
      userProfile with avatar = ?newAvatarFile;
    };

    userProfiles.add(caller, userProfile);
  };

  // Friend Request System
  public type FriendRequestStatus = {
    #pending;
    #accepted;
    #rejected;
  };

  public type FriendRequest = {
    sender : Principal;
    recipient : Principal;
    status : FriendRequestStatus;
  };

  stable var friendRequests : Map.Map<Text, FriendRequest> = Map.empty<Text, FriendRequest>();

  public shared ({ caller }) func sendFriendRequest(recipient : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send friend requests");
    };
    if (caller == recipient) { Runtime.trap("Cannot send a friend request to yourself") };

    let requestId = caller.toText() # "_" # recipient.toText();
    let newRequest : FriendRequest = {
      sender = caller;
      recipient;
      status = #pending;
    };

    friendRequests.add(requestId, newRequest);

    let senderName = switch (userProfiles.get(caller)) {
      case (?profile) { profile.name };
      case (null) { "Unknown User" };
    };
    ignore createNotificationInternal(#friendRequest, senderName, caller, recipient, "sent you a friend request");
  };

  public shared ({ caller }) func acceptFriendRequest(sender : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can accept friend requests");
    };
    let requestId = sender.toText() # "_" # caller.toText();
    switch (friendRequests.get(requestId)) {
      case (null) { Runtime.trap("Friend request not found") };
      case (?request) {
        if (request.recipient != caller) {
          Runtime.trap("Unauthorized: You can only accept friend requests sent to you");
        };
        let updatedRequest : FriendRequest = {
          sender;
          recipient = caller;
          status = #accepted;
        };
        friendRequests.add(requestId, updatedRequest);

        let accepterName = switch (userProfiles.get(caller)) {
          case (?profile) { profile.name };
          case (null) { "Unknown User" };
        };
        ignore createNotificationInternal(#friendRequestAccepted, accepterName, caller, sender, "accepted your friend request");
      };
    };
  };

  public shared ({ caller }) func rejectFriendRequest(sender : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can reject friend requests");
    };
    let requestId = sender.toText() # "_" # caller.toText();
    switch (friendRequests.get(requestId)) {
      case (null) { Runtime.trap("Friend request not found") };
      case (?request) {
        if (request.recipient != caller) {
          Runtime.trap("Unauthorized: You can only reject friend requests sent to you");
        };
        let updatedRequest : FriendRequest = {
          sender;
          recipient = caller;
          status = #rejected;
        };
        friendRequests.add(requestId, updatedRequest);
      };
    };
  };

  public query ({ caller }) func getFriendRequestStatus(otherUser : Principal) : async FriendRequestStatus {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check friend request status");
    };
    switch (friendRequests.get(caller.toText() # "_" # otherUser.toText())) {
      case (?request) { request.status };
      case (null) {
        switch (friendRequests.get(otherUser.toText() # "_" # caller.toText())) {
          case (?request) { request.status };
          case (null) { Runtime.trap("No friend request found between users") };
        };
      };
    };
  };

  public query ({ caller }) func getFriends() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view friends");
    };
    let friendRequestsList = friendRequests.values().toArray();
    friendRequestsList.filter(
      func(request) {
        (request.sender == caller or request.recipient == caller) and request.status == #accepted;
      }
    ).map(
      func(request) {
        if (request.sender == caller) {
          request.recipient;
        } else {
          request.sender;
        };
      }
    );
  };

  public query ({ caller }) func getFriendsWithProfiles() : async [UserProfile] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view friends");
    };
    let friends = getFriendsInternal(caller);
    friends.map(
      func(friendPrincipal) {
        switch (userProfiles.get(friendPrincipal)) {
          case (?profile) { profile };
          case (null) { Runtime.trap("Profile not found for principal: " # friendPrincipal.toText()) };
        };
      }
    );
  };

  public type SearchUsersResult = {
    profiles : [(Principal, UserProfile)];
    friends : [Principal];
    pendingRequests : [FriendRequest];
  };

  public query ({ caller }) func searchUsers(searchTerm : Text) : async SearchUsersResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can search users");
    };
    let lowerSearch = searchTerm.toLower();
    let filteredProfiles = userProfiles.toArray().filter(
      func((_, profile)) {
        profile.name.toLower().contains(#text lowerSearch);
      }
    );

    let filteredFriends = getFriendsInternal(caller);

    let pendingRequests = friendRequests.toArray().filter(
      func((_, req)) {
        req.recipient == caller and req.status == #pending;
      }
    ).map(func((_, req)) { req });

    {
      profiles = filteredProfiles;
      friends = filteredFriends;
      pendingRequests = pendingRequests;
    };
  };

  func getFriendsInternal(caller : Principal) : [Principal] {
    friendRequests.values().toArray().filter(
      func(request) {
        (request.sender == caller or request.recipient == caller) and request.status == #accepted;
      }
    ).map(
      func(request) {
        if (request.sender == caller) {
          request.recipient;
        } else {
          request.sender;
        };
      }
    );
  };

  // Messaging System
  public type Message = {
    sender : Principal;
    recipient : Principal;
    content : Text;
    timestamp : Time.Time;
    attachments : ?[Storage.ExternalBlob];
  };

  stable var messageThreads : Map.Map<Text, [Message]> = Map.empty<Text, [Message]>();

  public shared ({ caller }) func sendMessage(recipient : Principal, content : Text, attachments : ?[Storage.ExternalBlob]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };
    if (caller == recipient) {
      Runtime.trap("Cannot send a message to yourself");
    };

    let threadId = getThreadId(caller, recipient);

    let newMessage : Message = {
      sender = caller;
      recipient;
      content;
      timestamp = Time.now();
      attachments;
    };

    let existingMessages = switch (messageThreads.get(threadId)) {
      case (?messages) { messages };
      case (null) { [] };
    };

    let updatedMessages = [newMessage].concat(existingMessages);
    messageThreads.add(threadId, updatedMessages);

    let senderName = switch (userProfiles.get(caller)) {
      case (?profile) { profile.name };
      case (null) { "Unknown User" };
    };
    ignore createNotificationInternal(#newMessage, senderName, caller, recipient, "You received a new message from " # senderName);

    // Fire push notification to wake recipient's device (even when app is closed)
    await sendMessagePushNotification(caller, recipient, content);
  };

  func areFriends(user1 : Principal, user2 : Principal) : Bool {
    let friendRequestsArray = friendRequests.values().toArray();
    friendRequestsArray.any(
      func(request) {
        (
          (request.sender == user1 and request.recipient == user2) or (request.sender == user2 and request.recipient == user1)
        ) and request.status == #accepted;
      }
    );
  };

  func getThreadId(user1 : Principal, user2 : Principal) : Text {
    if (user1.toText() < user2.toText()) { user1.toText() # "_" # user2.toText() } else {
      user2.toText() # "_" # user1.toText();
    };
  };

  public query ({ caller }) func getMessagesWithUser(otherUser : Principal) : async [Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view messages");
    };
    if (caller == otherUser) {
      Runtime.trap("Cannot view messages with yourself");
    };
    switch (messageThreads.get(getThreadId(caller, otherUser))) {
      case (?messages) { messages };
      case (null) { [] };
    };
  };

  public query ({ caller }) func getAllMessages() : async [Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view messages");
    };
    let allMessages = messageThreads.values().toArray().foldLeft(
      [] : [Message],
      func(acc, messages) {
        acc.concat(messages);
      },
    );
    allMessages.filter(
      func(message) {
        message.sender == caller or message.recipient == caller;
      }
    );
  };

  public query ({ caller }) func canMessageUser(targetUser : Principal) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check messaging permissions");
    };
    if (caller == targetUser) {
      return false;
    };
    true;
  };

  type ChatThread = {
    messages : [Message];
    participants : [Principal];
  };

  stable var chatThreads : Map.Map<Text, ChatThread> = Map.empty<Text, ChatThread>();

  public shared ({ caller }) func startChatWithUser(targetUser : Principal) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can start chats");
    };

    if (caller == targetUser) {
      Runtime.trap("Cannot start a chat with yourself");
    };

    let threadId = getThreadId(caller, targetUser);

    switch (chatThreads.get(threadId)) {
      case (null) {
        let newThread : ChatThread = {
          messages = [];
          participants = [caller, targetUser];
        };
        chatThreads.add(threadId, newThread);
        threadId;
      };
      case (?_) { threadId };
    };
  };

  // Reels System
  public type ReelStats = {
    likes : Nat;
    dislikes : Nat;
    comments : [Comment];
    shares : Nat;
    views : Nat;
  };

  stable var reelStats : Map.Map<Text, ReelStats> = Map.empty<Text, ReelStats>();

  public shared ({ caller }) func likeReel(reelId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like reels");
    };
    updateReelStats(reelId, func(stats) { { stats with likes = stats.likes + 1 } });
  };

  public shared ({ caller }) func dislikeReel(reelId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can dislike reels");
    };
    updateReelStats(reelId, func(stats) { { stats with dislikes = stats.dislikes + 1 } });
  };

  public type Comment = {
    author : Text;
    text : Text;
  };

  public shared ({ caller }) func addComment(reelId : Text, comment : Comment) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can comment on reels");
    };
    updateReelStats(reelId, func(stats) {
      let commentsList = List.fromArray<Comment>(stats.comments);
      commentsList.add(comment);
      { stats with comments = commentsList.toArray() };
    });
  };

  public shared ({ caller }) func shareReel(reelId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can share reels");
    };
    updateReelStats(reelId, func(stats) { { stats with shares = stats.shares + 1 } });
  };

  public shared ({ caller }) func incrementViews(reelId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view reels");
    };
    updateReelStats(reelId, func(stats) { { stats with views = stats.views + 1 } });
  };

  public shared ({ caller }) func getReelStats(reelId : Text) : async ReelStats {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view reel stats");
    };
    switch (reelStats.get(reelId)) {
      case (?stats) { stats };
      case (null) {
        let defaultStats : ReelStats = {
          likes = 0;
          dislikes = 0;
          comments = [];
          shares = 0;
          views = 0;
        };
        reelStats.add(reelId, defaultStats);
        defaultStats;
      };
    };
  };

  func updateReelStats(reelId : Text, updateFunc : ReelStats -> ReelStats) {
    let existingStats = switch (reelStats.get(reelId)) {
      case (?stats) { stats };
      case (null) {
        let defaultStats : ReelStats = {
          likes = 0;
          dislikes = 0;
          comments = [];
          shares = 0;
          views = 0;
        };
        reelStats.add(reelId, defaultStats);
        defaultStats;
      };
    };
    let updatedStats = updateFunc(existingStats);
    reelStats.add(reelId, updatedStats);
  };

  public query ({ caller }) func getAllComments(reelId : Text) : async [Comment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view comments");
    };
    switch (reelStats.get(reelId)) {
      case (?stats) { stats.comments };
      case (null) { [] };
    };
  };

  public shared ({ caller }) func download(blob : Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can download content");
    };
    ignore blob;
  };

  public shared ({ caller }) func adminDownload(blob : Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can download content");
    };
    ignore blob;
  };

  public query ({ caller }) func getFeed() : async [Video] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view feed");
    };
    videos.values().toArray();
  };

  // Notifications
  public type Notification = {
    notificationType : NotificationType;
    senderName : Text;
    sender : Principal;
    recipient : Principal;
    content : Text;
    timestamp : Time.Time;
    isRead : Bool;
  };

  public type NotificationType = {
    #friendRequest;
    #friendRequestAccepted;
    #newMessage;
    #paymentNotification;
    #videoCall;
  };

  stable var notifications : Map.Map<Text, Notification> = Map.empty<Text, Notification>();

  func createNotificationInternal(notificationType : NotificationType, senderName : Text, sender : Principal, recipient : Principal, content : Text) : Text {
    let notificationId = "notification_" # Time.now().toText();

    let notification : Notification = {
      notificationType;
      senderName;
      sender;
      recipient;
      content;
      timestamp = Time.now();
      isRead = false;
    };

    notifications.add(notificationId, notification);
    notificationId;
  };

  public shared ({ caller }) func markNotificationAsRead(notificationId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark notifications as read");
    };
    switch (notifications.get(notificationId)) {
      case (null) { Runtime.trap("Notification not found") };
      case (?notification) {
        if (notification.recipient != caller) {
          Runtime.trap("Unauthorized: You can only mark your own notifications as read");
        };
        let updatedNotification = { notification with isRead = true };
        notifications.add(notificationId, updatedNotification);
      };
    };
  };

  public query ({ caller }) func getUserNotifications() : async [Notification] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view notifications");
    };

    let currentTimestamp = Time.now();

    let filteredNotifications = notifications.values().toArray().filter(
      func(notification) {
        notification.recipient == caller and (notification.timestamp + 24 * 60 * 60 * 1000000000) >= currentTimestamp
      }
    );

    filteredNotifications.sort(
      func(a, b) {
        if (a.timestamp < b.timestamp) { #greater } else if (a.timestamp > b.timestamp) { #less } else { #equal };
      }
    );
  };

  public query ({ caller }) func getUnreadNotificationCount() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view notification count");
    };
    let unreadNotifications = notifications.values().toArray().filter(
      func(notification) { notification.recipient == caller and not notification.isRead }
    );
    unreadNotifications.size();
  };

  // Logo Management
  stable var logoFile : ?Storage.ExternalBlob = null;

  public shared ({ caller }) func uploadLogo(file : Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can upload logo");
    };
    logoFile := ?file;
  };

  // Logo is public - needed for login page (accessible to guests/anonymous users)
  public query func getLogo() : async ?Storage.ExternalBlob {
    logoFile;
  };

  // Payment System
  public type PaymentMethod = {
    #creditCard;
    #debitCard;
    #upi : { provider : Text };
    #digitalWallet : { provider : Text };
    #netBanking : { bank : Text };
  };

  public type PaymentStatus = {
    #pending;
    #processing;
    #completed;
    #failed;
  };

  public type PaymentTransaction = {
    transactionId : Text;
    sender : Principal;
    recipient : Principal;
    amount : Nat;
    paymentMethod : PaymentMethod;
    status : PaymentStatus;
    timestamp : Time.Time;
    failureReason : ?Text;
  };

  stable var paymentTransactions : Map.Map<Text, PaymentTransaction> = Map.empty<Text, PaymentTransaction>();
  stable var transactionCounter : Nat = 0;

  public shared ({ caller }) func initiatePayment(recipient : Principal, amount : Nat, paymentMethod : PaymentMethod) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can initiate payments");
    };

    if (caller == recipient) {
      Runtime.trap("Cannot send payment to yourself");
    };

    if (amount == 0) {
      Runtime.trap("Payment amount must be greater than zero");
    };

    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("User profile not found") };
      case (?senderProfile) {
        if (senderProfile.balance < amount) {
          Runtime.trap("Insufficient balance");
        };
        let transactionId = "txn_" # transactionCounter.toText();
        transactionCounter += 1;

        let transaction : PaymentTransaction = {
          transactionId;
          sender = caller;
          recipient;
          amount;
          paymentMethod;
          status = #pending;
          timestamp = Time.now();
          failureReason = null;
        };

        paymentTransactions.add(transactionId, transaction);

        let senderName = senderProfile.name;

        ignore createNotificationInternal(
          #paymentNotification,
          senderName,
          caller,
          recipient,
          "Payment of " # amount.toText() # " initiated"
        );

        let updatedProfile = { senderProfile with balance = senderProfile.balance - amount };
        userProfiles.add(caller, updatedProfile);

        transactionId;
      };
    };
  };

  public shared ({ caller }) func processPayment(transactionId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can process payments");
    };
    switch (paymentTransactions.get(transactionId)) {
      case (null) { Runtime.trap("Transaction not found") };
      case (?transaction) {
        if (transaction.sender != caller) {
          Runtime.trap("Unauthorized: Only the payment sender can process this transaction");
        };
        if (transaction.status != #pending) {
          Runtime.trap("Transaction is not in pending state");
        };
        let updatedTransaction = {
          transaction with status = #processing;
        };
        paymentTransactions.add(transactionId, updatedTransaction);
      };
    };
  };

  public shared ({ caller }) func completePayment(transactionId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can complete payments");
    };
    switch (paymentTransactions.get(transactionId)) {
      case (null) { Runtime.trap("Transaction not found") };
      case (?transaction) {
        if (transaction.sender != caller) {
          Runtime.trap("Unauthorized: Only the payment sender can complete this transaction");
        };
        if (transaction.status != #processing) {
          Runtime.trap("Transaction must be in processing state");
        };
        let updatedTransaction = {
          transaction with status = #completed;
        };
        paymentTransactions.add(transactionId, updatedTransaction);

        let senderName = switch (userProfiles.get(caller)) {
          case (?profile) { profile.name };
          case (null) { "Unknown User" };
        };
        ignore createNotificationInternal(
          #paymentNotification,
          senderName,
          caller,
          transaction.recipient,
          "Payment of " # transaction.amount.toText() # " completed successfully"
        );

        let threadId = getThreadId(caller, transaction.recipient);
        let paymentMessage : Message = {
          sender = caller;
          recipient = transaction.recipient;
          content = "Payment completed: " # transaction.amount.toText() # " (Transaction ID: " # transactionId # ")";
          timestamp = Time.now();
          attachments = null;
        };

        let existingMessages = switch (messageThreads.get(threadId)) {
          case (?messages) { messages };
          case (null) { [] };
        };
        let updatedMessages = [paymentMessage].concat(existingMessages);
        messageThreads.add(threadId, updatedMessages);

        let recipientProfile = switch (userProfiles.get(transaction.recipient)) {
          case (null) { Runtime.trap("Recipient profile not found") };
          case (?profile) { profile };
        };
        let updatedRecipientProfile = {
          recipientProfile with balance = recipientProfile.balance + transaction.amount;
        };
        userProfiles.add(transaction.recipient, updatedRecipientProfile);
      };
    };
  };

  public shared ({ caller }) func failPayment(transactionId : Text, reason : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can fail payments");
    };
    switch (paymentTransactions.get(transactionId)) {
      case (null) { Runtime.trap("Transaction not found") };
      case (?transaction) {
        if (transaction.sender != caller) {
          Runtime.trap("Unauthorized: Only the payment sender can fail this transaction");
        };
        let updatedTransaction = {
          transaction with 
          status = #failed;
          failureReason = ?reason;
        };
        paymentTransactions.add(transactionId, updatedTransaction);
        let senderName = switch (userProfiles.get(caller)) {
          case (?profile) { profile.name };
          case (null) { "Unknown User" };
        };
        ignore createNotificationInternal(
          #paymentNotification,
          senderName,
          caller,
          transaction.recipient,
          "Payment failed: " # reason
        );
      };
    };
  };

  public query ({ caller }) func getPaymentTransaction(transactionId : Text) : async PaymentTransaction {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view transactions");
    };
    switch (paymentTransactions.get(transactionId)) {
      case (null) { Runtime.trap("Transaction not found") };
      case (?transaction) {
        if (transaction.sender != caller and transaction.recipient != caller) {
          Runtime.trap("Unauthorized: You can only view your own transactions");
        };
        transaction;
      };
    };
  };

  public query ({ caller }) func getUserPaymentHistory() : async [PaymentTransaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view payment history");
    };
    paymentTransactions.values().toArray().filter(
      func(transaction) {
        transaction.sender == caller or transaction.recipient == caller;
      }
    );
  };

  public shared ({ caller }) func adminGetAllPayments() : async [PaymentTransaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all payments");
    };
    paymentTransactions.values().toArray();
  };

  public shared ({ caller }) func adminCancelPayment(transactionId : Text, reason : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can cancel payments");
    };
    switch (paymentTransactions.get(transactionId)) {
      case (null) { Runtime.trap("Transaction not found") };
      case (?transaction) {
        let updatedTransaction = {
          transaction with 
          status = #failed;
          failureReason = ?("Admin cancelled: " # reason);
        };
        paymentTransactions.add(transactionId, updatedTransaction);

        let senderName = switch (userProfiles.get(transaction.sender)) {
          case (?profile) { profile.name };
          case (null) { "Unknown User" };
        };
        ignore createNotificationInternal(
          #paymentNotification,
          senderName,
          transaction.sender,
          transaction.recipient,
          "Payment cancelled by admin: " # reason
        );

        let senderProfile = switch (userProfiles.get(transaction.sender)) {
          case (null) { Runtime.trap("Sender profile not found") };
          case (?profile) { profile };
        };
        let updatedSenderProfile = {
          senderProfile with balance = senderProfile.balance + transaction.amount;
        };
        userProfiles.add(transaction.sender, updatedSenderProfile);
      };
    };
  };

  public shared ({ caller }) func transferBetweenUsers(sender : Principal, recipient : Principal, amount : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can transfer between users");
    };
    if (sender == recipient) {
      Runtime.trap("Cannot transfer to self");
    };

    let senderProfile = switch (userProfiles.get(sender)) {
      case (null) { Runtime.trap("Sender profile not found") };
      case (?profile) { profile };
    };

    if (senderProfile.balance < amount) {
      Runtime.trap("Insufficient balance");
    };

    let updatedSenderProfile = {
      senderProfile with balance = senderProfile.balance - amount;
    };
    userProfiles.add(sender, updatedSenderProfile);

    let recipientProfile = switch (userProfiles.get(recipient)) {
      case (null) { Runtime.trap("Recipient profile not found") };
      case (?profile) { profile };
    };
    let updatedRecipientProfile = {
      recipientProfile with balance = recipientProfile.balance + amount;
    };
    userProfiles.add(recipient, updatedRecipientProfile);
  };

  // Stripe Integration
  var configuration : ?Stripe.StripeConfiguration = null;

  public query ({ caller }) func isStripeConfigured() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check Stripe configuration");
    };
    configuration != null;
  };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can configure Stripe");
    };
    configuration := ?config;
  };

  func getStripeConfiguration() : Stripe.StripeConfiguration {
    switch (configuration) {
      case (null) { Runtime.trap("Stripe needs to be first configured") };
      case (?value) { value };
    };
  };

  public shared ({ caller }) func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check Stripe session status");
    };
    await Stripe.getSessionStatus(getStripeConfiguration(), sessionId, transform);
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create checkout sessions");
    };
    await Stripe.createCheckoutSession(getStripeConfiguration(), caller, items, successUrl, cancelUrl, transform);
  };

  // Transform function is public for HTTP outcalls - accessible to all (including guests)
  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // WebRTC Signaling State
  let signalingData = Map.empty<Text, List.List<WebRTCSignalingTypes.SignalingEntry>>();
  include WebRTCSignalingAPI(signalingData);

  // Push Notification Subscriptions
  stable var pushSubscriptions : Map.Map<Principal, PushNotificationTypes.PushSubscription> = Map.empty<Principal, PushNotificationTypes.PushSubscription>();
  include PushNotificationsAPI(pushSubscriptions, transform);

  // VAPID JWT for Web Push Authorization header.
  // This is a long-lived token (signed with the VAPID private key offline).
  // Refresh by calling setVapidJwt() as admin when expired.
  // Private key: UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls
  stable var vapidJwt : Text = "";

  public shared ({ caller }) func setVapidJwt(jwt : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set the VAPID JWT");
    };
    vapidJwt := jwt;
  };

  public query ({ caller }) func getVapidPublicKey() : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    PushLib.VAPID_PUBLIC_KEY;
  };

  // ---------------------------------------------------------------------------
  // Internal push helpers (called from messaging and video call flows)
  // ---------------------------------------------------------------------------

  func sendCallPushNotification(callerPrincipal : Principal, receiver : Principal) : async () {
    switch (PushLib.get(pushSubscriptions, receiver)) {
      case (null) {};
      case (?sub) {
        let callerName = switch (userProfiles.get(callerPrincipal)) {
          case (?profile) { profile.name };
          case (null) { "Unknown User" };
        };
        let sessionId = if (callerPrincipal.toText() < receiver.toText()) {
          callerPrincipal.toText() # "_" # receiver.toText();
        } else {
          receiver.toText() # "_" # callerPrincipal.toText();
        };
        let body = PushLib.callPayload(callerPrincipal.toText(), callerName, sessionId);
        await PushLib.sendPush(sub.endpoint, body, vapidJwt, transform);
      };
    };
  };

  func sendMessagePushNotification(sender : Principal, recipient : Principal, messagePreview : Text) : async () {
    switch (PushLib.get(pushSubscriptions, recipient)) {
      case (null) {};
      case (?sub) {
        let senderName = switch (userProfiles.get(sender)) {
          case (?profile) { profile.name };
          case (null) { "Unknown User" };
        };
        let body = PushLib.messagePayload(sender.toText(), senderName, messagePreview);
        await PushLib.sendPush(sub.endpoint, body, vapidJwt, transform);
      };
    };
  };

  // Video Calling Feature
  stable var videoCallHistory : [(caller : Principal, receiver : Principal, startTime : Time.Time, endTime : Time.Time)] = [];

  public shared ({ caller }) func initiateVideoCall(receiver : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can initiate video calls");
    };

    if (caller == receiver) {
      Runtime.trap("Cannot initiate a video call with yourself");
    };

    // Verify both users exist
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Caller profile not found") };
      case (?_) {};
    };

    switch (userProfiles.get(receiver)) {
      case (null) { Runtime.trap("Receiver profile not found") };
      case (?_) {};
    };

    // Create notification for the receiver
    let callerName = switch (userProfiles.get(caller)) {
      case (?profile) { profile.name };
      case (null) { "Unknown User" };
    };

    ignore createNotificationInternal(
      #videoCall,
      callerName,
      caller,
      receiver,
      callerName # " is calling you"
    );

    // Fire push notification to wake receiver's device (even when app is closed)
    await sendCallPushNotification(caller, receiver);
  };

  public shared ({ caller }) func recordVideoCall(receiver : Principal, startTime : Time.Time, endTime : Time.Time) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can record video calls");
    };

    if (caller == receiver) {
      Runtime.trap("Cannot record a video call with yourself");
    };

    // Verify both participants are registered users
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Caller profile not found") };
      case (?_) {};
    };

    switch (userProfiles.get(receiver)) {
      case (null) { Runtime.trap("Receiver profile not found") };
      case (?_) {};
    };

    // Verify that the caller is actually one of the participants
    let newCall = (caller, receiver, startTime, endTime);
    videoCallHistory := videoCallHistory.concat([newCall]);
  };

  public query ({ caller }) func getVideoCallHistory() : async [(Principal, Principal, Time.Time, Time.Time)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view video call history");
    };

    // Filter to only show calls where the caller is a participant
    videoCallHistory.filter(
      func((callCaller, receiver, _, _)) {
        callCaller == caller or receiver == caller;
      }
    );
  };

  public shared ({ caller }) func adminGetAllVideoCalls() : async [(Principal, Principal, Time.Time, Time.Time)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all video calls");
    };
    videoCallHistory;
  };
};
