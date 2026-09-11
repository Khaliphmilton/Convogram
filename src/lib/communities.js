import { supabase } from "./supabase";

export async function getCommunities(limit = 50) {
  const { data, error } = await supabase
    .from("communities")
    .select(
      `
      *,
      profiles:owner_id(id, username, display_name, avatar_url),
      community_members(count)
    `
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getUserCommunities(userId) {
  const { data, error } = await supabase
    .from("community_members")
    .select(
      `
      communities(*),
      role
    `
    )
    .eq("user_id", userId);
  if (error) throw error;
  return data?.map((m) => ({ ...m.communities, userRole: m.role }));
}

export async function getCommunity(communityId) {
  const { data, error } = await supabase
    .from("communities")
    .select(
      `
      *,
      profiles:owner_id(id, username, display_name, avatar_url),
      community_members(
        *,
        profiles:user_id(id, username, display_name, avatar_url)
      )
    `
    )
    .eq("id", communityId)
    .single();
  if (error) throw error;
  return data;
}

export async function createCommunity(ownerId, name, description = null, avatarUrl = null) {
  const { data, error } = await supabase
    .from("communities")
    .insert([
      {
        owner_id: ownerId,
        name,
        description: description || null,
        avatar_url: avatarUrl || null,
      },
    ])
    .select()
    .single();
  if (error) throw error;

  // Add owner as member
  await supabase
    .from("community_members")
    .insert([{ community_id: data.id, user_id: ownerId, role: "owner" }]);

  return data;
}

export async function joinCommunity(communityId, userId) {
  const { data, error } = await supabase
    .from("community_members")
    .insert([{ community_id: communityId, user_id: userId, role: "member" }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function leaveCommunity(communityId, userId) {
  const { error } = await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function getCommunityPosts(communityId, limit = 20) {
  const { data, error } = await supabase
    .from("community_posts")
    .select(
      `
      *,
      profiles:user_id(id, username, display_name, avatar_url)
    `
    )
    .eq("community_id", communityId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function createCommunityPost(communityId, userId, content, mediaUrl = null, mediaType = null) {
  const { data, error } = await supabase
    .from("community_posts")
    .insert([
      {
        community_id: communityId,
        user_id: userId,
        content: content || null,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
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
