import { supabase } from "./supabase";

export function createCallChannel(callId, handlers = {}) {
  const channel = supabase.channel(`convogram-webrtc-${callId}`, { config: { broadcast: { self: false } } });
  if (handlers.onSignal) channel.on("broadcast", { event: "signal" }, ({ payload }) => handlers.onSignal(payload));
  if (handlers.onParticipant) channel.on("broadcast", { event: "participant" }, ({ payload }) => handlers.onParticipant(payload));
  if (handlers.onControl) channel.on("broadcast", { event: "control" }, ({ payload }) => handlers.onControl(payload));
  channel.subscribe();
  return {
    channel,
    sendSignal: (payload) => channel.send({ type: "broadcast", event: "signal", payload }),
    sendParticipant: (payload) => channel.send({ type: "broadcast", event: "participant", payload }),
    sendControl: (payload) => channel.send({ type: "broadcast", event: "control", payload }),
    close: () => supabase.removeChannel(channel),
  };
}
