import { Capacitor } from "@capacitor/core";
import { supabase } from "./lib/supabase";

let started = false;

// Native Android push is enabled for release builds. Registration is delayed so
// it never competes with the login -> feed transition.
const nativePushEnabled = String(import.meta.env.VITE_ENABLE_NATIVE_PUSH ?? "true").toLowerCase() !== "false";

const notificationCopy = (type) => {
  switch (type) {
    case "message": return { title: "New message", body: "You have a new Convogram message." };
    case "call": return { title: "Incoming call", body: "Someone is calling you on Convogram." };
    case "follow": return { title: "New follower", body: "Someone started following you." };
    case "like": return { title: "New like", body: "Someone liked your post." };
    case "comment": return { title: "New comment", body: "Someone commented on your post." };
    default: return { title: "Convogram", body: "You have a new notification." };
  }
};

async function registerDevice(session) {
  if (!nativePushEnabled || started || !session?.user?.id || Capacitor.getPlatform() !== "android") return;
  started = true;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    let permission = await PushNotifications.checkPermissions();
    if (permission.receive !== "granted") permission = await PushNotifications.requestPermissions();
    if (permission.receive !== "granted") {
      started = false;
      return;
    }

    let localPermission = await LocalNotifications.checkPermissions();
    if (localPermission.display !== "granted") localPermission = await LocalNotifications.requestPermissions();
    if (localPermission.display === "granted") {
      await LocalNotifications.createChannel({
        id: "convogram",
        name: "Convogram notifications",
        description: "Messages, calls, followers, likes and comments",
        importance: 5,
        visibility: 1,
        sound: "default"
      }).catch(() => {});
    }

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

    await PushNotifications.addListener("pushNotificationReceived", async (notification) => {
      const type = notification?.data?.type || "notification";
      const copy = notification?.title && notification?.body
        ? { title: notification.title, body: notification.body }
        : notificationCopy(type);
      if (localPermission.display === "granted") {
        await LocalNotifications.schedule({
          notifications: [{
            id: Math.floor(Date.now() % 2147483647),
            title: copy.title,
            body: copy.body,
            channelId: "convogram",
            extra: notification?.data || {}
          }]
        }).catch(() => {});
      }
      window.dispatchEvent(new CustomEvent("convogram-push-received", { detail: notification }));
    });

    await PushNotifications.addListener("registrationError", (error) => {
      started = false;
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
    window.setTimeout(() => registerDevice(session), 8000);
  };
  supabase.auth.getSession().then(({ data }) => schedule(data?.session));
  supabase.auth.onAuthStateChange((_event, session) => schedule(session));
}
