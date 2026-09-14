import { supabase } from "./supabase";

export async function getCommunityGroups(communityId) {
  const { data, error } = await supabase.from("community_groups").select("*, community_group_members(count)").eq("community_id", communityId).order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}
export async function createCommunityGroup(communityId, userId, name, description = null) {
  const { data, error } = await supabase.from("community_groups").insert({ community_id: communityId, created_by: userId, name, description: description || null }).select().single();
  if (error) throw error;
  const { error: memberError } = await supabase.from("community_group_members").insert({ group_id: data.id, user_id: userId, role: "admin" });
  if (memberError) throw memberError;
  return data;
}
export async function joinCommunityGroup(groupId, userId) {
  const { data, error } = await supabase.from("community_group_members").upsert({ group_id: groupId, user_id: userId, role: "member" }, { onConflict: "group_id,user_id" }).select().single();
  if (error) throw error;
  return data;
}
export async function getCommunityGroupMessages(groupId, limit = 100) {
  const { data, error } = await supabase.from("community_group_messages").select("*, profiles:user_id(id,username,display_name,avatar_url)").eq("group_id", groupId).order("created_at", { ascending: true }).limit(limit);
  if (error) throw error;
  return data || [];
}
export async function sendCommunityGroupMessage(groupId, userId, content) {
  const { data, error } = await supabase.from("community_group_messages").insert({ group_id: groupId, user_id: userId, content: content.trim() }).select("*, profiles:user_id(id,username,display_name,avatar_url)").single();
  if (error) throw error;
  return data;
}
