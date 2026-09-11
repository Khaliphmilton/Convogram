import { supabase } from "./supabase";

export async function getNotifications(userId, limit = 50) {
  const { data, error } = await supabase
    .from("notifications")
    .select(
      `
      *,
      profiles:actor_id(id, username, display_name, avatar_url)
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getUnreadNotificationsCount(userId) {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw error;
  return count || 0;
}

export async function markNotificationAsRead(notificationId) {
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markAllNotificationsAsRead(userId) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw error;
}
