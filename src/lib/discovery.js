import { supabase } from "./supabase";

export async function searchUsers(query, limit = 20) {
  const term = query?.trim();
  if (!term) return [];
  const { data, error } = await supabase.from("profiles").select("id, username, display_name, avatar_url, bio, is_private").or(`username.ilike.%${term}%,display_name.ilike.%${term}%`).order("username").limit(limit);
  if (error) throw error;
  return data || [];
}

export async function searchPosts(query, limit = 30) {
  const term = query?.trim();
  if (!term) return [];
  const { data, error } = await supabase.from("posts").select("*, profiles:user_id(id, username, display_name, avatar_url)").ilike("caption", `%${term}%`).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

export async function searchCommunities(query, limit = 20) {
  const term = query?.trim();
  if (!term) return [];
  const { data, error } = await supabase.from("communities").select("id, name, description, avatar_url, owner_id, created_at").or(`name.ilike.%${term}%,description.ilike.%${term}%`).order("name").limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getRecommendedProfiles(userId, limit = 20) {
  const { data: following } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
  const excluded = new Set([userId, ...(following || []).map((row) => row.following_id)]);
  const { data, error } = await supabase.from("profiles").select("id, username, display_name, avatar_url, bio, is_private").order("created_at", { ascending: false }).limit(limit + excluded.size);
  if (error) throw error;
  return (data || []).filter((profile) => !excluded.has(profile.id)).slice(0, limit);
}
