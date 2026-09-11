import { supabase } from "./supabase";

export async function createCall(initiatorId, callType = "voice") {
  const { data, error } = await supabase.from("call_sessions").insert([{ initiator_id: initiatorId, call_type: callType, status: "initiated" }]).select().single();
  if (error) throw error;
  return data;
}

export async function addCallParticipant(callSessionId, userId) {
  const { data, error } = await supabase.from("call_participants").insert([{ call_session_id: callSessionId, user_id: userId }]).select().single();
  if (error) throw error;
  return data;
}

export async function updateCallStatus(callId, status) {
  const patch = { status };
  if (status === "connected") patch.started_at = new Date().toISOString();
  if (["ended", "missed", "declined"].includes(status)) patch.ended_at = new Date().toISOString();
  const { data, error } = await supabase.from("call_sessions").update(patch).eq("id", callId).select().single();
  if (error) throw error;
  return data;
}

export function subscribeToCall(callId, onUpdate) {
  const channel = supabase.channel(`convogram-call-${callId}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "call_sessions", filter: `id=eq.${callId}` }, (payload) => onUpdate(payload.new)).subscribe();
  return () => supabase.removeChannel(channel);
}
