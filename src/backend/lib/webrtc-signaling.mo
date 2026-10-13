import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Types "../types/webrtc-signaling";

module {
  /// Limits that keep signaling storage bounded.
  public let MAX_DATA_CHARS : Nat = 20_000;      // an SDP offer or ICE candidate is far smaller
  public let MAX_ENTRIES_PER_SESSION : Nat = 200;
  public let ENTRY_TTL_NS : Int = 600_000_000_000; // 10 minutes in nanoseconds

  /// Returns the deterministic session ID for two principals.
  /// Lexicographically sorts both principals so either side produces the same key.
  public func sessionId(a : Principal, b : Principal) : Text {
    let ta = a.toText();
    let tb = b.toText();
    if (ta < tb) { ta # "_" # tb } else { tb # "_" # ta };
  };

  /// True if `caller` is one of the two principals encoded in `sessionId`.
  /// Principal text never contains "_", so a valid session ID has exactly two parts.
  public func isParticipant(sessionId : Text, caller : Principal) : Bool {
    let me = caller.toText();
    let parts = Iter.toArray(sessionId.split(#char '_'));
    parts.size() == 2 and (parts[0] == me or parts[1] == me);
  };

  public func isValidDataType(dataType : Text) : Bool {
    dataType == "offer" or dataType == "answer" or dataType == "ice";
  };

  /// Appends a new signaling entry to the session bucket and drops expired entries.
  public func store(
    signalingData : Map.Map<Text, List.List<Types.SignalingEntry>>,
    sessionId : Text,
    dataType : Text,
    data : Text,
    sender : Principal,
  ) {
    if (not isValidDataType(dataType)) { Runtime.trap("Invalid signaling data type") };
    if (data.size() > MAX_DATA_CHARS) { Runtime.trap("Signaling payload too large") };
    let now = Time.now();
    let entry : Types.SignalingEntry = {
      sessionId;
      dataType;
      data;
      sender;
      timestamp = now;
    };
    let bucket = switch (signalingData.get(sessionId)) {
      case (?existing) { existing };
      case (null) { List.empty<Types.SignalingEntry>() };
    };
    // Drop expired entries, add the new one, then keep only the newest MAX entries.
    let fresh = bucket.filter(func(e : Types.SignalingEntry) : Bool { now - e.timestamp <= ENTRY_TTL_NS });
    fresh.add(entry);
    let arr = fresh.toArray();
    let start : Nat = if (arr.size() > MAX_ENTRIES_PER_SESSION) { arr.size() - MAX_ENTRIES_PER_SESSION } else { 0 };
    let kept = Array.tabulate<Types.SignalingEntry>(arr.size() - start, func(i) { arr[start + i] });
    signalingData.add(sessionId, List.fromArray<Types.SignalingEntry>(kept));
  };

  /// Returns all live entries for a session as a public array.
  public func fetch(
    signalingData : Map.Map<Text, List.List<Types.SignalingEntry>>,
    sessionId : Text,
  ) : [Types.SignalingEntryPublic] {
    let now = Time.now();
    switch (signalingData.get(sessionId)) {
      case (null) { [] };
      case (?bucket) {
        bucket.filter(func(e : Types.SignalingEntry) : Bool { now - e.timestamp <= ENTRY_TTL_NS })
          .map<Types.SignalingEntry, Types.SignalingEntryPublic>(
            func(e) { { dataType = e.dataType; data = e.data; sender = e.sender } }
          )
          .toArray();
      };
    };
  };

  /// Removes all entries for a session.
  public func clear(
    signalingData : Map.Map<Text, List.List<Types.SignalingEntry>>,
    sessionId : Text,
  ) {
    signalingData.remove(sessionId);
  };
};
