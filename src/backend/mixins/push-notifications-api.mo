import Map "mo:core/Map";
import Principal "mo:core/Principal";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import Types "../types/push-notifications";
import PushLib "../lib/push-notifications";

mixin (
  pushSubscriptions : Map.Map<Principal, Types.PushSubscription>,
  transform         : OutCall.Transform,
) {
  /// Register or update the caller's Web Push subscription.
  public shared ({ caller }) func registerPushSubscription(
    endpoint  : Text,
    p256dhKey : Text,
    authKey   : Text,
  ) : async () {
    PushLib.register(pushSubscriptions, caller, endpoint, p256dhKey, authKey);
  };

  /// Remove the caller's Web Push subscription (e.g. on logout).
  public shared ({ caller }) func removePushSubscription() : async () {
    PushLib.remove(pushSubscriptions, caller);
  };

  /// Look up any user's push subscription (used internally by the backend).
  public query func getPushSubscription(user : Principal) : async ?Types.PushSubscription {
    PushLib.get(pushSubscriptions, user);
  };
};
