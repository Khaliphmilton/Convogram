import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ImagePlus, MessageCircle, Plus, Search, Send, Users, X, Smile, Mic, Square, Reply, Trash2, Play, Pause, Phone, Video } from "lucide-react";
import { getConversations, getConversationDetails, getMessages, sendMessage, createConversation, subscribeToConversation, markMessageAsRead, addMessageReaction, removeMessageReaction, deleteMessage, consumePendingDirectConversationId } from "../lib/messages";
import { uploadMessageMedia, uploadVoiceMessage } from "../lib/storage";
import { supabase } from "../lib/supabase";
import { VerifiedBadge } from "./VerifiedBadge";
import "./MessagesPanel.css";
import "./MessagesPanel.chat-fix.css";

const REACTIONS = ["❤️", "😂", "👍", "🔥", "😮", "😢"];

function conversationTitle(c, userId) {
  if (!c) return "Conversation";
  if (c.type === "group") return c.name || "Group conversation";
  const member = c.conversation_members?.find(m => m.user_id !== userId);
  return member?.profiles?.display_name || member?.profiles?.username || c._direct_profile?.display_name || c._direct_profile?.username || c.name || "Direct conversation";
}

function ConversationAvatar({ conversation, size = 38 }) {
  const profile = conversation?.type === "direct" ? conversation?._direct_profile : null;
  return <div className="conversation-avatar" style={{ width: size, height: size, flex: `0 0 ${size}px` }}>
    {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : conversation?.type === "group" ? <Users size={18} /> : <MessageCircle size={18} />}
  </div>;
}

function VoiceNote({ src }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const loaded = () => setDuration(Number.isFinite(a.duration) ? a.duration : 0);
    const time = () => setCurrent(a.currentTime || 0);
    const ended = () => { setPlaying(false); setCurrent(0); };
    a.addEventListener("loadedmetadata", loaded); a.addEventListener("timeupdate", time); a.addEventListener("ended", ended);
    return () => { a.removeEventListener("loadedmetadata", loaded); a.removeEventListener("timeupdate", time); a.removeEventListener("ended", ended); };
  }, [src]);
  const toggle = async () => {
    const a = ref.current;
    if (!a) return;
    try { if (a.paused) { await a.play(); setPlaying(true); } else { a.pause(); setPlaying(false); } } catch (_) {}
  };
  const format = v => `${Math.floor(v / 60)}:${String(Math.floor(v % 60)).padStart(2, "0")}`;
  const pct = duration ? Math.min(100, Math.max(0, current / duration * 100)) : 0;
  return <div className="voice-note" onClick={e => e.stopPropagation()}>
    <audio ref={ref} src={src} preload="metadata" />
    <button type="button" className="voice-note-play" onClick={toggle}>{playing ? <Pause size={15} /> : <Play size={15} />}</button>
    <div className="voice-note-main"><div className="voice-note-track"><span className="voice-note-progress" style={{ width: `${pct}%` }} /></div><span className="voice-note-time">{format(playing ? current : duration)}</span></div>
  </div>;
}

