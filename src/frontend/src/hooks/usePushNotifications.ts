/**
 * usePushNotifications — Web Push API hook for SOCIONET
 *
 * SETUP:
 *   VITE_VAPID_PUBLIC_KEY env var is optional — a hardcoded fallback key
 *   is used automatically so push works without any environment configuration.
 */

import { useEffect, useRef } from "react";
import { useRegisterPushSubscription } from "./useQueries";

/** Convert a URL-safe base64 VAPID public key to a Uint8Array for the PushManager. */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

/**
 * VAPID public key.
 * Tries the env var first; falls back to the hardcoded key so push works
 * even when the build env var is not set.
 */
const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ||
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

/**
 * Registers this browser with the Web Push service and stores the
 * subscription endpoint + keys in the SOCIONET backend canister.
 *
 * Automatically subscribes when the hook mounts (i.e. when the user is
 * authenticated and the component renders). Safe to call multiple times —
 * subsequent calls are de-duplicated via the attemptedRef guard.
 */
export function usePushNotifications() {
  const registerMutation = useRegisterPushSubscription();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    if (!VAPID_PUBLIC_KEY) {
      console.warn(
        "[Push] No VAPID public key available. Web Push notifications are disabled.",
      );
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn(
        "[Push] Browser does not support Service Workers or PushManager.",
      );
      return;
    }

    (async () => {
      try {
        // 1. Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.info("[Push] Notification permission not granted.");
          return;
        }

        // 2. Wait for the active service worker
        const registration = await navigator.serviceWorker.ready;

        // 3. Re-use an existing subscription if present (avoids duplicate regs)
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          await sendSubscriptionToBackend(
            existing,
            registerMutation.mutateAsync,
          );
          return;
        }

        // 4. Subscribe
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        // 5. Send subscription details to backend
        await sendSubscriptionToBackend(
          subscription,
          registerMutation.mutateAsync,
        );
      } catch (err) {
        console.warn("[Push] Failed to subscribe:", err);
      }
    })();
  }, [registerMutation.mutateAsync]);
}

async function sendSubscriptionToBackend(
  subscription: PushSubscription,
  mutateAsync: (args: {
    endpoint: string;
    p256dhKey: string;
    authKey: string;
  }) => Promise<unknown>,
) {
  const json = subscription.toJSON();
  const endpoint = json.endpoint ?? "";
  const p256dhKey = json.keys?.p256dh ?? "";
  const authKey = json.keys?.auth ?? "";

  if (!endpoint || !p256dhKey || !authKey) {
    console.warn("[Push] Subscription is missing required fields.");
    return;
  }

  try {
    await mutateAsync({ endpoint, p256dhKey, authKey });
    console.info("[Push] Subscription registered with backend.");
  } catch (err) {
    console.warn("[Push] Backend registration failed:", err);
  }
}
