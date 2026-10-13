import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import Types "../types/push-notifications";

module {
  // ---------------------------------------------------------------------------
  // VAPID (RFC 8292)
  // The public key is safe to publish. The matching PRIVATE key must never be
  // stored in source code or in this canister. Sign the VAPID JWT offline with
  // the private key (ES256, expiry <= 24h) and load it with setVapidJwt().
  // ---------------------------------------------------------------------------

  /// VAPID public key (URL-safe base64, uncompressed P-256 point).
  public let VAPID_PUBLIC_KEY : Text =
    "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

  // ---------------------------------------------------------------------------
  // Subscription management
  // ---------------------------------------------------------------------------

  public func register(
    subs : Map.Map<Principal, Types.PushSubscription>,
    caller : Principal,
    endpoint : Text,
    p256dhKey : Text,
    authKey : Text,
  ) {
    subs.add(caller, { endpoint; p256dhKey; authKey });
  };

  public func remove(
    subs : Map.Map<Principal, Types.PushSubscription>,
    caller : Principal,
  ) {
    subs.remove(caller);
  };

  public func get(
    subs : Map.Map<Principal, Types.PushSubscription>,
    user : Principal,
  ) : ?Types.PushSubscription {
    subs.get(user);
  };

  // ---------------------------------------------------------------------------
  // JSON helpers
  // ---------------------------------------------------------------------------

  /// Escape a string for use inside a JSON string literal.
  /// Quotes and backslashes are escaped; control characters become spaces.
  public func jsonEscape(s : Text) : Text {
    var out = "";
    for (c in s.chars()) {
      let t = Text.fromChar(c);
      let piece = if (t == "\"") { "\\\"" } else if (t == "\\") { "\\\\" } else if (c < ' ') { " " } else { t };
      out := out # piece;
    };
    out;
  };

  // ---------------------------------------------------------------------------
  // Web Push delivery
  // ---------------------------------------------------------------------------

  /// Build the VAPID Authorization header value (RFC 8292 section 3.1 form).
  func vapidAuthHeader(vapidJwt : Text) : Text {
    "vapid t=" # vapidJwt # ",k=" # VAPID_PUBLIC_KEY;
  };

  /// Sends a content-free ("tickle") Web Push to an endpoint.
  ///
  /// Why no body: a push message with a payload must be encrypted with the
  /// subscriber's keys (RFC 8291 aes128gcm). That encryption is not implemented
  /// here, so push services would reject a plaintext body. An empty push is
  /// valid, and the service worker shows a generic alert; the app loads the
  /// details from the canister when it opens.
  ///
  /// Returns true if the push service accepted the message (HTTP 2xx).
  public func sendPush(
    endpoint : Text,
    vapidJwt : Text,
    transform : OutCall.Transform,
  ) : async Bool {
    if (vapidJwt == "") { return false };
    let headers : [OutCall.Header] = [
      { name = "TTL"; value = "3600" },
      { name = "Authorization"; value = vapidAuthHeader(vapidJwt) },
    ];
    var attempt = 0;
    var sent = false;
    label retry while (attempt < 3 and not sent) {
      attempt += 1;
      try {
        let response = await OutCall.httpPostRequest(endpoint, headers, "", transform);
        sent := true;
        ignore response;
      } catch (_) {
        // Retry up to 3 times, then give up silently.
      };
    };
    sent;
  };

  // ---------------------------------------------------------------------------
  // Payload builders (kept for the in-app notification feed and for the
  // future encrypted-payload path; not sent over the wire today).
  // ---------------------------------------------------------------------------

  /// Payload for incoming-call push notifications.
  public func callPayload(
    callerPrincipal : Text,
    callerName : Text,
    sessionId : Text,
  ) : Text {
    "{" #
    "\"type\":\"incoming-call\"," #
    "\"callerName\":\"" # jsonEscape(callerName) # "\"," #
    "\"callSessionId\":\"" # jsonEscape(sessionId) # "\"," #
    "\"callerPrincipal\":\"" # jsonEscape(callerPrincipal) # "\"," #
    "\"ringDuration\":45" #
    "}";
  };

  /// Payload for new-message push notifications (preview limited to 50 chars).
  public func messagePayload(
    senderPrincipal : Text,
    senderName : Text,
    preview : Text,
  ) : Text {
    let p = Text.fromIter(Iter.take(preview.chars(), 50));
    "{" #
    "\"type\":\"new-message\"," #
    "\"senderName\":\"" # jsonEscape(senderName) # "\"," #
    "\"preview\":\"" # jsonEscape(p) # "\"," #
    "\"senderId\":\"" # jsonEscape(senderPrincipal) # "\"" #
    "}";
  };
};
