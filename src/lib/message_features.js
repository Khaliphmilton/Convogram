import { supabase } from "./supabase";

export async function searchMessages(conversationId, query, limit = 50) {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).ilike("content", `%${q}%`).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

export async function pinMessage(messageId, conversationId) {
  const { data, error } = await supabase.from("messages").update({ pinned: true }).eq("id", messageId).eq("conversation_id", conversationId).select().single();
  if (error) throw error;
  return data;
}

export async function unpinMessage(messageId, conversationId) {
  const { data, error } = await supabase.from("messages").update({ pinned: false }).eq("id", messageId).eq("conversation_id", conversationId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteMessageForMe(messageId, userId) {
  const { error } = await supabase.from("message_deletions").insert([{ message_id: messageId, user_id: userId }]);
  if (error) throw error;
}
