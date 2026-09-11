import { useEffect, useMemo, useState } from "react";
import { Check, MessageCircle, Plus, Search, Send, Users, X, Smile } from "lucide-react";
import { getConversations, getConversationDetails, getMessages, sendMessage, createConversation } from "../lib/messages";
import "./MessagesPanel.css";

export function MessagesPanel({ userId, profile }) {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [details, setDetails] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newMemberId, setNewMemberId] = useState("");

  async function loadConversations(selectFirst = true) {
    try {
      setLoading(true);
      const data = await getConversations(userId);
      const clean = (data || []).filter(Boolean);
      setConversations(clean);
      if (selectFirst && !selectedId && clean[0]?.id) setSelectedId(clean[0].id);
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
    } catch (err) {
      setError(err.message || "Unable to open conversation.");
    }
  }

  useEffect(() => {
    if (userId) loadConversations();
  }, [userId]);

  useEffect(() => {
    if (selectedId) loadConversation(selectedId);
  }, [selectedId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((conversation) =>
      `${conversation.name || ""} ${conversation.type || ""}`.toLowerCase().includes(term)
    );
  }, [conversations, search]);

  function conversationTitle(conversation) {
    if (conversation?.name) return conversation.name;
    if (conversation?.type === "group") return "Group conversation";
    return "Direct conversation";
  }

  async function handleSend(event) {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || !selectedId || sending) return;
    setSending(true);
    setError("");
    try {
      const created = await sendMessage(selectedId, userId, content);
      setMessages((current) => [...current, created]);
      setDraft("");
    } catch (err) {
      setError(err.message || "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  async function handleCreateChat(event) {
    event.preventDefault();
    const memberId = newMemberId.trim();
    if (!memberId || memberId === userId) return;
    try {
      const conversation = await createConversation(userId, "direct", null, null, [memberId]);
      setConversations((current) => [conversation, ...current]);
      setSelectedId(conversation.id);
      setNewChatOpen(false);
      setNewMemberId("");
    } catch (err) {
      setError(err.message || "Could not create chat.");
    }
  }

  return (
    <div className="messages-panel">
      {error && <div className="messages-error">{error}<button onClick={() => setError("")}><X size={15} /></button></div>}
      <aside className="conversation-list">
        <div className="messages-list-head">
          <div><span className="eyebrow">PRIVATE & GROUP</span><h2>Chats</h2></div>
          <button className="messages-icon-button" onClick={() => setNewChatOpen(true)} title="New chat"><Plus size={19} /></button>
        </div>
        <div className="messages-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats" /></div>
        {loading ? <div className="messages-empty">Loading chats...</div> : filtered.length ? filtered.map((conversation) => (
          <button key={conversation.id} className={`conversation-item ${selectedId === conversation.id ? "selected" : ""}`} onClick={() => setSelectedId(conversation.id)}>
            <div className="conversation-avatar">{conversation.type === "group" ? <Users size={18} /> : <MessageCircle size={18} />}</div>
            <div className="conversation-copy"><strong>{conversationTitle(conversation)}</strong><span>{conversation.type === "group" ? "Group" : "Private chat"}</span></div>
          </button>
        )) : <div className="messages-empty"><MessageCircle size={28} /><p>No chats yet.</p><button className="secondary-button" onClick={() => setNewChatOpen(true)}>Start a chat</button></div>}
      </aside>

      <section className="chat-window">
        {details ? <>
          <header className="chat-head"><div className="conversation-avatar"><MessageCircle size={18} /></div><div><strong>{conversationTitle(details)}</strong><span>{details.type === "group" ? `${details.conversation_members?.length || 0} members` : "Private conversation"}</span></div></header>
          <div className="message-stream">
            {messages.length ? messages.map((item) => {
              const mine = item.sender_id === userId;
              return <div key={item.id} className={`message-row ${mine ? "mine" : "theirs"}`}><div className="message-bubble"><span>{item.content || (item.message_type === "image" ? "📷 Photo" : item.message_type === "video" ? "🎥 Video" : "Attachment")}</span><small>{new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{mine && <Check size={12} />}</small></div></div>;
            }) : <div className="chat-empty"><MessageCircle size={34} /><h3>Start the conversation</h3><p>Send a message to begin.</p></div>}
          </div>
          <form className="message-composer" onSubmit={handleSend}><button type="button" className="messages-icon-button"><Smile size={19} /></button><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message..." /><button className="send-button" disabled={!draft.trim() || sending} type="submit"><Send size={18} /></button></form>
        </> : <div className="chat-empty"><MessageCircle size={42} /><h2>Your conversations</h2><p>Choose a chat or start a new one.</p><button className="primary-button small" onClick={() => setNewChatOpen(true)}><Plus size={16} /> Start a chat</button></div>}
      </section>

      {newChatOpen && <div className="messages-modal-backdrop"><form className="messages-modal" onSubmit={handleCreateChat}><button type="button" className="messages-modal-close" onClick={() => setNewChatOpen(false)}><X /></button><span className="eyebrow">NEW CONVERSATION</span><h2>Start a chat</h2><p>Enter the Convogram user ID of the person you want to message.</p><input autoFocus value={newMemberId} onChange={(e) => setNewMemberId(e.target.value)} placeholder="User ID" /><button className="primary-button" type="submit">Create chat</button></form></div>}
    </div>
  );
}
