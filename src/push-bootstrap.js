import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "./lib/supabase";

let started = false;

async function registerDevice(session) {
  if (started || !session?.user?.id || Capacitor.getPlatform() !== "android") return;
  started = true;
  try {
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

if (Capacitor.getPlatform() === "android" && supabase) {
  supabase.auth.getSession().then(({ data }) => registerDevice(data?.session));
  supabase.auth.onAuthStateChange((_event, session) => registerDevice(session));
}
