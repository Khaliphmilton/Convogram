import { supabase } from "./supabase";

export async function createCommunityInvite(communityId, inviterId, inviteeId) {
  const { data, error } = await supabase.from("community_invites").insert([{ community_id: communityId, inviter_id: inviterId, invitee_id: inviteeId, status: "pending" }]).select().single();
  if (error) throw error;
  return data;
}

export async function getCommunityMembers(communityId) {
  const { data, error } = await supabase.from("community_members").select("*, profiles:user_id(id,username,display_name,avatar_url)").eq("community_id", communityId).order("joined_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function removeCommunityMember(communityId, userId) {
  const { error } = await supabase.from("community_members").delete().eq("community_id", communityId).eq("user_id", userId);
  if (error) throw error;
}

export async function pinCommunityPost(postId, communityId) {
  const { data, error } = await supabase.from("community_posts").update({ pinned: true }).eq("id", postId).eq("community_id", communityId).select().single();
  if (error) throw error;
  return data;
}
