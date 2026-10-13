import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import Types "../types/push-notifications";
import PushLib "../lib/push-notifications";

/// Web Push subscription management. Subscriptions are per user and are
/// private: only the owner can read or change them.
mixin (
  pushSubscriptions : Map.Map<Principal, Types.PushSubscription>,
  transform : OutCall.Transform,
  isUser : Principal -> Bool,
) {
  /// Register or update the caller's Web Push subscription.
  /// The endpoint must be an https URL; the canister sends outcalls to it.
  public shared ({ caller }) func registerPushSubscription(
    endpoint : Text,
    p256dhKey : Text,
    authKey : Text,
  ) : async () {
    if (not isUser(caller)) { Runtime.trap("Unauthorized: Only users can register push") };
    if (not endpoint.startsWith(#text "https://") or endpoint.size() > 2048) {
      Runtime.trap("Invalid push endpoint");
    };
    PushLib.register(pushSubscriptions, caller, endpoint, p256dhKey, authKey);
  };

  /// Remove the caller's Web Push subscription (e.g. on logout).
  public shared ({ caller }) func removePushSubscription() : async () {
    PushLib.remove(pushSubscriptions, caller);
  };

  /// Read a user's push subscription. Only the owner may read it.
  public shared query ({ caller }) func getPushSubscription(user : Principal) : async ?Types.PushSubscription {
    if (caller != user) { Runtime.trap("Unauthorized: You can only read your own push subscription") };
    PushLib.get(pushSubscriptions, user);
  };
};
