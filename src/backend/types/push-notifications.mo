module {
  /// Web Push subscription stored per user.
  public type PushSubscription = {
    endpoint  : Text;
    p256dhKey : Text;
    authKey   : Text;
  };
};
