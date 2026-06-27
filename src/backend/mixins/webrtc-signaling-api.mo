import Map "mo:core/Map";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import Types "../types/webrtc-signaling";
import SignalingLib "../lib/webrtc-signaling";

mixin (
  signalingData : Map.Map<Text, List.List<Types.SignalingEntry>>
) {
  /// Store an offer, answer, or ICE candidate for a call session.
  /// sessionId should be derived from both participant principals.
  public shared ({ caller }) func storeSignalingData(
    sessionId : Text,
    dataType  : Text,
    data      : Text,
  ) : async () {
    SignalingLib.store(signalingData, sessionId, dataType, data, caller);
  };

  /// Returns all signaling entries recorded for a session.
  /// Both participants may poll this every 2 seconds.
  public query ({ caller }) func getSignalingData(
    sessionId : Text,
  ) : async [Types.SignalingEntryPublic] {
    SignalingLib.fetch(signalingData, sessionId);
  };

  /// Removes all signaling data for a session once the call is finished.
  public shared ({ caller }) func clearSignalingData(
    sessionId : Text,
  ) : async () {
    SignalingLib.clear(signalingData, sessionId);
  };
};
