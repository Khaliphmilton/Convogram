import { supabase } from "./supabase";

export const CALL_VAPID_PUBLIC_KEY = "BGPXOYU961p5hmC_8kf2_qtdhsfUvR6kv0VBM28OnSjbOeAdUb2JJI7LDf7c6rUIEXDJR3pPWvhtVeAdZ_wb5gg";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

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

export async function registerCallPush(userId) {
  if (!userId || !supabase || typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return null;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    let permission = Notification.permission;
    if (permission === "default") permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(CALL_VAPID_PUBLIC_KEY) });
    await registerNotificationDevice(userId, subscription.toJSON(), "web");
    return subscription;
  } catch (error) {
    console.warn("Convogram call push registration failed", error);
    return null;
  }
}
