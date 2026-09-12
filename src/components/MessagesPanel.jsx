import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ImagePlus, MessageCircle, Plus, Search, Send, Users, X, Smile, Mic, Square, Reply, Trash2 } from "lucide-react";
import { getConversations, getConversationDetails, getMessages, sendMessage, createConversation, subscribeToConversation, markMessageAsRead, addMessageReaction, removeMessageReaction, deleteMessage, consumePendingDirectConversationId } from "../lib/messages";
import { uploadMessageMedia, uploadVoiceMessage } from "../lib/storage";
import { supabase } from "../lib/supabase";
import "./MessagesPanel.css";

const REACTIONS = ["❤️", "😂", "👍", "🔥", "😮", "😢"];

export function MessagesPanel({ userId }) {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [details, setDetails] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newMemberId, setNewMemberId] = useState("");
  const fileRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const typingTimerRef = useRef(null);
  const presenceChannelRef = useRef(null);

  async function loadConversations(selectFirst = true) {
    try {
      setLoading(true);
      const data = await getConversations(userId);
      const clean = (data || []).filter(Boolean);
      setConversations(clean);
      const pendingId = consumePendingDirectConversationId();
      if (pendingId && clean.some((conversation) => conversation.id === pendingId)) {
        setSelectedId(pendingId);
      } else if (selectFirst && !selectedId && clean[0]?.id) {
        setSelectedId(clean[0].id);
      }
    } catch (err) { setError(err.message || "Unable to load conversations."); }
    finally { setLoading(false); }
  }

  async function loadConversation(id) {
    if (!id) return;
    try {
      const [conversation, conversationMessages] = await Promise.all([getConversationDetails(id), getMessages(id, 100)]);
      setDetails(conversation);
      setMessages(conversationMessages || []);
      for (const message of conversationMessages || []) {
        if (message.sender_id !== userId && !message.is_deleted) markMessageAsRead(message.id, userId).catch(() => {});
      }
    } catch (err) { setError(err.message || "Unable to open conversation."); }
  }

  useEffect(() => { if (userId) loadConversations(); }, [userId]);
  useEffect(() => { if (selectedId) loadConversation(selectedId); }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return undefined;
    return subscribeToConversation(selectedId, (incoming) => {
      setMessages((current) => current.some((item) => item.id === incoming.id) ? current : [...current, incoming]);
      if (incoming.sender_id !== userId) markMessageAsRead(incoming.id, userId).catch(() => {});
    }, (updated) => {
      setMessages((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
    });
  }, [selectedId, userId]);

  useEffect(() => {
    if (!selectedId || !userId || !supabase) return undefined;
    const channel = supabase.channel(`convogram-presence-${selectedId}`, { config: { presence: { key: userId } } });
    presenceChannelRef.current = channel;
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const active = Object.values(state).flat().filter((item) => item.userId !== userId && item.typing);
      setTypingUsers(active);
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") await channel.track({ userId, typing: false, online: true });
    });
    return () => { channel.untrack().catch(() => {}); supabase.removeChannel(channel); presenceChannelRef.current = null; };
  }, [selectedId, userId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((conversation) => `${conversation.name || ""} ${conversation.type || ""}`.toLowerCase().includes(term));
  }, [conversations, search]);

  function conversationTitle(conversation) {
    if (conversation?.name) return conversation.name;
    if (conversation?.type === "group") return "Group conversation";
    return "Direct conversation";
  }

  async function updateTyping(value) {
    const channel = presenceChannelRef.current;
    if (!channel) return;
    await channel.track({ userId, typing: value, online: true }).catch(() => {});
  }

  function handleDraftChange(event) {
    setDraft(event.target.value);
    updateTyping(true);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => updateTyping(false), 1200);
  }

  async function handleSend(event) {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || !selectedId || sending) return;
    setSending(true); setError("");
    try {
      const created = await sendMessage(selectedId, userId, content, "text", null, replyingTo?.id || null);
      setMessages((current) => current.some((item) => item.id === created.id) ? current : [...current, created]);
      setDraft(""); setReplyingTo(null); await updateTyping(false);
    } catch (err) { setError(err.message || "Message could not be sent."); }
    finally { setSending(false); }
  }

  async function handleMedia(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedId) return;
    setUploading(true); setError("");
    try {
      const uploaded = await uploadMessageMedia(file, userId);
      const created = await sendMessage(selectedId, userId, "", uploaded.mediaType, uploaded.url, replyingTo?.id || null);
      setMessages((current) => current.some((item) => item.id === created.id) ? current : [...current, created]);
      setReplyingTo(null);
    } catch (err) { setError(err.message || "Media could not be sent."); }
    finally { setUploading(false); }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice recording is not supported by this browser."); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (!blob.size || !selectedId) return;
        setUploading(true);
        try {
          const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
          const uploaded = await uploadVoiceMessage(file, userId);
          const created = await sendMessage(selectedId, userId, "", "audio", uploaded.url, replyingTo?.id || null);
          setMessages((current) => current.some((item) => item.id === created.id) ? current : [...current, created]);
          setReplyingTo(null);
        } catch (err) { setError(err.message || "Voice note could not be sent."); }
        finally { setUploading(false); }
      };
      recorderRef.current = recorder;
      recorder.start(); setRecording(true);
    } catch (err) { setError(err.message || "Microphone permission was denied."); }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current = null; setRecording(false);
  }

  async function toggleReaction(message, reaction) {
    const mine = message.message_reactions?.some((item) => item.user_id === userId && item.reaction === reaction);
    try {
      if (mine) {
        await removeMessageReaction(message.id, userId, reaction);
        setMessages((current) => current.map((item) => item.id === message.id ? { ...item, message_reactions: (item.message_reactions || []).filter((r) => !(r.user_id === userId && r.reaction === reaction)) } : item));
      } else {
        const created = await addMessageReaction(message.id, userId, reaction);
        setMessages((current) => current.map((item) => item.id === message.id ? { ...item, message_reactions: [...(item.message_reactions || []), created] } : item));
      }
    } catch (err) { setError(err.message || "Reaction could not be updated."); }
  }

  async function handleDelete(message) {
    if (message.sender_id !== userId) return;
    try { await deleteMessage(message.id); setMessages((current) => current.map((item) => item.id === message.id ? { ...item, is_deleted: true, content: null, media_url: null } : item)); }
    catch (err) { setError(err.message || "Message could not be deleted."); }
  }

  async function handleCreateChat(event) {
    event.preventDefault();
    const memberId = newMemberId.trim();
    if (!memberId || memberId === userId) return;
    try {
      const conversation = await createConversation(userId, "direct", null, null, [memberId]);
      setConversations((current) => [conversation, ...current]); setSelectedId(conversation.id); setNewChatOpen(false); setNewMemberId("");
    } catch (err) { setError(err.message || "Could not create chat."); }
  }

  return <div className="messages-panel">
    {error && <div className="messages-error">{error}<button onClick={() => setError("")}><X size={15} /></button></div>}
    <aside className="conversation-list">
      <div className="messages-list-head"><div><span className="eyebrow">PRIVATE & GROUP</span><h2>Chats</h2></div><button className="messages-icon-button" onClick={() => setNewChatOpen(true)} title="New chat"><Plus size={19} /></button></div>
      <div className="messages-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats" /></div>
      {loading ? <div className="messages-empty">Loading chats...</div> : filtered.length ? filtered.map((conversation) => <button key={conversation.id} className={`conversation-item ${selectedId === conversation.id ? "selected" : ""}`} onClick={() => setSelectedId(conversation.id)}><div className="conversation-avatar">{conversation.type === "group" ? <Users size={18} /> : <MessageCircle size={18} />}</div><div className="conversation-copy"><strong>{conversationTitle(conversation)}</strong><span>{conversation.type === "group" ? "Group" : "Private chat"}</span></div></button>) : <div className="messages-empty"><MessageCircle size={28} /><p>No chats yet.</p><button className="secondary-button" onClick={() => setNewChatOpen(true)}>Start a chat</button></div>}
    </aside>
    <section className="chat-window">
      {details ? <><header className="chat-head"><div className="conversation-avatar"><MessageCircle size={18} /></div><div><strong>{conversationTitle(details)}</strong><span>{typingUsers.length ? "typing…" : details.type === "group" ? `${details.conversation_members?.length || 0} members` : "Online conversation"}</span></div></header>
        <div className="message-stream">{messages.length ? messages.map((item) => {
          const mine = item.sender_id === userId;
          const media = ["image", "video", "audio"].includes(item.message_type);
          const reactions = item.message_reactions || [];
          return <div key={item.id} className={`message-row ${mine ? "mine" : "theirs"}`}>
            <div className="message-bubble">
              {item.reply_to_id && <div className="message-reply-preview"><Reply size={12} /> Replying to a message</div>}
              {item.is_deleted ? <em>Message deleted</em> : media && item.media_url ? (item.message_type === "image" ? <img src={item.media_url} alt="Shared media" className="message-media" /> : item.message_type === "video" ? <video src={item.media_url} className="message-media" controls preload="metadata" /> : <audio src={item.media_url} controls className="message-audio" />) : <span>{item.content || "Attachment"}</span>}
              {!item.is_deleted && <div className="message-actions"><button type="button" onClick={() => setReplyingTo(item)} title="Reply"><Reply size={13} /></button>{mine && <button type="button" onClick={() => handleDelete(item)} title="Delete"><Trash2 size={13} /></button>}<span className="reaction-picker">{REACTIONS.map((reaction) => <button key={reaction} type="button" onClick={() => toggleReaction(item, reaction)}>{reaction}</button>)}</span></div>}
              {reactions.length > 0 && <div className="message-reactions">{[...new Set(reactions.map((r) => r.reaction))].map((reaction) => <button key={reaction} type="button" onClick={() => toggleReaction(item, reaction)}>{reaction} {reactions.filter((r) => r.reaction === reaction).length}</button>)}</div>}
              <small>{new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{mine && <Check size={12} />}</small>
            </div>
          </div>;
        }) : <div className="chat-empty"><MessageCircle size={34} /><h3>Start the conversation</h3><p>Send a message to begin.</p></div>}</div>
        {replyingTo && <div className="reply-banner"><Reply size={15} /><span>Replying to {replyingTo.content || "attachment"}</span><button type="button" onClick={() => setReplyingTo(null)}><X size={14} /></button></div>}
        <form className="message-composer" onSubmit={handleSend}><input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={handleMedia} /><button type="button" className="messages-icon-button" onClick={() => fileRef.current?.click()} disabled={uploading || recording}><ImagePlus size={19} /></button>{recording ? <button type="button" className="messages-icon-button recording" onClick={stopRecording} title="Stop recording"><Square size={17} /></button> : <button type="button" className="messages-icon-button" onClick={startRecording} disabled={uploading} title="Voice note"><Mic size={19} /></button>}<button type="button" className="messages-icon-button"><Smile size={19} /></button><input value={draft} onChange={handleDraftChange} placeholder={recording ? "Recording voice note…" : uploading ? "Uploading…" : "Write a message..."} disabled={uploading || recording} /><button className="send-button" disabled={!draft.trim() || sending || uploading || recording} type="submit"><Send size={18} /></button></form>
      </> : <div className="chat-empty"><MessageCircle size={42} /><h2>Your conversations</h2><p>Choose a chat or start a new one.</p><button className="primary-button small" onClick={() => setNewChatOpen(true)}><Plus size={16} /> Start a chat</button></div>}
    </section>
    {newChatOpen && <div className="messages-modal-backdrop"><form className="messages-modal" onSubmit={handleCreateChat}><button type="button" className="messages-modal-close" onClick={() => setNewChatOpen(false)}><X /></button><span className="eyebrow">NEW CONVERSATION</span><h2>Start a chat</h2><p>Enter the Convogram user ID of the person you want to message.</p><input autoFocus value={newMemberId} onChange={(e) => setNewMemberId(e.target.value)} placeholder="User ID" /><button className="primary-button" type="submit">Create chat</button></form></div>}
  </div>;
}
