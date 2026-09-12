import { supabase } from "./supabase";

export async function searchProfiles(query, limit = 20) {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_url,bio,is_private")
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function updatePostCaption(postId, userId, caption) {
  const { data, error } = await supabase
    .from("posts")
    .update({ caption: caption.trim(), updated_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getRepostState(userId, postId) {
  const { data, error } = await supabase.from("reposts").select("id").eq("user_id", userId).eq("post_id", postId).maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function getPoll(pollId) {
  const { data, error } = await supabase.from("polls").select("*, poll_options(*), poll_votes(*)").eq("id", pollId).single();
  if (error) throw error;
  return data;
}

export async function getLiveViewerCount(streamId) {
  const { count, error } = await supabase.from("livestream_viewers").select("id", { count: "exact", head: true }).eq("livestream_id", streamId).is("left_at", null);
  if (error) throw error;
  return count || 0;
}
