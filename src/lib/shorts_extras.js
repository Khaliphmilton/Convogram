import { supabase } from "./supabase";

export async function getShortsBySound(soundName, limit = 30) {
  const { data, error } = await supabase.from("shorts").select("*, profiles:user_id(id,username,display_name,avatar_url)").eq("sound_name", soundName).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getShortsByCreator(userId, limit = 30) {
  const { data, error } = await supabase.from("shorts").select("*, profiles:user_id(id,username,display_name,avatar_url)").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

export async function searchShorts(query, limit = 30) {
  const { data, error } = await supabase.from("shorts").select("*, profiles:user_id(id,username,display_name,avatar_url)").or(`caption.ilike.%${query.trim()}%,sound_name.ilike.%${query.trim()}%`).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}
