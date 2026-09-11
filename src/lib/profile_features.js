import { supabase } from "./supabase";

export async function getSavedPostIds(userId) {
  const { data, error } = await supabase.from("saved_posts").select("post_id").eq("user_id", userId);
  if (error) throw error;
  return (data || []).map((row) => row.post_id);
}

export async function savePost(userId, postId) {
  const { error } = await supabase.from("saved_posts").upsert({ user_id: userId, post_id: postId }, { onConflict: "user_id,post_id" });
  if (error) throw error;
}

export async function unsavePost(userId, postId) {
  const { error } = await supabase.from("saved_posts").delete().eq("user_id", userId).eq("post_id", postId);
  if (error) throw error;
}

export async function getSavedPosts(userId) {
  const { data, error } = await supabase.from("saved_posts").select("post_id, posts:post_id(*, profiles:user_id(username, display_name, avatar_url), likes(count), comments(count))").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => row.posts).filter(Boolean);
}

export async function getLikedPosts(userId) {
  const { data, error } = await supabase.from("likes").select("post_id, posts:post_id(*, profiles:user_id(username, display_name, avatar_url), likes(count), comments(count))").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => row.posts).filter(Boolean);
}

export async function getTaggedPosts(userId) {
  const { data, error } = await supabase.from("post_tags").select("post_id, posts:post_id(*, profiles:user_id(username, display_name, avatar_url), likes(count), comments(count))").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => row.posts).filter(Boolean);
}

export async function tagUser(postId, userId, taggedBy) {
  const { error } = await supabase.from("post_tags").upsert({ post_id: postId, user_id: userId, tagged_by: taggedBy }, { onConflict: "post_id,user_id" });
  if (error) throw error;
}

export async function untagUser(postId, userId) {
  const { error } = await supabase.from("post_tags").delete().eq("post_id", postId).eq("user_id", userId);
  if (error) throw error;
}

export async function updateProfile(userId, changes) {
  const { data, error } = await supabase.from("profiles").update({ ...changes, updated_at: new Date().toISOString() }).eq("id", userId).select().single();
  if (error) throw error;
  return data;
}

export async function isFollowingUser(followerId, followingId) {
  const { data, error } = await supabase.from("follows").select("id").eq("follower_id", followerId).eq("following_id", followingId).maybeSingle();
  if (error) throw error;
  return !!data;
}
