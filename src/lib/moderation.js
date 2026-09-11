import { supabase } from "./supabase";

export async function blockUser(blockerId, blockedId) {
  const { data, error } = await supabase
    .from("blocks")
    .insert([{ blocker_id: blockerId, blocked_id: blockedId }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function unblockUser(blockerId, blockedId) {
  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  if (error) throw error;
}

export async function isUserBlocked(blockerId, blockedId) {
  const { data, error } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return !!data;
}

export async function getBlockedUsers(userId) {
  const { data, error } = await supabase
    .from("blocks")
    .select(
      `
      *,
      profiles:blocked_id(id, username, display_name, avatar_url)
    `
    )
    .eq("blocker_id", userId);
  if (error) throw error;
  return data?.map((b) => b.profiles);
}

export async function reportUser(reporterId, reportedUserId, reason, description = null) {
  const { data, error } = await supabase
    .from("reports")
    .insert([
      {
        reporter_id: reporterId,
        reported_user_id: reportedUserId,
        reason,
        description: description || null,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function reportPost(reporterId, postId, reason, description = null) {
  const { data, error } = await supabase
    .from("reports")
    .insert([
      {
        reporter_id: reporterId,
        post_id: postId,
        reason,
        description: description || null,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
}
