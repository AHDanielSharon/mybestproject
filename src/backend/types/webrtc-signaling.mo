import Time "mo:core/Time";
import Principal "mo:core/Principal";

module {
  /// A single signaling exchange entry (offer / answer / ICE candidate).
  public type SignalingEntry = {
    sessionId  : Text;
    dataType   : Text;          // "offer" | "answer" | "ice"
    data       : Text;
    sender     : Principal;
    timestamp  : Time.Time;
  };

  /// Public-facing record returned by getSignalingData.
  public type SignalingEntryPublic = {
    dataType  : Text;
    data      : Text;
    sender    : Principal;
  };
};
