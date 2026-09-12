import { supabase } from "./supabase";

export async function getShortsForDiscover(limit = 30, offset = 0) {
  const { data, error } = await supabase.from("shorts").select(`*, profiles:user_id(id, username, display_name, avatar_url, is_private), short_likes(count), short_comments(count)`).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (error) throw error;
  return data || [];
}

export async function getUserShorts(userId) {
  const { data, error } = await supabase.from("shorts").select(`*, profiles:user_id(id, username, display_name, avatar_url), short_likes(count), short_comments(count)`).eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createShort(userId, videoUrl, caption = null, soundName = null) {
  const { data, error } = await supabase.from("shorts").insert([{ user_id: userId, media_url: videoUrl, media_type: "video", caption: caption || null, sound_name: soundName || null }]).select().single();
  if (error) throw error;
  return data;
}

export async function likeShort(shortId, userId) {
  const { data, error } = await supabase.from("short_likes").insert([{ short_id: shortId, user_id: userId }]).select().single();
  if (error) throw error;
  return data;
}

export async function unlikeShort(shortId, userId) {
  const { error } = await supabase.from("short_likes").delete().eq("short_id", shortId).eq("user_id", userId);
  if (error) throw error;
}

export async function isShortLikedByUser(shortId, userId) {
  const { data, error } = await supabase.from("short_likes").select("id").eq("short_id", shortId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function addShortComment(shortId, userId, content) {
  const { data, error } = await supabase.from("short_comments").insert([{ short_id: shortId, user_id: userId, content }]).select(`*, profiles:user_id(id, username, display_name, avatar_url)`).single();
  if (error) throw error;
  return data;
}

export async function getShortComments(shortId) {
  const { data, error } = await supabase.from("short_comments").select(`*, profiles:user_id(id, username, display_name, avatar_url)`).eq("short_id", shortId).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function deleteShort(shortId) {
  const { error } = await supabase.from("shorts").delete().eq("id", shortId);
  if (error) throw error;
}
