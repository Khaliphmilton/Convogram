import { supabase } from "./supabase";

export async function registerNotificationDevice(userId, subscription, platform = "web") {
  if (!subscription?.endpoint) throw new Error("A notification subscription is required.");
  const keys = subscription.keys || {};
  const { data, error } = await supabase.from("notification_devices").upsert([{ user_id: userId, endpoint: subscription.endpoint, p256dh: keys.p256dh || null, auth: keys.auth || null, platform, updated_at: new Date().toISOString() }], { onConflict: "endpoint" }).select().single();
  if (error) throw error;
  return data;
}

export async function unregisterNotificationDevice(endpoint) {
  const { error } = await supabase.from("notification_devices").delete().eq("endpoint", endpoint);
  if (error) throw error;
}

export async function requestWebPushPermission() {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return { supported: false, permission: "unsupported" };
  const permission = await Notification.requestPermission();
  return { supported: true, permission };
}
