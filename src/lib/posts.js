import { supabase } from "./supabase";

export async function getFeed(limit = 20) {
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles:user_id(id, username, display_name, avatar_url, is_private),
      likes(count),
      comments(count)
    `
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getPost(postId) {
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles:user_id(id, username, display_name, avatar_url, is_private),
      likes(count),
      comments(
        *,
        profiles:user_id(id, username, display_name, avatar_url)
      )
    `
    )
    .eq("id", postId)
    .single();
  if (error) throw error;
  return data;
}

export async function getUserPosts(userId, limit = 20) {
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles:user_id(id, username, display_name, avatar_url),
      likes(count),
      comments(count)
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function createPost(userId, caption, mediaUrl, mediaType = "image") {
  const { data, error } = await supabase
    .from("posts")
    .insert([
      {
        user_id: userId,
        caption: caption || null,
        media_url: mediaUrl || null,
        media_type: mediaType,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePost(postId) {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
}

export async function likePost(postId, userId) {
  const { data, error } = await supabase
    .from("likes")
    .insert([{ post_id: postId, user_id: userId }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function unlikePost(postId, userId) {
  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function isPostLikedByUser(postId, userId) {
  const { data, error } = await supabase
    .from("likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return !!data;
}

export async function addComment(postId, userId, content) {
  const { data, error } = await supabase
    .from("comments")
    .insert([
      {
        post_id: postId,
        user_id: userId,
        content,
      },
    ])
    .select(
      `
      *,
      profiles:user_id(id, username, display_name, avatar_url)
    `
    )
    .single();
  if (error) throw error;
  return data;
}

export async function getComments(postId) {
  const { data, error } = await supabase
    .from("comments")
    .select(
      `
      *,
      profiles:user_id(id, username, display_name, avatar_url)
    `
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
