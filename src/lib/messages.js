import { supabase } from "./supabase";

export async function getConversations(userId, limit = 50) {
  const { data, error } = await supabase
    .from("conversation_members")
    .select(`conversation_id, conversations(*, profiles:created_by(id, username, display_name, avatar_url))`)
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data?.map((m) => m.conversations);
}

export async function getDirectConversation(userId, otherUserId) {
  if (!userId || !otherUserId || userId === otherUserId) return null;
  const { data: mine, error: mineError } = await supabase
    .from("conversation_members")
    .select("conversation_id, joined_at, conversations(*)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(100);
  if (mineError) throw mineError;
  const directIds = (mine || [])
    .filter((row) => row.conversations?.type === "direct")
    .map((row) => row.conversation_id);
  if (!directIds.length) return null;

  const { data: theirs, error: theirsError } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .in("conversation_id", directIds)
    .eq("user_id", otherUserId);
  if (theirsError) throw theirsError;
  const match = (theirs || []).find((row) => directIds.includes(row.conversation_id));
  if (!match) return null;

  await supabase
    .from("conversation_members")
    .update({ joined_at: new Date().toISOString() })
    .eq("conversation_id", match.conversation_id)
    .eq("user_id", userId);

  return (mine || []).find((row) => row.conversation_id === match.conversation_id)?.conversations || null;
}

export async function getConversationDetails(conversationId) {
  const { data, error } = await supabase
    .from("conversations")
    .select(`*, profiles:created_by(id, username, display_name, avatar_url), conversation_members(*, profiles:user_id(id, username, display_name, avatar_url))`)
    .eq("id", conversationId)
    .single();
  if (error) throw error;
  return data;
}

export async function getMessages(conversationId, limit = 100) {
  const { data, error } = await supabase
    .from("messages")
    .select(`*, profiles:sender_id(id, username, display_name, avatar_url), message_reactions(*)`)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function sendMessage(conversationId, senderId, content, messageType = "text", mediaUrl = null, replyToId = null) {
  const { data, error } = await supabase
    .from("messages")
    .insert([{ conversation_id: conversationId, sender_id: senderId, content: messageType === "text" ? content : null, message_type: messageType, media_url: mediaUrl, reply_to_id: replyToId || null }])
    .select(`*, profiles:sender_id(id, username, display_name, avatar_url)`)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMessage(messageId) {
  const { data, error } = await supabase
    .from("messages")
    .update({ is_deleted: true, content: null, media_url: null, updated_at: new Date().toISOString() })
    .eq("id", messageId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function subscribeToConversation(conversationId, onInsert, onUpdate) {
  const channel = supabase
    .channel(`convogram-chat-${conversationId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => onInsert(payload.new))
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => onUpdate?.(payload.new))
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export async function markMessageAsRead(messageId, userId) {
  const { data, error } = await supabase.from("read_receipts").insert([{ message_id: messageId, user_id: userId }]).select().single();
  if (error && error.code !== "23505") throw error;
  return data;
}

export async function addMessageReaction(messageId, userId, reaction) {
  const { data, error } = await supabase.from("message_reactions").insert([{ message_id: messageId, user_id: userId, reaction }]).select().single();
  if (error) throw error;
  return data;
}

export async function removeMessageReaction(messageId, userId, reaction) {
  const { error } = await supabase.from("message_reactions").delete().eq("message_id", messageId).eq("user_id", userId).eq("reaction", reaction);
  if (error) throw error;
}

export async function createConversation(createdBy, type = "direct", name = null, avatarUrl = null, memberIds = []) {
  const { data, error } = await supabase.from("conversations").insert([{ created_by: createdBy, type, name: name || null, avatar_url: avatarUrl || null }]).select().single();
  if (error) throw error;
  const allMembers = [...new Set([createdBy, ...memberIds])];
  const { error: memberError } = await supabase.from("conversation_members").insert(allMembers.map((userId) => ({ conversation_id: data.id, user_id: userId, role: userId === createdBy ? "owner" : "member" })));
  if (memberError) throw memberError;
  return data;
}
