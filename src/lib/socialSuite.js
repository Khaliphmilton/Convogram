import { supabase } from "./supabase";

export async function toggleSavedPost(userId, postId) {
  const { data: existing, error: lookupError } = await supabase.from("saved_posts").select("id").eq("user_id", userId).eq("post_id", postId).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) {
    const { error } = await supabase.from("saved_posts").delete().eq("id", existing.id);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from("saved_posts").insert([{ user_id: userId, post_id: postId }]);
  if (error) throw error;
  return true;
}

export async function getSavedPosts(userId) {
  const { data, error } = await supabase.from("saved_posts").select("id, post_id, created_at, posts(*, profiles:user_id(id,username,display_name,avatar_url))").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function toggleRepost(userId, postId, comment = null) {
  const { data: existing, error: lookupError } = await supabase.from("reposts").select("id").eq("user_id", userId).eq("post_id", postId).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) {
    const { error } = await supabase.from("reposts").delete().eq("id", existing.id);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from("reposts").insert([{ user_id: userId, post_id: postId, comment: comment?.trim() || null }]);
  if (error) throw error;
  return true;
}

export async function createPoll(userId, question, options, postId) {
  if (!question?.trim() || !postId || options.filter(Boolean).length < 2) throw new Error("A poll needs a question and at least two options.");
  const { data, error } = await supabase.from("polls").insert([{ post_id: postId, question: question.trim() }]).select().single();
  if (error) throw error;
  const rows = options.filter(Boolean).map((label, position) => ({ poll_id: data.id, label: label.trim(), position }));
  const { error: optionError } = await supabase.from("poll_options").insert(rows);
  if (optionError) throw optionError;
  return data;
}

export async function votePoll(userId, pollId, optionId) {
  const { error } = await supabase.from("poll_votes").upsert([{ poll_id: pollId, option_id: optionId, user_id: userId }], { onConflict: "poll_id,user_id" });
  if (error) throw error;
}

export async function createNote(userId, content) {
  const { data, error } = await supabase.from("notes").insert([{ user_id: userId, content: content.trim().slice(0, 280) }]).select().single();
  if (error) throw error;
  return data;
}

export async function getActiveNotes() {
  const { data, error } = await supabase.from("notes").select("*, profiles:user_id(id,username,display_name,avatar_url)").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateMessage(messageId, userId, content) {
  const text = content.trim();
  if (!text) throw new Error("Message cannot be empty.");
  const { data, error } = await supabase.from("messages").update({ content: text, edited_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", messageId).eq("sender_id", userId).select().single();
  if (error) throw error;
  return data;
}
