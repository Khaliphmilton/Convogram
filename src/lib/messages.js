import { supabase } from "./supabase";

let pendingDirectConversationId = null;
const CHAT_TARGET_KEY = "convogram:open-chat";

function rememberChat(id) {
  pendingDirectConversationId = id || null;
  if (!id) return;
  try { sessionStorage.setItem(CHAT_TARGET_KEY, JSON.stringify({ conversationId: id, createdAt: Date.now() })); } catch {}
}

export function consumePendingDirectConversationId() {
  let id = pendingDirectConversationId;
  pendingDirectConversationId = null;
  if (!id) {
    try {
      const raw = sessionStorage.getItem(CHAT_TARGET_KEY);
      const target = raw ? JSON.parse(raw) : null;
      id = target?.conversationId || null;
    } catch {}
  }
  if (id) {
    try { sessionStorage.removeItem(CHAT_TARGET_KEY); } catch {}
  }
  return id;
}

export async function getConversations(userId, limit = 50) {
  const { data, error } = await supabase
    .from("conversation_members")
    .select(`conversation_id, joined_at, role, last_read_at, conversations(*, profiles:created_by(id, username, display_name, avatar_url))`)
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = (data || []).filter(row => row.conversations);
  const ids = rows.map(row => row.conversation_id).filter(Boolean);
  const unreadByConversation = new Map();
  if (ids.length) {
    const { data: incoming, error: messageError } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, created_at, is_deleted")
      .in("conversation_id", ids)
      .neq("sender_id", userId)
      .eq("is_deleted", false);
    if (messageError) throw messageError;
    for (const row of rows) {
      const lastRead = row.last_read_at ? new Date(row.last_read_at).getTime() : 0;
      const count = (incoming || []).filter(message => {
        if (message.conversation_id !== row.conversation_id) return false;
        return new Date(message.created_at).getTime() > lastRead;
      }).length;
      unreadByConversation.set(row.conversation_id, count);
    }
  }

  return rows.map(row => {
    const conversation = { ...row.conversations };
    const unreadCount = unreadByConversation.get(row.conversation_id) || 0;
    conversation.unread_count = unreadCount;
    conversation._display_name = conversation.name || (conversation.type === "group" ? "Group conversation" : "Direct conversation");
    if (unreadCount > 0) conversation.name = `🔴 ${unreadCount > 99 ? "99+" : unreadCount}  ${conversation._display_name}`;
    return conversation;
  });
}

export async function getDirectConversation(userId, otherUserId) {
  if (!userId || !otherUserId || userId === otherUserId) return null;
  const { data: mine, error: mineError } = await supabase
    .from("conversation_members")
    .select("conversation_id, conversations!inner(id, type, name, avatar_url, created_by, created_at, updated_at)")
    .eq("user_id", userId)
    .eq("conversations.type", "direct");
  if (mineError) throw mineError;
  const ids = (mine || []).map((row) => row.conversation_id).filter(Boolean);
  if (!ids.length) return null;
  const { data: theirs, error: theirsError } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", otherUserId)
    .in("conversation_id", ids);
  if (theirsError) throw theirsError;
  const targetId = theirs?.[0]?.conversation_id;
  const conversation = targetId ? (mine.find((row) => row.conversation_id === targetId)?.conversations || null) : null;
  rememberChat(conversation?.id);
  return conversation;
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

  const messages = data || [];
  const replyIds = [...new Set(messages.map(message => message.reply_to_id).filter(Boolean))];
  if (!replyIds.length) return messages;

  const { data: replyMessages, error: replyError } = await supabase
    .from("messages")
    .select(`id, content, message_type, media_url, is_deleted, sender_id, created_at, profiles:sender_id(id, username, display_name, avatar_url)`)
    .in("id", replyIds);
  if (replyError) throw replyError;

  const repliesById = new Map((replyMessages || []).map(message => [message.id, message]));
  return messages.map(message => ({
    ...message,
    reply_to: message.reply_to_id ? repliesById.get(message.reply_to_id) || null : null,
  }));
}

export async function sendMessage(conversationId, senderId, content, messageType = "text", mediaUrl = null, replyToId = null) {
  const { data, error } = await supabase
    .from("messages")
    .insert([{ conversation_id: conversationId, sender_id: senderId, content: messageType === "text" ? content : null, message_type: messageType, media_url: mediaUrl, reply_to_id: replyToId || null }])
    .select(`*, profiles:sender_id(id, username, display_name, avatar_url)`)
    .single();
  if (error) throw error;

  if (replyToId) {
    const { data: reply } = await supabase
      .from("messages")
      .select(`id, content, message_type, media_url, is_deleted, sender_id, created_at, profiles:sender_id(id, username, display_name, avatar_url)`)
      .eq("id", replyToId)
      .maybeSingle();
    data.reply_to = reply || null;
  }
  return data;
}

export async function deleteMessage(messageId) {
  const { data, error } = await supabase.from("messages").update({ is_deleted: true, content: null, media_url: null, updated_at: new Date().toISOString() }).eq("id", messageId).select().single();
  if (error) throw error;
  return data;
}

export function subscribeToConversation(conversationId, onInsert, onUpdate) {
  const channel = supabase.channel(`convogram-chat-${conversationId}`)
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

export async function markConversationAsRead(conversationId, userId) {
  if (!conversationId || !userId) return;
  const { error } = await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
  if (error) throw error;
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
  if (!createdBy) throw new Error("You must be signed in to create a conversation.");
  const allMembers = [...new Set([createdBy, ...memberIds].filter(Boolean))];
  if (type === "direct" && allMembers.length !== 2) throw new Error("A direct conversation needs exactly two people.");
  const { data, error } = await supabase.from("conversations").insert([{ created_by: createdBy, type, name: name || null, avatar_url: avatarUrl || null }]).select().single();
  if (error) throw error;
  const { error: memberError } = await supabase.from("conversation_members").insert(allMembers.map((userId) => ({ conversation_id: data.id, user_id: userId, role: userId === createdBy ? "owner" : "member" })));
  if (memberError) {
    try { await supabase.from("conversations").delete().eq("id", data.id); } catch {}
    throw memberError;
  }
  if (type === "direct") rememberChat(data.id);
  return data;
}
