import { useEffect, useRef, useState } from "react";
import { Phone, Video, PhoneOff, Mic, MicOff, VideoOff, Volume2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import "./CallOverlay.css";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function makeCallId() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

export function CallOverlay({ conversationId = null, userId, remoteUserId = null, remoteName = "Contact", global = false }) {
  const [call, setCall] = useState(null);
  const [incoming, setIncoming] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [error, setError] = useState("");
  const channelRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const pendingIceRef = useRef([]);
  const callRef = useRef(null);
  const targetRef = useRef({ conversationId, remoteUserId, remoteName });

  useEffect(() => { callRef.current = call; }, [call]);
  useEffect(() => {
    targetRef.current = { conversationId, remoteUserId, remoteName };
  }, [conversationId, remoteUserId, remoteName]);

  useEffect(() => {
    if (!userId || !supabase) return undefined;
    const topic = global ? `convogram-user-${userId}` : conversationId ? `convogram-call-${conversationId}` : null;
    if (!topic) return undefined;
    const channel = supabase.channel(topic);
    channelRef.current = channel;
    channel.on("broadcast", { event: "signal" }, async ({ payload }) => {
      if (!payload || payload.senderId === userId || (payload.toUserId && payload.toUserId !== userId)) return;
      try { await handleSignal(payload); } catch (err) { setError(err.message || "Call connection failed."); }
    }).subscribe();

    const startHandler = (e) => {
      const detail = e.detail || {};
      if (global) {
        if (!detail.global || !detail.remoteUserId || !detail.conversationId || callRef.current) return;
        startCall(detail.type || "voice", detail.remoteUserId, detail.remoteName || "Contact", detail.conversationId);
      } else {
        if (detail.global || callRef.current) return;
        const target = targetRef.current;
        if (target.remoteUserId && target.conversationId) startCall(detail.type || "voice", target.remoteUserId, target.remoteName || "Contact", target.conversationId);
      }
    };
    window.addEventListener("convogram-start-call", startHandler);
    return () => {
      window.removeEventListener("convogram-start-call", startHandler);
      supabase.removeChannel(channel);
      channelRef.current = null;
      cleanup(false);
    };
  }, [userId, conversationId, global]);

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    if (remoteVideoRef.current && remoteStreamRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
  }, [call?.type, call?.status]);

  async function signal(payload, targetUserId) {
    if (!supabase || !targetUserId) return;
    const channel = channelRef.current;
    if (channel) await channel.send({ type: "broadcast", event: "signal", payload: { ...payload, senderId: userId, toUserId: targetUserId } });
  }

  function createPeer(callId, type, peerId) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (event) => {
      if (event.candidate) signal({ kind: "ice", callId, candidate: event.candidate }, peerId);
    };
    pc.ontrack = (event) => {
      if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
      (event.streams?.[0]?.getTracks() || [event.track]).forEach((track) => {
        if (!remoteStreamRef.current.getTracks().some((t) => t.id === track.id)) remoteStreamRef.current.addTrack(track);
      });
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") setError("The call connection failed.");
    };
    pcRef.current = pc;
    return pc;
  }

  async function getLocalMedia(type) {
    const constraints = type === "video"
      ? { audio: true, video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } }
      : { audio: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }

  async function startCall(type, peerId, peerName, targetConversationId) {
    if (!peerId || !targetConversationId) { setError("This conversation has no other participant to call."); return; }
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) { setError("Calling is not supported by this browser."); return; }
    try {
      setError("");
      const callId = makeCallId();
      const stream = await getLocalMedia(type);
      const pc = createPeer(callId, type, peerId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      targetRef.current = { conversationId: targetConversationId, remoteUserId: peerId, remoteName: peerName };
      setCall({ callId, type, status: "calling", remoteName: peerName, remoteUserId: peerId, conversationId: targetConversationId });
      await signal({ kind: "offer", callId, type, offer, conversationId: targetConversationId }, peerId);
    } catch (err) {
      cleanup(false);
      setError(err.name === "NotAllowedError" ? "Microphone/camera permission was denied." : err.message || "Could not start the call.");
    }
  }

  async function handleSignal(payload) {
    if (payload.kind === "offer") {
      if (callRef.current?.callId && callRef.current.callId !== payload.callId) return;
      setIncoming((current) => current?.callId === payload.callId ? current : {
        ...payload,
        fromUserId: payload.senderId,
        remoteName: payload.remoteName || "Contact",
      });
      return;
    }
    if (payload.kind === "answer") {
      if (!callRef.current || callRef.current.callId !== payload.callId) return;
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(payload.answer));
      await flushIce();
      setCall((current) => current ? { ...current, status: "connected" } : current);
      return;
    }
    if (payload.kind === "ice") {
      if (!callRef.current || callRef.current.callId !== payload.callId || !pcRef.current) return;
      if (pcRef.current.remoteDescription) await pcRef.current.addIceCandidate(payload.candidate);
      else pendingIceRef.current.push(payload.candidate);
      return;
    }
    if (payload.kind === "hangup") {
      if (callRef.current?.callId === payload.callId || incoming?.callId === payload.callId) {
        cleanup(false);
        setIncoming(null);
      }
    }
  }

  async function flushIce() {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) return;
    const queued = pendingIceRef.current.splice(0);
    for (const candidate of queued) {
      try { await pc.addIceCandidate(candidate); } catch (_) {}
    }
  }

  async function acceptIncoming() {
    if (!incoming) return;
    try {
      setError("");
      const pending = incoming;
      setIncoming(null);
      const stream = await getLocalMedia(pending.type);
      const pc = createPeer(pending.callId, pending.type, pending.senderId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(pending.offer));
      await flushIce();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      targetRef.current = { conversationId: pending.conversationId, remoteUserId: pending.senderId, remoteName: pending.remoteName || "Contact" };
      setCall({ callId: pending.callId, type: pending.type, status: "connected", remoteName: pending.remoteName || "Contact", remoteUserId: pending.senderId, conversationId: pending.conversationId });
      await signal({ kind: "answer", callId: pending.callId, type: pending.type, answer, conversationId: pending.conversationId }, pending.senderId);
    } catch (err) {
      cleanup(false);
      setError(err.name === "NotAllowedError" ? "Microphone/camera permission was denied." : err.message || "Could not answer the call.");
    }
  }

  async function declineIncoming() {
    if (!incoming) return;
    await signal({ kind: "hangup", callId: incoming.callId }, incoming.senderId);
    setIncoming(null);
  }

  async function hangup() {
    if (callRef.current?.callId) await signal({ kind: "hangup", callId: callRef.current.callId }, callRef.current.remoteUserId);
    cleanup(false);
  }

  function cleanup(resetError = true) {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingIceRef.current = [];
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCall(null);
    setIncoming(null);
    if (resetError) setError("");
  }

  function toggleMute() {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  }

  function toggleCamera() {
    const next = !cameraOff;
    localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = !next; });
    setCameraOff(next);
  }

  if (!global && !conversationId) return null;
  const displayName = call?.remoteName || incoming?.remoteName || remoteName;

  return <>{(call || incoming) && <div className="call-layer">
    {incoming && !call && <div className="incoming-call-card">
      <div className="incoming-call-icon">{incoming.type === "video" ? <Video size={28} /> : <Phone size={28} />}</div>
      <span>Incoming {incoming.type === "video" ? "video" : "voice"} call</span>
      <strong>{displayName}</strong>
      <div className="incoming-call-actions">
        <button className="call-decline" onClick={declineIncoming}><PhoneOff size={20} />Decline</button>
        <button className="call-accept" onClick={acceptIncoming}>{incoming.type === "video" ? <Video size={20} /> : <Phone size={20} />}Answer</button>
      </div>
    </div>}
    {call && <div className={`active-call ${call.type === "video" ? "video-call" : "voice-call"}`}>
      {call.type === "video" ? <><video ref={remoteVideoRef} className="call-remote-video" autoPlay playsInline /><video ref={localVideoRef} className="call-local-video" autoPlay muted playsInline /></> : <div className="voice-call-stage"><div className="call-avatar">{displayName.slice(0, 1).toUpperCase()}</div><strong>{displayName}</strong><span>{call.status === "calling" ? "Calling…" : "Connected"}</span><Volume2 size={18} /></div>}
      <div className="call-status-pill">{call.status === "calling" ? "Calling…" : "Connected"}</div>
      <div className="call-controls">
        <button className={muted ? "control-active" : ""} onClick={toggleMute}>{muted ? <MicOff /> : <Mic />}<small>{muted ? "Unmute" : "Mute"}</small></button>
        {call.type === "video" && <button className={cameraOff ? "control-active" : ""} onClick={toggleCamera}>{cameraOff ? <VideoOff /> : <Video />}<small>{cameraOff ? "Camera" : "Video"}</small></button>}
        <button className="call-end" onClick={hangup}><PhoneOff /><small>End</small></button>
      </div>
    </div>}
    {error && <div className="call-error">{error}</div>}
  </div>}{error && !call && !incoming && <div className="call-toast" onClick={() => setError("")}>{error}</div>}</>;
}
