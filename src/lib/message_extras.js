import { supabase } from "./supabase";

export async function searchMessages(userId, query, limit = 50) {
  const term = query?.trim();
  if (!term) return [];
  const { data: memberships, error: membershipError } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", userId);
  if (membershipError) throw membershipError;
  const conversationIds = (memberships || []).map((row) => row.conversation_id);
  if (!conversationIds.length) return [];
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, message_type, media_url, created_at, is_deleted")
    .in("conversation_id", conversationIds)
    .ilike("content", `%${term}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function setMessageExpiry(messageId, expiresAt) {
  const { data, error } = await supabase.from("messages").update({ expires_at: expiresAt }).eq("id", messageId).select().single();
  if (error) throw error;
  return data;
}

export async function clearExpiredMessages() {
  const { data, error } = await supabase.from("messages").update({ is_deleted: true, content: null, media_url: null, updated_at: new Date().toISOString() }).lt("expires_at", new Date().toISOString()).eq("is_deleted", false).select("id");
  if (error) throw error;
  return data || [];
}
