import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Types "../types/webrtc-signaling";

module {
  /// Returns the deterministic session ID for two principals.
  /// Lexicographically sorts both principals so either side produces the same key.
  public func sessionId(a : Principal, b : Principal) : Text {
    let ta = a.toText();
    let tb = b.toText();
    if (ta < tb) { ta # "_" # tb } else { tb # "_" # ta };
  };

  /// Appends a new signaling entry to the session bucket.
  public func store(
    signalingData : Map.Map<Text, List.List<Types.SignalingEntry>>,
    sessionId     : Text,
    dataType      : Text,
    data          : Text,
    sender        : Principal,
  ) {
    let entry : Types.SignalingEntry = {
      sessionId;
      dataType;
      data;
      sender;
      timestamp = Time.now();
    };
    let bucket = switch (signalingData.get(sessionId)) {
      case (?existing) { existing };
      case (null) { List.empty<Types.SignalingEntry>() };
    };
    bucket.add(entry);
    signalingData.add(sessionId, bucket);
  };

  /// Returns all entries for a session as a public array.
  public func fetch(
    signalingData : Map.Map<Text, List.List<Types.SignalingEntry>>,
    sessionId     : Text,
  ) : [Types.SignalingEntryPublic] {
    switch (signalingData.get(sessionId)) {
      case (null) { [] };
      case (?bucket) {
        bucket.toArray().map<Types.SignalingEntry, Types.SignalingEntryPublic>(
          func(e) { { dataType = e.dataType; data = e.data; sender = e.sender } }
        );
      };
    };
  };

  /// Removes all entries for a session.
  public func clear(
    signalingData : Map.Map<Text, List.List<Types.SignalingEntry>>,
    sessionId     : Text,
  ) {
    signalingData.remove(sessionId);
  };
};