export function MessagesPanel({ userId, initialConversationId = null, onBack, onChatOpen }) {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [details, setDetails] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [reactionMessageId, setReactionMessageId] = useState(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newMemberId, setNewMemberId] = useState("");
  const [remoteOnline, setRemoteOnline] = useState(false);
  const fileRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const messageStreamRef = useRef(null);
  const presenceRef = useRef(null);
  const swipeRef = useRef({ id: null, x: 0, y: 0, active: false });

  const beginSwipeReply = (e, messageId) => {
    const t = e.touches?.[0];
    if (!t) return;
    swipeRef.current = { id: messageId, x: t.clientX, y: t.clientY, active: false };
  };
  const moveSwipeReply = (e) => {
    const t = e.touches?.[0];
    const s = swipeRef.current;
    if (!t || !s.id) return;
    const dx = t.clientX - s.x;
    const dy = Math.abs(t.clientY - s.y);
    if (dx > 18 && dx > dy * 1.25) s.active = true;
  };
  const endSwipeReply = (e, message) => {
    const t = e.changedTouches?.[0];
    const s = swipeRef.current;
    if (!t || !s.id) return;
    const dx = t.clientX - s.x;
    const dy = Math.abs(t.clientY - s.y);
    if (dx >= 70 && dx > dy * 1.25) {
      setReplyingTo(message);
      setReactionMessageId(null);
    }
    swipeRef.current = { id: null, x: 0, y: 0, active: false };
  };


  const loadConversations = async () => {
    if (!userId) return;
    try {
      setLoading(true); setError("");
      const data = await getConversations(userId);
      const enriched = await Promise.all((data || []).map(async c => {
        let latest = null;
        try { const { data: row } = await supabase.from("messages").select("content,message_type,created_at,is_deleted").eq("conversation_id", c.id).order("created_at", { ascending: false }).limit(1).maybeSingle(); latest = row || null; } catch (_) {}
        return { ...c, _latest_message: latest };
      }));
      setConversations(enriched);
      const pending = initialConversationId || consumePendingDirectConversationId();
      if (pending) setSelectedId(pending);
    } catch (e) { setError(e?.message || "Unable to load conversations."); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadConversations(); }, [userId, initialConversationId]);
  useEffect(() => { if (!userId) return; const t = setInterval(() => loadConversations().catch(() => {}), 5000); return () => clearInterval(t); }, [userId]);

  useEffect(() => {
    if (!selectedId) { setDetails(null); setMessages([]); return; }
    let cancelled = false;
    (async () => {
      try {
        setChatLoading(true); setError("");
        const conversation = await getConversationDetails(selectedId);
        if (!conversation) throw new Error("Conversation could not be found.");
        if (cancelled) return;
        setDetails(conversation);
        try {
          const data = await getMessages(selectedId, 100, userId);
          if (!cancelled) setMessages(Array.isArray(data) ? data : []);
        } catch (e) {
          if (!cancelled) setError(e?.message || "Messages could not be loaded.");
        }
      } catch (e) {
        if (!cancelled) { setError(e?.message || "Unable to open conversation."); setSelectedId(null); }
      } finally { if (!cancelled) setChatLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [selectedId, userId]);

  useEffect(() => {
    if (!selectedId) return;
    return subscribeToConversation(selectedId, incoming => {
      setMessages(prev => prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming].sort((a,b) => new Date(a.created_at) - new Date(b.created_at)));
      setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, _latest_message: incoming, updated_at: incoming.created_at, last_message_at: incoming.created_at, unread_count: 0 } : c));
      if (incoming.sender_id !== userId) markMessageAsRead(incoming.id, userId).catch(() => {});
    }, updated => setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m)));
  }, [selectedId, userId]);

  useEffect(() => {
    if (!messageStreamRef.current || !selectedId) return;
    requestAnimationFrame(() => { const el = messageStreamRef.current; if (el) el.scrollTop = el.scrollHeight; });
  }, [messages.length, selectedId, chatLoading]);

  useEffect(() => {
    if (!selectedId || !userId) return;
    const channel = supabase.channel(`convogram-presence-${selectedId}`, { config: { presence: { key: userId } } });
    presenceRef.current = channel;
    const sync = () => { const users = Object.values(channel.presenceState()).flat(); setRemoteOnline(users.some(u => u.userId && u.userId !== userId && u.online !== false)); };
    channel.on("presence", { event: "sync" }, sync).on("presence", { event: "join" }, sync).on("presence", { event: "leave" }, sync).subscribe(async status => { if (status === "SUBSCRIBED") { await channel.track({ userId, online: true }); sync(); } });
    return () => { channel.untrack().catch(() => {}); supabase.removeChannel(channel); presenceRef.current = null; setRemoteOnline(false); };
  }, [selectedId, userId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(c => `${conversationTitle(c, userId)} ${c.type || ""}`.toLowerCase().includes(q));
  }, [conversations, search, userId]);
  const sorted = useMemo(() => [...filtered].sort((a,b) => new Date(b?._latest_message?.created_at || b?.updated_at || 0) - new Date(a?._latest_message?.created_at || a?.updated_at || 0)), [filtered]);

  const displayPreview = c => {
    const m = c?._latest_message;
    if (!m) return c.type === "group" ? "Group" : "Private chat";
    if (m.is_deleted) return "Message deleted";
    if (m.message_type === "image") return "Photo";
    if (m.message_type === "video") return "Video";
    if (m.message_type === "audio") return "Voice message";
    return m.content || "Attachment";
  };

  const handleSend = async e => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !selectedId || !userId || sending) return;
    try { setSending(true); const sent = await sendMessage(selectedId, userId, text, "text", null, replyingTo?.id || null); setMessages(prev => prev.some(m => m.id === sent.id) ? prev : [...prev, sent]); setDraft(""); setReplyingTo(null); } catch (e) { setError(e?.message || "Could not send message."); } finally { setSending(false); }
  };

  const handleMedia = async e => {
    const file = e.target.files?.[0];
    if (!file || !selectedId || !userId) return;
    try { setUploading(true); const uploaded = await uploadMessageMedia(file, userId); const sent = await sendMessage(selectedId, userId, null, uploaded.mediaType, uploaded.url, replyingTo?.id || null); setMessages(prev => [...prev, sent]); setReplyingTo(null); } catch (e) { setError(e?.message || "Could not upload media."); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setError("Microphone is not available on this device."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data?.size) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        try { const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }); const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || "audio/webm" }); const uploaded = await uploadVoiceMessage(file, userId); const sent = await sendMessage(selectedId, userId, null, "audio", uploaded.url, replyingTo?.id || null); setMessages(prev => [...prev, sent]); } catch (e) { setError(e?.message || "Could not send voice note."); } finally { stream.getTracks().forEach(t => t.stop()); setRecording(false); }
      };
      recorderRef.current = recorder; recorder.start(); setRecording(true);
    } catch (e) { setError(e?.message || "Microphone permission is required."); }
  };
  const stopRecording = () => { if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop(); else setRecording(false); };

  const toggleReaction = async (message, reaction) => {
    if (!userId) return;
    const mine = (message.message_reactions || []).find(r => r.user_id === userId && r.reaction === reaction);
    try {
      if (mine) await removeMessageReaction(message.id, userId, reaction); else await addMessageReaction(message.id, userId, reaction);
      const data = await getMessages(selectedId, 100, userId); setMessages(data || []);
    } catch (e) { setError(e?.message || "Could not update reaction."); }
    finally { setReactionMessageId(null); }
  };
  const handleDelete = async message => {
    try { const updated = await deleteMessage(message.id); setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m)); } catch (e) { setError(e?.message || "Could not delete message."); }
    finally { setReactionMessageId(null); }
  };
  const handleCreateChat = async e => {
    e.preventDefault();
    const memberId = newMemberId.trim();
    if (!memberId) return;
    try { const conversation = await createConversation(userId, "direct", null, null, [memberId]); setNewChatOpen(false); setNewMemberId(""); setSelectedId(conversation.id); await loadConversations(); } catch (e) { setError(e?.message || "Could not create chat."); }
  };
  const backToChats = () => { setSelectedId(null); setDetails(null); setMessages([]); setReplyingTo(null); setReactionMessageId(null); if (onBack) onBack(); };

  const remoteProfile = details?.conversation_members?.find(m => m.user_id !== userId)?.profiles || null;
  const titleConversation = details ? { ...details, _direct_profile: remoteProfile } : null;

  return <div className={`messages-panel ${selectedId ? "chat-open" : ""}`}>
    {error && <div className="messages-error">{error}<button type="button" onClick={() => setError("")}><X size={15} /></button></div>}
    {!selectedId && <aside className="conversation-list">
      <div className="messages-list-head"><h2>Messages</h2><button type="button" className="messages-icon-button" onClick={() => setNewChatOpen(true)}><Plus size={19} /></button></div>
      <div className="messages-search"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats" /></div>
      {loading ? <div className="messages-empty">Loading chats...</div> : sorted.length ? sorted.map(c => <button type="button" key={c.id} className="conversation-item" onClick={() => { setError(""); setSelectedId(c.id); }}><ConversationAvatar conversation={c} /><div className="conversation-copy"><strong>{conversationTitle(c, userId)}{c._direct_profile?.is_verified && <VerifiedBadge verified size={15} />}</strong><span>{displayPreview(c)}</span></div>{Number(c.unread_count) > 0 && <span className="conversation-unread-badge">{c.unread_count > 99 ? "99+" : c.unread_count}</span>}</button>) : <div className="messages-empty"><MessageCircle size={28} /><p>No chats yet.</p><button type="button" className="secondary-button" onClick={() => setNewChatOpen(true)}>Start a chat</button></div>}
    </aside>}

    {selectedId && <section className="chat-window">
      {chatLoading && !details ? <div className="chat-loading">Opening messages…</div> : details ? <>
        <header className="chat-head">
          <button type="button" className="chat-back-button" onClick={backToChats}><ChevronLeft size={20} /></button>
          <ConversationAvatar conversation={titleConversation} size={38} />
          <div className="chat-head-copy"><strong>{conversationTitle(titleConversation, userId)}</strong><span>{remoteOnline ? "Online" : "Offline"}</span></div>
          <div className="chat-call-actions"><button type="button" className="messages-icon-button" onClick={() => window.dispatchEvent(new CustomEvent("convogram-start-call", { detail: { type: "voice" } }))} disabled={!remoteProfile?.id}><Phone size={17} /></button><button type="button" className="messages-icon-button" onClick={() => window.dispatchEvent(new CustomEvent("convogram-start-call", { detail: { type: "video" } }))} disabled={!remoteProfile?.id}><Video size={17} /></button></div>
        </header>
        <div ref={messageStreamRef} className="message-stream" onClick={() => reactionMessageId && setReactionMessageId(null)}>
          {messages.length ? messages.map(item => {
            const mine = item.sender_id === userId;
            const media = ["image", "video", "audio"].includes(item.message_type);
            const reactions = item.message_reactions || [];
            const open = reactionMessageId === item.id;
            return <div key={item.id} className={`message-row ${mine ? "mine" : "theirs"}`} onTouchStart={e => beginSwipeReply(e, item.id)} onTouchMove={moveSwipeReply} onTouchEnd={e => endSwipeReply(e, item)}><div className={`message-bubble ${open ? "reaction-active" : ""}`} onContextMenu={e => { e.preventDefault(); setReactionMessageId(item.id); }}>
              {item.is_deleted ? <em>Message deleted</em> : media && item.media_url ? (item.message_type === "image" ? <img src={item.media_url} alt="Shared media" className="message-media" /> : item.message_type === "video" ? <video src={item.media_url} className="message-media" controls preload="metadata" /> : <VoiceNote src={item.media_url} />) : <span className="message-text">{item.content || "Attachment"}</span>}
              {open && !item.is_deleted && <div className="message-actions"><div className="reaction-picker">{REACTIONS.map(r => <button key={r} type="button" onClick={() => toggleReaction(item, r)}>{r}</button>)}</div><div className="message-tools"><button type="button" onClick={() => { setReplyingTo(item); setReactionMessageId(null); }}><Reply size={13} /></button>{mine && <button type="button" onClick={() => handleDelete(item)}><Trash2 size={13} /></button>}</div></div>}
              {reactions.length > 0 && <div className="message-reactions">{[...new Set(reactions.map(r => r.reaction))].map(r => <span key={r}>{r}</span>)}</div>}
              <small>{new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{mine && <Check size={12} />}</small>
            </div></div>;
          }) : <div className="chat-empty"><MessageCircle size={42} /><h2>Messages</h2><p>Send a message to begin.</p></div>}
        </div>
        {replyingTo && <div className="reply-banner"><div className="reply-banner-copy"><strong>Replying</strong><span>{replyingTo.content || "Attachment"}</span></div><button type="button" onClick={() => setReplyingTo(null)}><X size={14} /></button></div>}
        <form className="message-composer" onSubmit={handleSend}><input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={handleMedia} /><button type="button" className="messages-icon-button" onClick={() => fileRef.current?.click()} disabled={uploading || recording}><ImagePlus size={19} /></button>{recording ? <button type="button" className="messages-icon-button recording" onClick={stopRecording}><Square size={17} /></button> : <button type="button" className="messages-icon-button" onClick={startRecording} disabled={uploading}><Mic size={19} /></button>}<button type="button" className="messages-icon-button"><Smile size={19} /></button><input value={draft} onChange={e => setDraft(e.target.value)} placeholder={recording ? "Recording voice note…" : uploading ? "Uploading…" : "Write a message..."} disabled={uploading || recording} /><button className="send-button" disabled={!draft.trim() || sending || uploading || recording} type="submit"><Send size={18} /></button></form>
      </> : <div className="chat-loading">Opening messages…</div>}
    </section>}

    {newChatOpen && <div className="messages-modal-backdrop"><form className="messages-modal" onSubmit={handleCreateChat}><button type="button" className="messages-modal-close" onClick={() => setNewChatOpen(false)}><X /></button><span className="eyebrow">NEW CONVERSATION</span><h2>Start a chat</h2><p>Enter the Convogram user ID of the person you want to message.</p><input autoFocus value={newMemberId} onChange={e => setNewMemberId(e.target.value)} placeholder="User ID" /><button className="primary-button" type="submit">Create chat</button></form></div>}
  </div>;
}
