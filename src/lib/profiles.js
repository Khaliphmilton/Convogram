import { supabase } from "./supabase";

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function searchProfiles(query) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(20);
  if (error) throw error;
  return data;
}

export async function getProfileStats(userId) {
  const [posts, followers, following] = await Promise.all([
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", userId),
  ]);

  return {
    postsCount: posts.count || 0,
    followersCount: followers.count || 0,
    followingCount: following.count || 0,
  };
}

export async function followUser(followerId, followingId) {
  const { data, error } = await supabase
    .from("follows")
    .insert([{ follower_id: followerId, following_id: followingId }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function unfollowUser(followerId, followingId) {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
  if (error) throw error;
}

export async function isFollowing(followerId, followingId) {
  const { data, error } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return !!data;
}

export async function getFollowers(userId) {
  const { data, error } = await supabase
    .from("follows")
    .select(
      `
      *,
      profiles:follower_id(id, username, display_name, avatar_url)
    `
    )
    .eq("following_id", userId);
  if (error) throw error;
  return data?.map((f) => f.profiles);
}

export async function getFollowing(userId) {
  const { data, error } = await supabase
    .from("follows")
    .select(
      `
      *,
      profiles:following_id(id, username, display_name, avatar_url)
    `
    )
    .eq("follower_id", userId);
  if (error) throw error;
  return data?.map((f) => f.profiles);
}
