import { supabase } from "./supabase";

export async function blockUser(blockerId, blockedId) {
  if (blockerId === blockedId) throw new Error("You cannot block yourself.");
  const { data, error } = await supabase.from("blocks").insert([{ blocker_id: blockerId, blocked_id: blockedId }]).select().single();
  if (error) throw error;
  return data;
}

export async function unblockUser(blockerId, blockedId) {
  const { error } = await supabase.from("blocks").delete().eq("blocker_id", blockerId).eq("blocked_id", blockedId);
  if (error) throw error;
}

export async function isUserBlocked(blockerId, blockedId) {
  const { data, error } = await supabase.from("blocks").select("id").eq("blocker_id", blockerId).eq("blocked_id", blockedId).maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function reportContent(reporterId, targetType, targetId, reason, details = null) {
  const payload = { reporter_id: reporterId, target_type: targetType, target_id: targetId, reason, details };
  const { data, error } = await supabase.from("reports").insert([payload]).select().single();
  if (error) throw error;
  return data;
}
