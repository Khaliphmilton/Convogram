import { Capacitor } from "@capacitor/core";
import { supabase } from "./lib/supabase";

let started = false;

// Native Android push registration is intentionally opt-in.
// Calling the Capacitor PushNotifications plugin during the auth transition
// can terminate the Android process when Firebase/FCM is not configured in
// the generated native project. Keep login -> feed independent of push.
const nativePushEnabled = String(import.meta.env.VITE_ENABLE_NATIVE_PUSH || "").toLowerCase() === "true";

async function registerDevice(session) {
  if (!nativePushEnabled || started || !session?.user?.id || Capacitor.getPlatform() !== "android") return;
  started = true;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive !== "granted") permission = await PushNotifications.requestPermissions();
    if (permission.receive !== "granted") return;

    await PushNotifications.addListener("registration", async ({ value: token }) => {
      if (!token || !supabase || !session?.user?.id) return;
      const { error } = await supabase.from("notification_devices").upsert(
        {
          user_id: session.user.id,
          endpoint: token,
          p256dh: null,
          auth: null,
          platform: "android",
          updated_at: new Date().toISOString()
        },
        { onConflict: "endpoint" }
      );
      if (error) console.warn("Convogram Android push token save failed", error);
    });

    await PushNotifications.addListener("registrationError", (error) => {
      console.warn("Convogram Android push registration failed", error);
    });

    await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
      window.dispatchEvent(new CustomEvent("convogram-push-open", { detail: event.notification?.data || {} }));
    });

    await PushNotifications.register();
  } catch (error) {
    started = false;
    console.warn("Convogram Android push setup skipped", error);
  }
}

if (nativePushEnabled && Capacitor.getPlatform() === "android" && supabase) {
  const schedule = (session) => {
    // Never compete with the login -> feed transition.
    window.setTimeout(() => registerDevice(session), 8000);
  };
  supabase.auth.getSession().then(({ data }) => schedule(data?.session));
  supabase.auth.onAuthStateChange((_event, session) => schedule(session));
}
