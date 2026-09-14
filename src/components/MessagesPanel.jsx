import { useEffect, useState } from "react";
import { MessageCircle, Users, ChevronLeft, Search, Plus } from "lucide-react";
import { getConversations } from "../lib/messages";
import { MessagesPanel as OriginalMessagesPanel } from "./MessagesPanelOriginal";
import "./MessagesPanel.shell.css";

export function MessagesPanel(props) {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(props.initialConversationId || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!props.userId) return;
      setLoading(true);
      setError("");
      try {
        const data = await getConversations(props.userId, 50);
        if (alive) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (alive) setError(e?.message || "Unable to load conversations.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    const timer = setInterval(load, 5000);
    return () => { alive = false; clearInterval(timer); };
  }, [props.userId]);

  useEffect(() => {
    if (props.initialConversationId) setSelectedId(props.initialConversationId);
  }, [props.initialConversationId]);

  if (selectedId) {
    return (
      <OriginalMessagesPanel
        {...props}
        initialConversationId={selectedId}
        onBack={() => {
          setSelectedId(null);
          props.onBack?.();
        }}
      />
    );
  }

  const title = (c) => c?._display_name || c?.name || (c?.type === "group" ? "Group conversation" : "Direct conversation");
  const preview = (c) => {
    const m = c?._latest_message;
    if (!m) return c?.type === "group" ? "Group" : "Private chat";
    if (m.is_deleted) return "Message deleted";
    if (m.message_type === "image") return "Photo";
    if (m.message_type === "video") return "Video";
    if (m.message_type === "audio") return "Voice message";
    return m.content || "Attachment";
  };

  return (
    <div className="messages-page-shell messages-controller-shell">
      <section className="messages-controller">
        <header className="messages-controller-head">
          <div>
            <h2>Messages</h2>
            <span>{items.length} conversation{items.length === 1 ? "" : "s"}</span>
          </div>
          <button type="button" aria-label="New chat" onClick={() => window.dispatchEvent(new CustomEvent("convogram:new-chat"))}><Plus size={19} /></button>
        </header>
        <div className="messages-controller-search"><Search size={17} /><span>Search messages</span></div>
        <div className="messages-controller-list">
          {loading && items.length === 0 && <div className="messages-controller-state">Loading messages…</div>}
          {!loading && !error && items.length === 0 && (
            <div className="messages-controller-state"><MessageCircle size={26} /><strong>No conversations yet</strong><span>Start a chat to see it here.</span></div>
          )}
          {error && <div className="messages-controller-state"><strong>Messages unavailable</strong><span>{error}</span></div>}
          {items.map((c) => (
            <button key={c.id} type="button" className="messages-controller-item" onClick={() => setSelectedId(c.id)}>
              <div className="messages-controller-avatar">{c?._direct_profile?.avatar_url ? <img src={c._direct_profile.avatar_url} alt="" /> : c?.type === "group" ? <Users size={18} /> : <MessageCircle size={18} />}</div>
              <div className="messages-controller-copy">
                <strong>{title(c)}</strong>
                <span>{preview(c)}</span>
              </div>
              {c.unread_count > 0 && <b className="messages-controller-unread">{c.unread_count > 99 ? "99+" : c.unread_count}</b>}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default MessagesPanel;
