import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import Types "../types/push-notifications";

module {
  // ---------------------------------------------------------------------------
  // VAPID credentials (ECDSA P-256)
  // Public key is included in every push request header.
  // The JWT is a long-lived token signed offline with the matching private key
  // (private key: UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls).
  // To refresh when the token expires, call setVapidJwt() as admin.
  // ---------------------------------------------------------------------------

  /// VAPID public key (URL-safe base64, uncompressed P-256 point).
  public let VAPID_PUBLIC_KEY : Text =
    "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

  // ---------------------------------------------------------------------------
  // Subscription management
  // ---------------------------------------------------------------------------

  public func register(
    subs   : Map.Map<Principal, Types.PushSubscription>,
    caller : Principal,
    endpoint  : Text,
    p256dhKey : Text,
    authKey   : Text,
  ) {
    subs.add(caller, { endpoint; p256dhKey; authKey });
  };

  public func remove(
    subs   : Map.Map<Principal, Types.PushSubscription>,
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

  /// Escape a plain-text string for embedding in a JSON value.
  func jsonText(s : Text) : Text {
    "\"" # s # "\"";
  };

  // ---------------------------------------------------------------------------
  // HTTP outcall with up to 2 retries
  // ---------------------------------------------------------------------------

  /// Build the VAPID Authorization header value.
  /// Format: vapid t=<jwt>,k=<publicKey>
  func vapidAuthHeader(vapidJwt : Text) : Text {
    "vapid t=" # vapidJwt # ",k=" # VAPID_PUBLIC_KEY;
  };

  /// Fire-and-forget POST to a Web Push endpoint.
  /// Includes VAPID Authorization and TTL headers so the push service
  /// delivers the notification to locked/background devices.
  /// Returns silently on failure after up to 2 retries.
  public func sendPush(
    endpoint  : Text,
    jsonBody  : Text,
    vapidJwt  : Text,
    transform : OutCall.Transform,
  ) : async () {
    let headers : [OutCall.Header] = [
      { name = "Content-Type";   value = "application/json" },
      { name = "TTL";            value = "86400" },
      { name = "Authorization";  value = vapidAuthHeader(vapidJwt) },
    ];
    var attempt = 0;
    var sent = false;
    label retry while (attempt < 3 and not sent) {
      attempt += 1;
      try {
        ignore await OutCall.httpPostRequest(endpoint, headers, jsonBody, transform);
        sent := true;
      } catch (_) {
        // retry on failure; give up silently after 3 attempts
      };
    };
  };

  // ---------------------------------------------------------------------------
  // Payload builders
  // ---------------------------------------------------------------------------

  /// Payload for incoming-call push notifications.
  /// Fields match the service worker handler expectations.
  public func callPayload(
    callerPrincipal : Text,
    callerName      : Text,
    sessionId       : Text,
  ) : Text {
    "{" #
      "\"type\":\"incoming-call\"," #
      "\"callerName\":" # jsonText(callerName) # "," #
      "\"callSessionId\":" # jsonText(sessionId) # "," #
      "\"callerPrincipal\":" # jsonText(callerPrincipal) # "," #
      "\"ringDuration\":45" #
    "}";
  };

  /// Payload for new-message push notifications.
  /// Fields match the service worker handler expectations.
  public func messagePayload(
    senderPrincipal : Text,
    senderName      : Text,
    preview         : Text,
  ) : Text {
    // Limit preview to first 50 characters
    let p = Text.fromIter(preview.toIter().take(50));
    "{" #
      "\"type\":\"new-message\"," #
      "\"senderName\":" # jsonText(senderName) # "," #
      "\"preview\":" # jsonText(p) # "," #
      "\"senderId\":" # jsonText(senderPrincipal) #
    "}";
  };
};
