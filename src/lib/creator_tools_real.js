import { supabase } from "./supabase";

export async function createDraft(userId, type, payload = {}) {
  const { data, error } = await supabase.from("creator_drafts").insert([{ user_id: userId, type, payload, status: "draft" }]).select().single();
  if (error) throw error;
  return data;
}

export async function getDrafts(userId) {
  const { data, error } = await supabase.from("creator_drafts").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function deleteDraft(userId, id) {
  const { error } = await supabase.from("creator_drafts").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function getCreatorPostAnalytics(userId) {
  const { data, error } = await supabase.from("posts").select("id,created_at,likes(count),comments(count)").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return data || [];
}
