import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { supabase } from "./supabase";

let initializedForUser = null;
let listenersInstalled = false;
let notificationSequence = 1000;

function isAndroidNative() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

async function saveDeviceToken(userId, token) {
  if (!userId || !token || !supabase) return;

  // Keep one current registration for this physical device/token. We deliberately
  // avoid an upsert conflict target because older Convogram databases may not have
  // the same unique-index definition.
  const { data: existing, error: lookupError } = await supabase
    .from("notification_devices")
    .select("id")
    .eq("user_id", userId)
    .eq("platform", "android")
    .eq("endpoint", token)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing?.id) {
    const { error } = await supabase
      .from("notification_devices")
      .update({ endpoint: token })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("notification_devices").insert({
    user_id: userId,
    platform: "android",
    endpoint: token,
  });
  if (error) throw error;
}

async function installListeners() {
  if (listenersInstalled) return;
  listenersInstalled = true;

  await PushNotifications.addListener("registration", async (token) => {
    const userId = initializedForUser;
    if (!userId) return;
    try {
      await saveDeviceToken(userId, token.value);
    } catch (error) {
      console.warn("Convogram push token registration failed", error);
    }
  });

  await PushNotifications.addListener("registrationError", (error) => {
    console.warn("Convogram push registration error", error);
  });

  await PushNotifications.addListener("pushNotificationReceived", async (notification) => {
    // Android normally displays FCM notification payloads while the app is in the
    // background. When Convogram is open, show the same notification locally so
    // important messages are still visible to the user.
    try {
      const title = notification?.title || "Convogram";
      const body = notification?.body || "You have a new notification.";
      await LocalNotifications.schedule({
        notifications: [{
          id: notificationSequence++,
          title,
          body,
          extra: notification?.data || {},
          channelId: "convogram_notifications",
          smallIcon: "ic_stat_convogram",
        }],
      });
    } catch (error) {
      console.warn("Convogram foreground notification failed", error);
    }
  });

  await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
    try {
      const data = event?.notification?.data || {};
      window.dispatchEvent(new CustomEvent("convogram_push_opened", { detail: data }));
    } catch (_) {}
  });
}

export async function initializePushNotifications(userId) {
  if (!isAndroidNative() || !userId || !supabase) return false;
  initializedForUser = userId;

  try {
    await installListeners();

    const permission = await PushNotifications.checkPermissions();
    let pushPermission = permission.receive;
    if (pushPermission !== "granted") {
      const requested = await PushNotifications.requestPermissions();
      pushPermission = requested.receive;
    }
    if (pushPermission !== "granted") {
      console.warn("Convogram push notifications are not permitted on this device.");
      return false;
    }

    // Android 8+ notification channels and Android 13+ notification permission.
    try {
      await PushNotifications.createChannel({
        id: "convogram_notifications",
        name: "Convogram notifications",
        description: "Messages, calls and other Convogram alerts",
        importance: 5,
        visibility: 1,
        sound: "default",
        vibration: true,
      });
    } catch (_) {}

    try {
      const localPermission = await LocalNotifications.checkPermissions();
      if (localPermission.display !== "granted") {
        await LocalNotifications.requestPermissions();
      }
      await LocalNotifications.createChannel({
        id: "convogram_notifications",
        name: "Convogram notifications",
        description: "Messages, calls and other Convogram alerts",
        importance: 5,
        visibility: 1,
        sound: "default",
        vibration: true,
      });
    } catch (_) {}

    await PushNotifications.register();
    return true;
  } catch (error) {
    console.warn("Convogram push notification setup failed", error);
    return false;
  }
}

export function resetPushNotificationUser() {
  initializedForUser = null;
}
