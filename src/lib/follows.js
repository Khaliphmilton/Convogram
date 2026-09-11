import { supabase } from "./supabase";

export async function followUser(followerId, followingId) {
  if (followerId === followingId) throw new Error("You cannot follow yourself.");
  const { data, error } = await supabase.from("follows").insert([{ follower_id: followerId, following_id: followingId }]).select().single();
  if (error) throw error;
  return data;
}

export async function unfollowUser(followerId, followingId) {
  const { error } = await supabase.from("follows").delete().eq("follower_id", followerId).eq("following_id", followingId);
  if (error) throw error;
}

export async function isFollowing(followerId, followingId) {
  const { data, error } = await supabase.from("follows").select("id").eq("follower_id", followerId).eq("following_id", followingId).maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function getFollowers(userId, limit = 100) {
  const { data, error } = await supabase.from("follows").select("*, profiles:follower_id(id, username, display_name, avatar_url)").eq("following_id", userId).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getFollowing(userId, limit = 100) {
  const { data, error } = await supabase.from("follows").select("*, profiles:following_id(id, username, display_name, avatar_url)").eq("follower_id", userId).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}
