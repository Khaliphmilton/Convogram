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
  if (!userId) throw new Error("You must be signed in to update your profile.");

  const allowed = ["display_name", "username", "bio", "website", "avatar_url", "is_private"];
  const payload = Object.fromEntries(Object.entries(changes || {}).filter(([key]) => allowed.includes(key)));
  if (payload.username) payload.username = payload.username.trim().toLowerCase().replace(/\s+/g, "");
  if (payload.website === "") payload.website = null;
  if (!payload.display_name?.trim()) throw new Error("Display name is required.");
  if (!payload.username || payload.username.length < 3) throw new Error("Username must be at least 3 characters.");
  if (payload.website && !/^https?:\/\//i.test(payload.website)) throw new Error("Website must start with http:// or https://.");

  const { error } = await supabase
    .from("profiles")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;

  // Fetch the committed row again so the UI always receives the actual
  // database value instead of a stale object from the form.
  const { data, error: readError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (readError) throw readError;
  return data;
}

export async function isFollowingUser(followerId, followingId) {
  const { data, error } = await supabase.from("follows").select("id").eq("follower_id", followerId).eq("following_id", followingId).maybeSingle();
  if (error) throw error;
  return !!data;
}