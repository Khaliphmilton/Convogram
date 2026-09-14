import { supabase } from "./supabase";

let pendingDirectConversationId = null;
const CHAT_TARGET_KEY = "convogram:open-chat";
const rememberChat = id => { pendingDirectConversationId = id || null; if (id) { try { sessionStorage.setItem(CHAT_TARGET_KEY, JSON.stringify({ conversationId: id, createdAt: Date.now() })); } catch {} } };
export function consumePendingDirectConversationId() { let id = pendingDirectConversationId; pendingDirectConversationId = null; if (!id) { try { const raw = sessionStorage.getItem(CHAT_TARGET_KEY); id = raw ? JSON.parse(raw)?.conversationId || null : null; } catch {} } if (id) { try { sessionStorage.removeItem(CHAT_TARGET_KEY); } catch {} } return id; }

export async function getConversations(userId, limit = 50) {
  if (!userId) return [];
  const { data: memberships, error: membershipError } = await supabase.from("conversation_members").select("conversation_id,joined_at,role,last_read_at,hidden_at").eq("user_id", userId).is("hidden_at", null).order("joined_at", { ascending: false }).limit(limit);
  if (membershipError) throw membershipError;
  const rows = memberships || [];
  const ids = rows.map(r => r.conversation_id).filter(Boolean);
  if (!ids.length) return [];
  const { data: conversationRows, error: conversationError } = await supabase.from("conversations").select("*").in("id", ids);
  if (conversationError) throw conversationError;
  const conversationById = new Map((conversationRows || []).map(c => [c.id, c]));
  const { data: memberRows, error: memberError } = await supabase.from("conversation_members").select("conversation_id,user_id").in("conversation_id", ids);
  if (memberError) throw memberError;
  const otherIds = [...new Set((memberRows || []).map(m => m.user_id).filter(id => id && id !== userId))];
  let profiles = [];
  if (otherIds.length) { const result = await supabase.from("profiles").select("id,username,display_name,avatar_url,is_verified").in("id", otherIds); if (!result.error) profiles = result.data || []; }
  const profileById = new Map(profiles.map(p => [p.id, p]));
  const { data: messageRows, error: messageError } = await supabase.from("messages").select("id,conversation_id,sender_id,content,message_type,created_at,is_deleted").in("conversation_id", ids).order("created_at", { ascending: false });
  if (messageError) throw messageError;
  const latestByConversation = new Map();
  for (const message of messageRows || []) if (!latestByConversation.has(message.conversation_id)) latestByConversation.set(message.conversation_id, message);
  return rows.map(row => {
    const conversation = { ...(conversationById.get(row.conversation_id) || {}), ...row };
    const other = (memberRows || []).find(m => m.conversation_id === row.conversation_id && m.user_id !== userId);
    conversation._direct_profile = other ? profileById.get(other.user_id) || null : null;
    conversation._latest_message = latestByConversation.get(row.conversation_id) || null;
    const lastRead = row.last_read_at ? new Date(row.last_read_at).getTime() : 0;
    conversation.unread_count = (messageRows || []).filter(m => m.conversation_id === row.conversation_id && m.sender_id !== userId && !m.is_deleted && new Date(m.created_at).getTime() > lastRead).length;
    conversation._display_name = conversation.name || conversation._direct_profile?.display_name || conversation._direct_profile?.username || (conversation.type === "group" ? "Group conversation" : "Direct conversation");
    return conversation;
  });
}

export async function getDirectConversation(userId, otherUserId) {
  if (!userId || !otherUserId || userId === otherUserId) return null;
  const { data: otherMemberships, error } = await supabase.from("conversation_members").select("conversation_id,user_id").eq("user_id", otherUserId);
  if (error) throw error;
  const ids = (otherMemberships || []).map(r => r.conversation_id).filter(Boolean); if (!ids.length) return null;
  const { data: mine, error: mineError } = await supabase.from("conversation_members").select("conversation_id,hidden_at").eq("user_id", userId).in("conversation_id", ids);
  if (mineError) throw mineError;
  const target = (mine || [])[0]; if (!target) return null;
  if (target.hidden_at) { const { error: restoreError } = await supabase.from("conversation_members").update({ hidden_at: null }).eq("conversation_id", target.conversation_id).eq("user_id", userId); if (restoreError) throw restoreError; }
  const { data: conversation, error: conversationError } = await supabase.from("conversations").select("*").eq("id", target.conversation_id).single(); if (conversationError) throw conversationError;
  rememberChat(conversation.id); return conversation;
}

export async function getConversationDetails(conversationId) { const { data, error } = await supabase.from("conversations").select("*").eq("id", conversationId).single(); if (error) throw error; return data; }

