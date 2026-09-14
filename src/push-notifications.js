import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { supabase } from "./lib/supabase";

const PUSH_CHANNEL_ID = "convogram-messages";
let activeCleanup = null;

function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

async function saveToken(userId, token) {
  if (!userId || !token || !supabase) return;
  const { error } = await supabase.from("push_tokens").upsert(
    { user_id: userId, token, platform: "android", updated_at: new Date().toISOString() },
    { onConflict: "user_id,token" },
  );
  if (error) console.warn("Convogram push token registration failed", error);
}

async function showLocalMessageNotification(message) {
  if (!message?.senderName || !message?.content) return;
  try {
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== "granted") return;
    await LocalNotifications.schedule({
      notifications: [{
        id: Math.floor(Date.now() % 2147483000),
        channelId: PUSH_CHANNEL_ID,
        title: message.senderName,
        body: message.content,
        smallIcon: "ic_stat_convogram",
        extra: { conversationId: message.conversationId || "" },
      }],
    });
  } catch (error) {
    console.warn("Convogram local message notification failed", error);
  }
}

export async function setupPushNotifications(userId) {
  if (!userId || !isNativeAndroid() || !supabase) return () => {};

  if (activeCleanup) activeCleanup();
  activeCleanup = null;

  try {
    await LocalNotifications.createChannel({
      id: PUSH_CHANNEL_ID,
      name: "Messages",
      description: "New Convogram messages",
      importance: 5,
      visibility: 1,
      sound: "default",
    }).catch(() => {});

    let pushPermission = await PushNotifications.checkPermissions();
    if (pushPermission.receive !== "granted") {
      pushPermission = await PushNotifications.requestPermissions();
    }
    if (pushPermission.receive !== "granted") return () => {};

    const localPermission = await LocalNotifications.checkPermissions();
    if (localPermission.display !== "granted") {
      await LocalNotifications.requestPermissions().catch(() => {});
    }

    const registration = await PushNotifications.register();
    if (registration) {
      // Token events are handled below; register() itself does not guarantee a token payload.
    }

    const tokenListener = await PushNotifications.addListener("registration", ({ value }) => {
      saveToken(userId, value).catch(() => {});
    });

    const registrationErrorListener = await PushNotifications.addListener("registrationError", (error) => {
      console.warn("Convogram push registration error", error);
    });

    const actionListener = await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
      const conversationId = event?.notification?.data?.conversationId || event?.notification?.data?.conversation_id;
      if (conversationId) {
        window.dispatchEvent(new CustomEvent("convogram:open-conversation", { detail: { conversationId } }));
      }
    });

    // Foreground fallback: show an Android notification for incoming messages.
    // A server-sent FCM notification handles background/terminated-app delivery.
    const messageChannel = supabase
      .channel(`message-push-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const row = payload?.new;
        if (!row?.sender_id || row.sender_id === userId || !row?.conversation_id) return;
        try {
          const { data: member } = await supabase
            .from("conversation_members")
            .select("user_id")
            .eq("conversation_id", row.conversation_id)
            .eq("user_id", userId)
            .maybeSingle();
          if (!member) return;
          const { data: sender } = await supabase
            .from("profiles")
            .select("display_name,username")
            .eq("id", row.sender_id)
            .maybeSingle();
          await showLocalMessageNotification({
            conversationId: row.conversation_id,
            senderName: sender?.display_name || sender?.username || "New message",
            content: row.content || (row.message_type === "image" ? "Photo" : row.message_type === "video" ? "Video" : row.message_type === "audio" ? "Voice message" : "New message"),
          });
        } catch (_) {}
      })
      .subscribe();

    activeCleanup = () => {
      tokenListener?.remove?.();
      registrationErrorListener?.remove?.();
      actionListener?.remove?.();
      supabase.removeChannel(messageChannel);
      activeCleanup = null;
    };
    return activeCleanup;
  } catch (error) {
    console.warn("Convogram push setup failed", error);
    return () => {};
  }
}

export function teardownPushNotifications() {
  activeCleanup?.();
  activeCleanup = null;
}
