import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ImagePlus, MessageCircle, Plus, Search, Send, Users, X, Smile, Mic, Square, Reply, Trash2 } from "lucide-react";
import { getConversations, getConversationDetails, getMessages, sendMessage, createConversation, subscribeToConversation, markMessageAsRead, addMessageReaction, removeMessageReaction, deleteMessage, consumePendingDirectConversationId } from "../lib/messages";
import { uploadMessageMedia, uploadVoiceMessage } from "../lib/storage";
import { supabase } from "../lib/supabase";
import "./MessagesPanel.css";

const REACTIONS = ["❤️", "😂", "👍", "🔥", "😮", "😢"];
const LONG_PRESS_MS = 550;

export function MessagesPanel({ userId, initialConversationId = null, onBack }) {
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
  const [reactionMessageId, setReactionMessageId] = useState(null);

  const fileRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const typingTimerRef = useRef(null);
  const presenceChannelRef = useRef(null);
  const longPressTimerRef = useRef(null);

  async function loadConversations() {
    try {
      setLoading(true);
      const data = await getConversations(userId);
      const clean = (data || []).filter(Boolean);
      setConversations(clean);
      const pendingId = initialConversationId || consumePendingDirectConversationId();
      if (pendingId) setSelectedId(pendingId);
      // Do not auto-open the first conversation. Messages opens to the chat list.
    } catch (err) {
      setError(err.message || "Unable to load conversations.");
    } finally {
      setLoading(false);
    }
  }

  async function loadConversation(id) {
    if (!id) return;
    try {
      const [conversation, conversationMessages] = await Promise.all([
        getConversationDetails(id),
        getMessages(id, 100),
      ]);
      setDetails(conversation);
      setMessages(conversationMessages || []);
      for (const message of conversationMessages || []) {
        if (message.sender_id !== userId && !message.is_deleted) {
          markMessageAsRead(message.id, userId).catch(() => {});
        }
      }
    } catch (err) {
      setError(err.message || "Unable to open conversation.");
    }
  }

  useEffect(() => {
    if (userId) loadConversations();
  }, [userId, initialConversationId]);

  useEffect(() => {
    if (!selectedId) {
      setDetails(null);
      setMessages([]);
      setReactionMessageId(null);
      return;
    }
    loadConversation(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    return subscribeToConversation(
      selectedId,
      incoming => {
        setMessages(current => current.some(i => i.id === incoming.id) ? current : [...current, incoming]);
        if (incoming.sender_id !== userId) markMessageAsRead(incoming.id, userId).catch(() => {});
      },
      updated => setMessages(current => current.map(i => i.id === updated.id ? { ...i, ...updated } : i))
    );
  }, [selectedId, userId]);

  useEffect(() => {
    if (!selectedId || !userId || !supabase) return;
    const channel = supabase.channel(`convogram-presence-${selectedId}`, { config: { presence: { key: userId } } });
    presenceChannelRef.current = channel;
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      setTypingUsers(Object.values(state).flat().filter(item => item.userId !== userId && item.typing));
    }).subscribe(async status => {
      if (status === "SUBSCRIBED") await channel.track({ userId, typing: false, online: true });
    });
    return () => {
      channel.untrack().catch(() => {});
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
    };
  }, [selectedId, userId]);

  useEffect(() => () => clearTimeout(longPressTimerRef.current), []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter(c => `${c.name || ""} ${c.type || ""}`.toLowerCase().includes(term));
  }, [conversations, search]);

  function conversationTitle(c) {
    if (c?.name) return c.name;
    if (c?.type === "group") return "Group conversation";
    return "Direct conversation";
  }

  async function updateTyping(value) {
    const channel = presenceChannelRef.current;
    if (channel) await channel.track({ userId, typing: value, online: true }).catch(() => {});
  }

  function handleDraftChange(e) {
    setDraft(e.target.value);
    updateTyping(true);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => updateTyping(false), 1200);
  }

  async function handleSend(e) {
    e?.preventDefault();
    const content = draft.trim();
    if (!content || !selectedId || sending) return;
    setSending(true);
    setError("");
    try {
      const created = await sendMessage(selectedId, userId, content, "text", null, replyingTo?.id || null);
      setMessages(current => current.some(i => i.id === created.id) ? current : [...current, created]);
      setDraft("");
      setReplyingTo(null);
      await updateTyping(false);
    } catch (err) {
      setError(err.message || "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  async function handleMedia(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedId) return;
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadMessageMedia(file, userId);
      const created = await sendMessage(selectedId, userId, "", uploaded.mediaType, uploaded.url, replyingTo?.id || null);
      setMessages(current => current.some(i => i.id === created.id) ? current : [...current, created]);
      setReplyingTo(null);
    } catch (err) {
      setError(err.message || "Media could not be sent.");
    } finally {
      setUploading(false);
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice recording is not supported by this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (!blob.size || !selectedId) return;
        setUploading(true);
        try {
          const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
          const uploaded = await uploadVoiceMessage(file, userId);
          const created = await sendMessage(selectedId, userId, "", "audio", uploaded.url, replyingTo?.id || null);
          setMessages(current => current.some(i => i.id === created.id) ? current : [...current, created]);
          setReplyingTo(null);
        } catch (err) {
          setError(err.message || "Voice note could not be sent.");
        } finally {
          setUploading(false);
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      setError(err.message || "Microphone permission was denied.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  async function toggleReaction(message, reaction) {
    const mine = message.message_reactions?.some(i => i.user_id === userId && i.reaction === reaction);
    try {
      if (mine) {
        await removeMessageReaction(message.id, userId, reaction);
        setMessages(c => c.map(i => i.id === message.id ? { ...i, message_reactions: (i.message_reactions || []).filter(r => !(r.user_id === userId && r.reaction === reaction)) } : i));
      } else {
        const created = await addMessageReaction(message.id, userId, reaction);
        setMessages(c => c.map(i => i.id === message.id ? { ...i, message_reactions: [...(i.message_reactions || []), created] } : i));
      }
    } catch (err) {
      setError(err.message || "Reaction could not be updated.");
    }
    setReactionMessageId(null);
  }

  function startLongPress(messageId) {
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setReactionMessageId(messageId);
      if (navigator.vibrate) navigator.vibrate(20);
    }, LONG_PRESS_MS);
  }

  function cancelLongPress() {
    clearTimeout(longPressTimerRef.current);
  }

  async function handleDelete(message) {
    if (message.sender_id !== userId) return;
    try {
      await deleteMessage(message.id);
      setMessages(c => c.map(i => i.id === message.id ? { ...i, is_deleted: true, content: null, media_url: null } : i));
      setReactionMessageId(null);
    } catch (err) {
      setError(err.message || "Message could not be deleted.");
    }
  }

  async function handleCreateChat(e) {
    e.preventDefault();
    const memberId = newMemberId.trim();
    if (!memberId || memberId === userId) return;
    try {
      const conversation = await createConversation(userId, "direct", null, null, [memberId]);
      setConversations(c => [conversation, ...c]);
      setSelectedId(conversation.id);
      setNewChatOpen(false);
      setNewMemberId("");
    } catch (err) {
      setError(err.message || "Could not create chat.");
    }
  }

  function selectConversation(id) {
    setReactionMessageId(null);
    setSelectedId(id);
  }

  function backToChats() {
    setReactionMessageId(null);
    setDetails(null);
    setSelectedId(null);
    if (onBack) onBack();
  }

  return <div className={`messages-panel ${selectedId && details ? "chat-open" : ""}`}>
    {error && <div className="messages-error">{error}<button onClick={() => setError("")}><X size={15} /></button></div>}

    {!selectedId && <aside className="conversation-list">
      <div className="messages-list-head">
        <div><h2>Messages</h2></div>
        <button className="messages-icon-button" onClick={() => setNewChatOpen(true)} title="New chat"><Plus size={19} /></button>
      </div>
      <div className="messages-search"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats" /></div>
      {loading ? <div className="messages-empty">Loading chats...</div> : filtered.length ? filtered.map(c => <button key={c.id} className="conversation-item" onClick={() => selectConversation(c.id)}>
        <div className="conversation-avatar">{c.type === "group" ? <Users size={18} /> : <MessageCircle size={18} />}</div>
        <div className="conversation-copy"><strong>{conversationTitle(c)}</strong><span>{c.type === "group" ? "Group" : "Private chat"}</span></div>
      </button>) : <div className="messages-empty"><MessageCircle size={28} /><p>No chats yet.</p><button className="secondary-button" onClick={() => setNewChatOpen(true)}>Start a chat</button></div>}
    </aside>}

    <section className="chat-window">
      {details ? <>
        <header className="chat-head">
          <button type="button" className="chat-back-button" onClick={backToChats} aria-label="Back to chats"><ChevronLeft size={20} /></button>
          <div className="conversation-avatar"><MessageCircle size={18} /></div>
          <div className="chat-head-copy"><strong>{conversationTitle(details)}</strong><span>{typingUsers.length ? "typing…" : details.type === "group" ? `${details.conversation_members?.length || 0} members` : "Online conversation"}</span></div>
        </header>

        <div className="message-stream" onClick={() => reactionMessageId && setReactionMessageId(null)}>
          {messages.length ? messages.map(item => {
            const mine = item.sender_id === userId;
            const media = ["image", "video", "audio"].includes(item.message_type);
            const reactions = item.message_reactions || [];
            const reactionsOpen = reactionMessageId === item.id;
            return <div key={item.id} className={`message-row ${mine ? "mine" : "theirs"}`}>
              <div
                className={`message-bubble ${reactionsOpen ? "reaction-active" : ""}`}
                onPointerDown={() => startLongPress(item.id)}
                onPointerUp={cancelLongPress}
                onPointerCancel={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onContextMenu={e => { e.preventDefault(); setReactionMessageId(item.id); }}
                onClick={e => e.stopPropagation()}
              >
                {item.reply_to_id && <div className="message-reply-preview"><Reply size={12} /> Replying to a message</div>}
                {item.is_deleted ? <em>Message deleted</em> : media && item.media_url ? (item.message_type === "image" ? <img src={item.media_url} alt="Shared media" className="message-media" /> : item.message_type === "video" ? <video src={item.media_url} className="message-media" controls preload="metadata" /> : <audio src={item.media_url} controls className="message-audio" />) : <span className="message-text">{item.content || "Attachment"}</span>}

                {reactionsOpen && !item.is_deleted && <div className="message-actions" onClick={e => e.stopPropagation()}>
                  <div className="reaction-picker" aria-label="Message reactions">
                    {REACTIONS.map(r => <button key={r} type="button" aria-label={`React ${r}`} onClick={() => toggleReaction(item, r)}>{r}</button>)}
                  </div>
                  <div className="message-tools">
                    <button type="button" onClick={() => { setReplyingTo(item); setReactionMessageId(null); }} title="Reply"><Reply size={13} /></button>
                    {mine && <button type="button" onClick={() => handleDelete(item)} title="Delete"><Trash2 size={13} /></button>}
                  </div>
                </div>}

                {reactions.length > 0 && <div className="message-reactions">{[...new Set(reactions.map(r => r.reaction))].map(r => <button key={r} type="button" onClick={() => toggleReaction(item, r)}>{r} {reactions.filter(x => x.reaction === r).length}</button>)}</div>}
                <small>{new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{mine && <Check size={12} />}</small>
              </div>
            </div>;
          }) : <div className="chat-empty"><MessageCircle size={34} /><h3>Start the conversation</h3><p>Send a message to begin.</p></div>}
        </div>

        {replyingTo && <div className="reply-banner"><Reply size={15} /><span>Replying to {replyingTo.content || "attachment"}</span><button type="button" onClick={() => setReplyingTo(null)}><X size={14} /></button></div>}
        <form className="message-composer" onSubmit={handleSend}>
          <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={handleMedia} />
          <button type="button" className="messages-icon-button" onClick={() => fileRef.current?.click()} disabled={uploading || recording}><ImagePlus size={19} /></button>
          {recording ? <button type="button" className="messages-icon-button recording" onClick={stopRecording}><Square size={17} /></button> : <button type="button" className="messages-icon-button" onClick={startRecording} disabled={uploading}><Mic size={19} /></button>}
          <button type="button" className="messages-icon-button" title="Emoji"><Smile size={19} /></button>
          <input value={draft} onChange={handleDraftChange} placeholder={recording ? "Recording voice note…" : uploading ? "Uploading…" : "Write a message..."} disabled={uploading || recording} />
          <button className="send-button" disabled={!draft.trim() || sending || uploading || recording} type="submit"><Send size={18} /></button>
        </form>
      </> : <div className="chat-empty"><MessageCircle size={42} /><h2>Messages</h2><p>Select a conversation to open it.</p></div>}
    </section>

    {newChatOpen && <div className="messages-modal-backdrop"><form className="messages-modal" onSubmit={handleCreateChat}><button type="button" className="messages-modal-close" onClick={() => setNewChatOpen(false)}><X /></button><span className="eyebrow">NEW CONVERSATION</span><h2>Start a chat</h2><p>Enter the Convogram user ID of the person you want to message.</p><input autoFocus value={newMemberId} onChange={e => setNewMemberId(e.target.value)} placeholder="User ID" /><button className="primary-button" type="submit">Create chat</button></form></div>}
  </div>;
}