export async function getMessages(conversationId, limit = 100, userId = null) {
  const { data, error } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(limit);
  if (error) throw error;
  let readerId = userId; if (!readerId) { const { data: authData } = await supabase.auth.getUser(); readerId = authData?.user?.id || null; }
  if (readerId) await markConversationAsRead(conversationId, readerId);
  const messages = data || [];
  const senderIds = [...new Set(messages.map(m => m.sender_id).filter(Boolean))];
  if (senderIds.length) { const { data: profiles } = await supabase.from("profiles").select("id,username,display_name,avatar_url,is_verified").in("id", senderIds); const byId = new Map((profiles || []).map(p => [p.id, p])); messages.forEach(m => { m.profiles = byId.get(m.sender_id) || null; }); }
  const replyIds = [...new Set(messages.map(m => m.reply_to_id).filter(Boolean))];
  if (replyIds.length) { const { data: replies } = await supabase.from("messages").select("*").in("id", replyIds); const byId = new Map((replies || []).map(r => [r.id, r])); messages.forEach(m => { if (m.reply_to_id) m.reply_to = byId.get(m.reply_to_id) || null; }); }
  return messages;
}

export async function sendMessage(conversationId, senderId, content, messageType = "text", mediaUrl = null, replyToId = null) { const { data, error } = await supabase.from("messages").insert([{ conversation_id: conversationId, sender_id: senderId, content: messageType === "text" ? content : null, message_type: messageType, media_url: mediaUrl, reply_to_id: replyToId || null }]).select().single(); if (error) throw error; const { data: profile } = await supabase.from("profiles").select("id,username,display_name,avatar_url,is_verified").eq("id", senderId).maybeSingle(); if (data) data.profiles = profile || null; return data; }
export async function deleteMessage(messageId) { const { data, error } = await supabase.from("messages").update({ is_deleted: true, content: null, media_url: null, updated_at: new Date().toISOString() }).eq("id", messageId).select().single(); if (error) throw error; return data; }
export async function deleteConversationForUser(conversationId, userId) { const { error } = await supabase.from("conversation_members").update({ hidden_at: new Date().toISOString() }).eq("conversation_id", conversationId).eq("user_id", userId); if (error) throw error; }
export function subscribeToConversation(conversationId, onInsert, onUpdate) { const channel = supabase.channel(`convogram-chat-${conversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, payload => onInsert(payload.new)).on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, payload => onUpdate?.(payload.new)).subscribe(); return () => supabase.removeChannel(channel); }
export async function markMessageAsRead(messageId, userId) { const { data, error } = await supabase.from("read_receipts").insert([{ message_id: messageId, user_id: userId }]).select().single(); if (error && error.code !== "23505") throw error; const { data: message } = await supabase.from("messages").select("conversation_id").eq("id", messageId).maybeSingle(); if (message?.conversation_id) await markConversationAsRead(message.conversation_id, userId); return data; }
export async function markConversationAsRead(conversationId, userId) { if (!conversationId || !userId) return; const { error } = await supabase.from("conversation_members").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", conversationId).eq("user_id", userId); if (error) throw error; }
export async function addMessageReaction(messageId, userId, reaction) { const { data, error } = await supabase.from("message_reactions").insert([{ message_id: messageId, user_id: userId, reaction }]).select().single(); if (error) throw error; return data; }
export async function removeMessageReaction(messageId, userId, reaction) { const { error } = await supabase.from("message_reactions").delete().eq("message_id", messageId).eq("user_id", userId).eq("reaction", reaction); if (error) throw error; }
export async function createConversation(createdBy, type = "direct", name = null, avatarUrl = null, memberIds = []) {
  if (!createdBy) throw new Error("You must be signed in to create a conversation.");
  const allMembers = [...new Set([createdBy, ...memberIds].filter(Boolean))]; if (type === "direct" && allMembers.length !== 2) throw new Error("A direct conversation needs exactly two people.");
  if (type === "direct") { const other = allMembers.find(id => id !== createdBy); if (other) { const { data: otherRows } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", other); const ids = (otherRows || []).map(r => r.conversation_id); if (ids.length) { const { data: mine } = await supabase.from("conversation_members").select("conversation_id,hidden_at").eq("user_id", createdBy).in("conversation_id", ids); const existing = (mine || [])[0]; if (existing) { if (existing.hidden_at) await supabase.from("conversation_members").update({ hidden_at: null }).eq("conversation_id", existing.conversation_id).eq("user_id", createdBy); const { data: conversation } = await supabase.from("conversations").select("*").eq("id", existing.conversation_id).maybeSingle(); rememberChat(existing.conversation_id); return conversation; } } } }
  const { data, error } = await supabase.from("conversations").insert([{ created_by: createdBy, type, name: name || null, avatar_url: avatarUrl || null }]).select().single(); if (error) throw error;
  const { error: memberError } = await supabase.from("conversation_members").insert(allMembers.map(userId => ({ conversation_id: data.id, user_id: userId, role: userId === createdBy ? "owner" : "member" }))); if (memberError) throw memberError;
  if (type === "direct") rememberChat(data.id); return data;
}
