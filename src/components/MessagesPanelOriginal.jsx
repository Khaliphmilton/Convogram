import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ImagePlus, Mic, Send, Square, Phone, Video, Smile } from "lucide-react";
import { getConversationDetails, getMessages, sendMessage, subscribeToConversation } from "../lib/messages";
import { uploadMessageMedia, uploadVoiceMessage } from "../lib/storage";
import { supabase } from "../lib/supabase";
import { VerifiedBadge } from "./VerifiedBadge";
import "./MessagesPanel.css";
import "./MessagesPanel.chat-fix.css";
import "./MessagesPanel.bottom-safe-area.css";

function formatTime(value) {
  try {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function profileName(profile) {
  return profile?.display_name || profile?.username || "Convogram user";
}

function MessageBody({ message }) {
  if (message.is_deleted) {
    return <em className="convogram-chat-deleted">Message deleted</em>;
  }
  if (message.message_type === "image" && message.media_url) {
    return <img className="convogram-chat-image" src={message.media_url} alt="Sent photo" loading="lazy" />;
  }
  if (message.message_type === "video" && message.media_url) {
    return <video className="convogram-chat-video" src={message.media_url} controls playsInline preload="metadata" />;
  }
  if (message.message_type === "audio" && message.media_url) {
    return <audio className="convogram-chat-audio" src={message.media_url} controls preload="metadata" />;
  }
  return <span>{message.content || "Attachment"}</span>;
}

export function MessagesPanel({ userId, initialConversationId = null, onBack, onChatOpen }) {
  const [conversation, setConversation] = useState(null);
  const [peer, setPeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [typingNotice] = useState("");
  const streamRef = useRef(null);
  const composerRef = useRef(null);
  const fileRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    onChatOpen?.(true);
    return () => onChatOpen?.(false);
  }, [onChatOpen]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!initialConversationId || !userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const details = await getConversationDetails(initialConversationId);
        if (cancelled) return;
        setConversation(details);

        const { data: members, error: memberError } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", initialConversationId);
        if (memberError) throw memberError;
        const peerId = (members || []).map((m) => m.user_id).find((id) => id && id !== userId);
        if (peerId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id,username,display_name,avatar_url,is_verified")
            .eq("id", peerId)
            .maybeSingle();
          if (!cancelled) setPeer(profile || null);
        }

        const data = await getMessages(initialConversationId, 100, userId);
        if (!cancelled) setMessages(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Unable to load this conversation.");
          setMessages([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [initialConversationId, userId]);

  useEffect(() => {
    if (!initialConversationId) return undefined;
    return subscribeToConversation(
      initialConversationId,
      (incoming) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        });
      },
      (updated) => {
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
      },
    );
  }, [initialConversationId]);

  useEffect(() => {
    const el = streamRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages.length, loading]);

  const title = useMemo(() => {
    if (conversation?.type === "group") return conversation.name || "Group conversation";
    return profileName(peer);
  }, [conversation, peer]);

  const sendText = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !initialConversationId || !userId || sending) return;
    try {
      setSending(true);
      setError("");
      const sent = await sendMessage(initialConversationId, userId, text, "text");
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, { ...sent, profiles: { id: userId } }]));
      setDraft("");
      requestAnimationFrame(() => composerRef.current?.focus());
    } catch (e) {
      setError(e?.message || "Could not send message.");
    } finally {
      setSending(false);
    }
  };

  const chooseMedia = () => fileRef.current?.click();

  const handleMedia = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !initialConversationId || !userId || uploading) return;
    try {
      setUploading(true);
      setError("");
      const uploaded = await uploadMessageMedia(file, userId);
      const sent = await sendMessage(initialConversationId, userId, null, uploaded.mediaType, uploaded.url);
      setMessages((prev) => [...prev, sent]);
    } catch (e) {
      setError(e?.message || "Could not send media.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const startRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("Voice messages are not available on this device.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data?.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        try {
          setUploading(true);
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || "audio/webm" });
          const uploaded = await uploadVoiceMessage(file, userId);
          const sent = await sendMessage(initialConversationId, userId, null, "audio", uploaded.url);
          setMessages((prev) => [...prev, sent]);
        } catch (e) {
          setError(e?.message || "Could not send voice message.");
        } finally {
          stream.getTracks().forEach((track) => track.stop());
          setUploading(false);
          setRecording(false);
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (e) {
      setError(e?.message || "Microphone permission is required.");
    }
  };

  return (
    <div className="messages-panel chat-open convogram-stable-chat">
      <style>{`
        .convogram-stable-chat{position:fixed;inset:0;background:#080808;color:#fff;z-index:50;display:flex;flex-direction:column;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
        .convogram-stable-chat-head{height:62px;min-height:62px;background:#0b0b0b;border-bottom:1px solid #202020;display:flex;align-items:center;gap:10px;padding:0 12px}
        .convogram-stable-chat-back{width:40px;height:40px;border:0;background:transparent;color:#fff;display:grid;place-items:center;border-radius:50%}
        .convogram-stable-chat-avatar{width:38px;height:38px;border-radius:50%;overflow:hidden;background:#181818;border:1px solid #292929;display:grid;place-items:center;flex:0 0 auto}
        .convogram-stable-chat-avatar img{width:100%;height:100%;object-fit:cover}
        .convogram-stable-chat-title{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}
        .convogram-stable-chat-name{display:flex;align-items:center;gap:3px;font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .convogram-stable-chat-status{font-size:11px;color:#777}
        .convogram-stable-chat-actions{display:flex;gap:2px}
        .convogram-stable-chat-action{width:38px;height:38px;border:0;background:transparent;color:#ddd;display:grid;place-items:center;border-radius:50%}
        .convogram-stable-chat-body{min-height:0;flex:1;display:flex;flex-direction:column;background:#0a0a0a}
        .convogram-stable-chat-stream{flex:1;min-height:0;overflow-y:auto;padding:14px 12px 18px;display:flex;flex-direction:column;gap:8px;overscroll-behavior:contain}
        .convogram-chat-state{margin:auto;max-width:320px;text-align:center;color:#777;display:flex;flex-direction:column;gap:7px;align-items:center}
        .convogram-chat-state strong{color:#eee;font-size:14px}
        .convogram-chat-state span{font-size:12px}
        .convogram-chat-error{margin:8px 12px;padding:9px 11px;border-radius:10px;background:#2a1515;color:#ffb2b2;font-size:12px;border:1px solid #4a2222}
        .convogram-chat-row{display:flex;width:100%}
        .convogram-chat-row.mine{justify-content:flex-end}
        .convogram-chat-bubble{max-width:min(78%,420px);padding:9px 11px;border-radius:16px;background:#181818;border:1px solid #272727;box-sizing:border-box}
        .convogram-chat-row.mine .convogram-chat-bubble{background:#145c8c;border-color:#1879b7}
        .convogram-chat-content{font-size:14px;line-height:1.4;overflow-wrap:anywhere}
        .convogram-chat-meta{margin-top:4px;font-size:9px;opacity:.65;text-align:right}
        .convogram-chat-image{max-width:100%;max-height:280px;border-radius:12px;display:block}
        .convogram-chat-video{max-width:100%;max-height:280px;border-radius:12px;display:block}
        .convogram-chat-audio{width:min(240px,100%)}
        .convogram-chat-deleted{opacity:.65}
        .convogram-stable-composer-wrap{padding:8px 10px 8px;background:#0b0b0b;border-top:1px solid #202020}
        .convogram-stable-composer{display:flex;align-items:flex-end;gap:7px;background:#151515;border:1px solid #292929;border-radius:22px;padding:5px}
        .convogram-stable-icon{width:38px;height:38px;border:0;background:transparent;color:#bbb;display:grid;place-items:center;border-radius:50%;flex:0 0 auto}
        .convogram-stable-input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:#fff;resize:none;font:inherit;font-size:14px;padding:9px 4px;max-height:110px}
        .convogram-stable-send{width:38px;height:38px;border:0;border-radius:50%;background:#20a4f3;color:#fff;display:grid;place-items:center;flex:0 0 auto}
        @media(max-width:600px){.convogram-stable-chat-bubble{max-width:82%}}
      `}</style>

      <header className="convogram-stable-chat-head">
        <button type="button" className="convogram-stable-chat-back" aria-label="Back" onClick={onBack}>
          <ChevronLeft size={23} />
        </button>
        <div className="convogram-stable-chat-avatar">
          {peer?.avatar_url ? <img src={peer.avatar_url} alt="" /> : <span>●</span>}
        </div>
        <div className="convogram-stable-chat-title">
          <div className="convogram-stable-chat-name">
            {title}
            <VerifiedBadge verified={peer?.is_verified} size={16} />
          </div>
          <span className="convogram-stable-chat-status">{conversation?.type === "group" ? "Group chat" : "Messages"}</span>
        </div>
        <div className="convogram-stable-chat-actions">
          <button type="button" className="convogram-stable-chat-action" aria-label="Voice call"><Phone size={18} /></button>
          <button type="button" className="convogram-stable-chat-action" aria-label="Video call"><Video size={18} /></button>
        </div>
      </header>

      <div className="convogram-stable-chat-body">
        <div className="convogram-stable-chat-stream" ref={streamRef}>
          {loading ? (
            <div className="convogram-chat-state"><strong>Loading messages…</strong><span>Please wait</span></div>
          ) : messages.length === 0 ? (
            <div className="convogram-chat-state"><strong>No messages yet</strong><span>Send a message to start the conversation.</span></div>
          ) : (
            messages.map((message) => {
              const mine = message.sender_id === userId;
              return (
                <div className={`convogram-chat-row ${mine ? "mine" : ""}`} key={message.id}>
                  <div className="convogram-chat-bubble">
                    {!mine && peer && message.profiles?.display_name && message.profiles.display_name !== peer.display_name && (
                      <div style={{ fontSize: 10, opacity: 0.65, marginBottom: 3 }}>{message.profiles.display_name}</div>
                    )}
                    <div className="convogram-chat-content"><MessageBody message={message} /></div>
                    <div className="convogram-chat-meta">{formatTime(message.created_at)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {error && <div className="convogram-chat-error">{error}</div>}
        {typingNotice && <div style={{ padding: "0 14px 6px", color: "#777", fontSize: 11 }}>{typingNotice}</div>}

        <div className="convogram-stable-composer-wrap">
          <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={handleMedia} />
          <form className="convogram-stable-composer" onSubmit={sendText}>
            <button type="button" className="convogram-stable-icon" aria-label="Add media" onClick={chooseMedia} disabled={uploading}><ImagePlus size={20} /></button>
            <textarea
              ref={composerRef}
              className="convogram-stable-input"
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message"
              aria-label="Message"
            />
            <button type="button" className="convogram-stable-icon" aria-label="Emoji"><Smile size={19} /></button>
            {draft.trim() ? (
              <button type="submit" className="convogram-stable-send" aria-label="Send" disabled={sending}><Send size={18} /></button>
            ) : (
              <button type="button" className="convogram-stable-icon" aria-label={recording ? "Stop recording" : "Record voice message"} onClick={startRecording} disabled={uploading}>
                {recording ? <Square size={18} /> : <Mic size={19} />}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default MessagesPanel;
