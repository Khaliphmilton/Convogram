import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { createCall, updateCallStatus } from "../lib/calls";
import { createCallChannel } from "../lib/call_signaling";
import "./CallPanel.css";

export function CallPanel({ userId, participantId, callType = "video", onClose }) {
  const [callId, setCallId] = useState(null);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(callType !== "video");
  const [error, setError] = useState("");
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const streamRef = useRef(null);
  const pendingCandidates = useRef([]);

  useEffect(() => {
    let active = true;
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw new Error("Calls require a modern HTTPS-enabled browser.");
        const call = await createCall(userId, callType);
        if (!active) return;
        setCallId(call.id);
        await updateCallStatus(call.id, "ringing");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === "video" });
        streamRef.current = stream;
        if (localVideo.current) localVideo.current.srcObject = stream;
        const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
        peerRef.current = peer;
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));
        peer.ontrack = (event) => { if (remoteVideo.current) remoteVideo.current.srcObject = event.streams[0]; };
        peer.onconnectionstatechange = () => { if (["connected"].includes(peer.connectionState)) setConnected(true); if (["failed","closed","disconnected"].includes(peer.connectionState)) setConnected(false); };
        channelRef.current = createCallChannel(call.id, {
          onSignal: async (payload) => {
            if (payload.from === userId) return;
            if (payload.description) {
              await peer.setRemoteDescription(payload.description);
              if (payload.description.type === "offer") {
                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);
                channelRef.current?.sendSignal({ from: userId, to: payload.from, description: peer.localDescription });
              }
            }
            if (payload.candidate) {
              try { await peer.addIceCandidate(payload.candidate); } catch { pendingCandidates.current.push(payload.candidate); }
            }
          }
        });
        peer.onicecandidate = (event) => { if (event.candidate) channelRef.current?.sendSignal({ from: userId, to: participantId, candidate: event.candidate }); };
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        channelRef.current.sendSignal({ from: userId, to: participantId, description: peer.localDescription });
      } catch (err) { if (active) setError(err.message || "Unable to start call."); }
    }
    start();
    return () => {
      active = false;
      if (callId) updateCallStatus(callId, "ended").catch(() => {});
      channelRef.current?.close();
      peerRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [userId, participantId, callType]);

  function toggleMute() {
    const audio = streamRef.current?.getAudioTracks() || [];
    audio.forEach((track) => { track.enabled = !track.enabled; });
    setMuted((value) => !value);
  }

  function toggleCamera() {
    const video = streamRef.current?.getVideoTracks() || [];
    video.forEach((track) => { track.enabled = !track.enabled; });
    setCameraOff((value) => !value);
  }

  async function hangUp() {
    if (callId) await updateCallStatus(callId, "ended").catch(() => {});
    onClose?.();
  }

  return <div className="call-panel">
    <div className="call-videos"><video ref={remoteVideo} autoPlay playsInline className="remote-video" /><video ref={localVideo} autoPlay playsInline muted className="local-video" /></div>
    <div className="call-status">{error || (connected ? "Connected" : "Connecting…")}</div>
    <div className="call-controls"><button onClick={toggleMute}>{muted ? <MicOff /> : <Mic />}</button>{callType === "video" && <button onClick={toggleCamera}>{cameraOff ? <VideoOff /> : <Video />}</button>}<button className="end-call" onClick={hangUp}><PhoneOff /></button></div>
  </div>;
}
