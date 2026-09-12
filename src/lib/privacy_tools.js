import { supabase } from "./supabase";

export async function blockUser(blockerId, blockedId) {
  if (blockerId === blockedId) throw new Error("You cannot block yourself.");
  const { data, error } = await supabase.from("blocks").upsert([{ blocker_id: blockerId, blocked_id: blockedId }], { onConflict: "blocker_id,blocked_id" }).select().single();
  if (error) throw error;
  return data;
}

export async function unblockUser(blockerId, blockedId) {
  const { error } = await supabase.from("blocks").delete().eq("blocker_id", blockerId).eq("blocked_id", blockedId);
  if (error) throw error;
}

export async function getBlockedUsers(userId) {
  const { data, error } = await supabase.from("blocks").select("*, profiles:blocked_id(id,username,display_name,avatar_url)").eq("blocker_id", userId);
  if (error) throw error;
  return data || [];
}

export async function reportContent(reporterId, targetType, targetId, reason, details = "") {
  const { data, error } = await supabase.from("reports").insert([{ reporter_id: reporterId, target_type: targetType, target_id: targetId, reason: reason.trim(), details: details.trim(), status: "pending" }]).select().single();
  if (error) throw error;
  return data;
}
