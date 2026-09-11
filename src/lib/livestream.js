import { supabase } from "./supabase";

export async function createLivestream(hostId, title, description = "") {
  const { data, error } = await supabase.from("livestreams").insert([{ host_id: hostId, title: title.trim(), description: description.trim(), status: "scheduled" }]).select().single();
  if (error) throw error;
  return data;
}

export async function startLivestream(id, roomKey) {
  const { data, error } = await supabase.from("livestreams").update({ status: "live", room_key: roomKey, started_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function endLivestream(id) {
  const { data, error } = await supabase.from("livestreams").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function getLiveStreams(limit = 30) {
  const { data, error } = await supabase.from("livestreams").select("*, profiles:host_id(id, username, display_name, avatar_url)").eq("status", "live").order("started_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

export async function joinLivestream(streamId, userId) {
  const { data, error } = await supabase.from("livestream_viewers").upsert([{ livestream_id: streamId, user_id: userId, joined_at: new Date().toISOString() }], { onConflict: "livestream_id,user_id" }).select().single();
  if (error) throw error;
  return data;
}

export async function leaveLivestream(streamId, userId) {
  const { data, error } = await supabase.from("livestream_viewers").update({ left_at: new Date().toISOString() }).eq("livestream_id", streamId).eq("user_id", userId).select().single();
  if (error) throw error;
  return data;
}
