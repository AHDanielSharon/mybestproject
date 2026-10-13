import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Types "../types/webrtc-signaling";
import SignalingLib "../lib/webrtc-signaling";

/// WebRTC signaling relay. Only the two participants of a call session
/// (encoded in the session ID) may read or write its entries.
mixin (
  signalingData : Map.Map<Text, List.List<Types.SignalingEntry>>,
  isUser : Principal -> Bool,
) {
  func requireParticipant(caller : Principal, sessionId : Text) {
    if (not isUser(caller)) { Runtime.trap("Unauthorized: Only users can use video calls") };
    if (not SignalingLib.isParticipant(sessionId, caller)) {
      Runtime.trap("Unauthorized: You are not a participant in this call");
    };
  };

  /// Store an offer, answer, or ICE candidate for a call session.
  public shared ({ caller }) func storeSignalingData(
    sessionId : Text,
    dataType : Text,
    data : Text,
  ) : async () {
    requireParticipant(caller, sessionId);
    SignalingLib.store(signalingData, sessionId, dataType, data, caller);
  };

  /// Returns the live signaling entries for a session (participants only).
  /// Both participants poll this while a call is being set up.
  public shared query ({ caller }) func getSignalingData(
    sessionId : Text,
  ) : async [Types.SignalingEntryPublic] {
    requireParticipant(caller, sessionId);
    SignalingLib.fetch(signalingData, sessionId);
  };

  /// Removes all signaling data for a session once the call is finished.
  public shared ({ caller }) func clearSignalingData(
    sessionId : Text,
  ) : async () {
    requireParticipant(caller, sessionId);
    SignalingLib.clear(signalingData, sessionId);
  };
};
