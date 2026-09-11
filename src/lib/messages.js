import { supabase } from "./supabase";

export async function getConversations(userId, limit = 50) {
  const { data, error } = await supabase
    .from("conversation_members")
    .select(
      `
      conversation_id,
      conversations(
        *,
        profiles:created_by(id, username, display_name, avatar_url)
      )
    `
    )
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data?.map((m) => m.conversations);
}

export async function getConversationDetails(conversationId) {
  const { data, error } = await supabase
    .from("conversations")
    .select(
      `
      *,
      profiles:created_by(id, username, display_name, avatar_url),
      conversation_members(
        *,
        profiles:user_id(id, username, display_name, avatar_url)
      )
    `
    )
    .eq("id", conversationId)
    .single();
  if (error) throw error;
  return data;
}

export async function getMessages(conversationId, limit = 50) {
  const { data, error } = await supabase
    .from("messages")
    .select(
      `
      *,
      profiles:sender_id(id, username, display_name, avatar_url),
      message_reactions(count)
    `
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function sendMessage(conversationId, senderId, content, messageType = "text", mediaUrl = null) {
  const { data, error } = await supabase
    .from("messages")
    .insert([
      {
        conversation_id: conversationId,
        sender_id: senderId,
        content: messageType === "text" ? content : null,
        message_type: messageType,
        media_url: mediaUrl,
      },
    ])
    .select(
      `
      *,
      profiles:sender_id(id, username, display_name, avatar_url)
    `
    )
    .single();
  if (error) throw error;
  return data;
}

export async function markMessageAsRead(messageId, userId) {
  const { data, error } = await supabase
    .from("read_receipts")
    .insert([{ message_id: messageId, user_id: userId }])
    .select()
    .single();
  if (error && error.code !== "23505") throw error; // Ignore duplicate key error
  return data;
}

export async function addMessageReaction(messageId, userId, reaction) {
  const { data, error } = await supabase
    .from("message_reactions")
    .insert([{ message_id: messageId, user_id: userId, reaction }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeMessageReaction(messageId, userId, reaction) {
  const { error } = await supabase
    .from("message_reactions")
    .delete()
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .eq("reaction", reaction);
  if (error) throw error;
}

export async function createConversation(createdBy, type = "direct", name = null, avatarUrl = null, memberIds = []) {
  const { data, error } = await supabase
    .from("conversations")
    .insert([
      {
        created_by: createdBy,
        type,
        name: name || null,
        avatar_url: avatarUrl || null,
      },
    ])
    .select()
    .single();
  if (error) throw error;

  // Add creator and members
  const allMembers = [createdBy, ...memberIds];
  const memberInserts = allMembers.map((userId) => ({
    conversation_id: data.id,
    user_id: userId,
    role: userId === createdBy ? "owner" : "member",
  }));

  await supabase.from("conversation_members").insert(memberInserts);

  return data;
}
