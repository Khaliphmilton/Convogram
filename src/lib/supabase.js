import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://cckobknolduqnsimwvdu.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_dnyPhxVf2nVqHE1UOR96Fg_HpqE4M32";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
}

const DEFAULT_TIMEOUT_MS = 8000;
const timedFetch = (input, init = {}) => {
  const controller = new AbortController();
  const externalSignal = init.signal;
  const onAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort(externalSignal.reason);
    else externalSignal.addEventListener("abort", onAbort, { once: true });
  }
  const timeoutId = setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), DEFAULT_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", onAbort);
  });
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  global: { fetch: timedFetch },
});

let pushListenersInstalled = false;
let pushUserId = null;
let pushNotificationId = 10000;
let messagePushChannel = null;

async function saveAndroidPushToken(userId, token) {
  if (!userId || !token) return;
  const { data: existing, error: lookupError } = await supabase
    .from("notification_devices")
    .select("id")
    .eq("user_id", userId)
    .eq("platform", "android")
    .eq("endpoint", token)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing?.id) {
    const { error } = await supabase.from("notification_devices").update({ updated_at: new Date().toISOString() }).eq("id", existing.id);
    if (error) throw error;
    return;
  }
  await supabase.from("notification_devices").delete().eq("user_id", userId).eq("platform", "android").neq("endpoint", token);
  const { error } = await supabase.from("notification_devices").insert({ user_id: userId, platform: "android", endpoint: token });
  if (error) throw error;
}

async function notifyRecipientsForMessage(message) {
  if (!message?.id || !message?.conversation_id || !pushUserId || message.sender_id !== pushUserId) return;
  try {
    const { data: members, error } = await supabase
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", message.conversation_id)
      .neq("user_id", pushUserId);
    if (error) throw error;
    if (!members?.length) return;

    const { data: sender } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", pushUserId)
      .maybeSingle();
    const senderName = sender?.display_name || sender?.username || "Someone";
    const body = message.message_type === "image" ? "Sent you a photo" : message.message_type === "video" ? "Sent you a video" : message.message_type === "audio" ? "Sent you a voice message" : (message.content || "Sent you a message");
    const title = `${senderName} on Convogram`;

    await Promise.all((members || []).map(async ({ user_id: toUserId }) => {
      try {
        await supabase.functions.invoke("push-android", {
          body: {
            toUserId,
            title,
            body: body.slice(0, 240),
            data: {
              type: "message",
              messageId: message.id,
              conversationId: message.conversation_id,
              senderId: pushUserId,
            },
          },
        });
      } catch (error) {
        console.warn("Convogram message push failed", error);
      }
    }));
  } catch (error) {
    console.warn("Convogram message notification bridge failed", error);
  }
}

function installMessagePushBridge(userId) {
  if (!userId || messagePushChannel) return;
  messagePushChannel = supabase
    .channel(`convogram-push-${userId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `sender_id=eq.${userId}` }, ({ new: message }) => {
      notifyRecipientsForMessage(message);
    })
    .subscribe();
}

async function initializeAndroidPush(userId) {
  if (!userId) return;
  pushUserId = userId;
  installMessagePushBridge(userId);
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;
  try {
    if (!pushListenersInstalled) {
      pushListenersInstalled = true;
      await PushNotifications.addListener("registration", async ({ value }) => {
        try { await saveAndroidPushToken(pushUserId, value); }
        catch (error) { console.warn("Convogram push token save failed", error); }
      });
      await PushNotifications.addListener("registrationError", (error) => console.warn("Convogram FCM registration failed", error));
      await PushNotifications.addListener("pushNotificationReceived", async (notification) => {
        try {
          const permission = await LocalNotifications.checkPermissions();
          if (permission.display !== "granted") return;
          await LocalNotifications.schedule({ notifications: [{
            id: pushNotificationId++,
            title: notification?.title || "Convogram",
            body: notification?.body || "You have a new notification.",
            channelId: "convogram_notifications",
            smallIcon: "ic_stat_convogram",
            extra: notification?.data || {},
          }] });
        } catch (error) { console.warn("Convogram foreground notification failed", error); }
      });
      await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
        try { window.dispatchEvent(new CustomEvent("convogram_push_opened", { detail: notification?.data || {} })); } catch (_) {}
      });
    }

    let permission = await PushNotifications.checkPermissions();
    if (permission.receive !== "granted") permission = await PushNotifications.requestPermissions();
    if (permission.receive !== "granted") return;

    try {
      await PushNotifications.createChannel({ id: "convogram_notifications", name: "Convogram notifications", description: "Messages, calls and other Convogram alerts", importance: 5, visibility: 1, sound: "default", vibration: true });
    } catch (_) {}

    try {
      let localPermission = await LocalNotifications.checkPermissions();
      if (localPermission.display !== "granted") localPermission = await LocalNotifications.requestPermissions();
      if (localPermission.display === "granted") await LocalNotifications.createChannel({ id: "convogram_notifications", name: "Convogram notifications", description: "Messages, calls and other Convogram alerts", importance: 5, visibility: 1, sound: "default", vibration: true });
    } catch (_) {}

    await PushNotifications.register();
  } catch (error) {
    console.warn("Convogram Android push setup failed", error);
  }
}

if (typeof window !== "undefined" && !window.__convogramPushAuthListener) {
  window.__convogramPushAuthListener = true;
  supabase.auth.getSession().then(({ data }) => {
    if (data?.session?.user?.id) initializeAndroidPush(data.session.user.id);
  }).catch(() => {});
  supabase.auth.onAuthStateChange((_event, session) => {
    pushUserId = session?.user?.id || null;
    if (messagePushChannel) {
      supabase.removeChannel(messagePushChannel);
      messagePushChannel = null;
    }
    if (session?.user?.id) initializeAndroidPush(session.user.id);
  });
}

if (typeof document !== "undefined" && !document.getElementById("convogram-chat-layout-fix")) {
  const style = document.createElement("style");
  style.id = "convogram-chat-layout-fix";
  style.textContent = `
    .messages-panel.chat-open { position: relative !important; inset: auto !important; width: 100% !important; height: min(720px, calc(100vh - 132px)) !important; min-height: 0 !important; z-index: 1 !important; display: grid !important; background: #080808 !important; border-radius: 16px !important; }
    .messages-panel.chat-open .chat-window { width: 100% !important; height: 100% !important; min-height: 0 !important; display: flex !important; }
    .messages-panel.chat-open .chat-loading { flex: 1 !important; min-height: 220px !important; display: flex !important; align-items: center !important; justify-content: center !important; color: #aaa !important; font-size: 13px !important; background: #080808 !important; }
    @media (max-width: 760px) { .messages-panel.chat-open { height: calc(100vh - 90px) !important; min-height: 0 !important; border-radius: 10px !important; } }
  `;
  document.head.appendChild(style);
}
