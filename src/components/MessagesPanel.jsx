import { useEffect, useState } from "react";
import { MessageCircle, Users, Search, Plus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { MessagesPanel as OriginalMessagesPanel } from "./MessagesPanelOriginal";
import { VerifiedBadge } from "./VerifiedBadge";
import "./MessagesPanel.shell.css";

async function loadConversationList(userId) {
  if (!userId) return [];

  const { data: members, error: memberError } = await supabase
    .from("conversation_members")
    .select("conversation_id,joined_at,last_read_at,hidden_at")
    .eq("user_id", userId)
    .is("hidden_at", null)
    .order("joined_at", { ascending: false })
    .limit(50);

  if (memberError) throw memberError;

  const rows = members || [];
  const ids = rows.map((r) => r.conversation_id).filter(Boolean);
  if (!ids.length) return [];

  const { data: conversations, error: conversationsError } = await supabase
    .from("conversations")
    .select("id,created_by,type,name,avatar_url,created_at,updated_at")
    .in("id", ids);

  if (conversationsError) throw conversationsError;

  const conversationById = new Map((conversations || []).map((c) => [c.id, c]));

  let otherMembers = [];
  try {
    const result = await supabase
      .from("conversation_members")
      .select("conversation_id,user_id")
      .in("conversation_id", ids);
    if (!result.error) otherMembers = result.data || [];
  } catch (_) {}

  const otherIds = [...new Set(otherMembers.map((m) => m.user_id).filter((id) => id && id !== userId))];
  let profiles = [];
  if (otherIds.length) {
    try {
      const result = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url,is_verified")
        .in("id", otherIds);
      if (!result.error) profiles = result.data || [];
    } catch (_) {}
  }

  const profilesById = new Map(profiles.map((p) => [p.id, p]));

  let messageRows = [];
  try {
    const result = await supabase
      .from("messages")
      .select("id,conversation_id,sender_id,content,message_type,created_at,is_deleted")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false })
      .limit(500);
    if (!result.error) messageRows = result.data || [];
  } catch (_) {}

  const latestById = new Map();
  for (const message of messageRows) {
    if (!latestById.has(message.conversation_id)) latestById.set(message.conversation_id, message);
  }

  return rows
    .map((membership) => {
      const base = conversationById.get(membership.conversation_id);
      if (!base) return null;

      const other = otherMembers.find(
        (m) => m.conversation_id === membership.conversation_id && m.user_id !== userId,
      );
      const latest = latestById.get(membership.conversation_id) || null;
      const lastRead = membership.last_read_at ? new Date(membership.last_read_at).getTime() : 0;
      const unread = messageRows.filter(
        (m) =>
          m.conversation_id === membership.conversation_id &&
          m.sender_id !== userId &&
          !m.is_deleted &&
          new Date(m.created_at).getTime() > lastRead,
      ).length;

      const otherProfile = other ? profilesById.get(other.user_id) || null : null;

      return {
        ...base,
        ...membership,
        _direct_profile: otherProfile,
        _latest_message: latest,
        unread_count: unread,
        _display_name:
          base.name ||
          otherProfile?.display_name ||
          otherProfile?.username ||
          (base.type === "group" ? "Group conversation" : "Direct conversation"),
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      // The conversation with the most recently created message always comes first.
      // Conversations with no messages stay below active conversations.
      const aTime = a._latest_message?.created_at
        ? new Date(a._latest_message.created_at).getTime()
        : 0;
      const bTime = b._latest_message?.created_at
        ? new Date(b._latest_message.created_at).getTime()
        : 0;
      return bTime - aTime;
    });
}

export function MessagesPanel(props) {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(props.initialConversationId || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!props.userId) {
        if (alive) setLoading(false);
        return;
      }
      try {
        const data = await loadConversationList(props.userId);
        if (alive) {
          setItems(data);
          setError("");
        }
      } catch (e) {
        console.error("Convogram chat list load failed", e);
        if (alive) setError(e?.message || "Unable to load conversations.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    setLoading(true);
    load();
    const timer = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
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

  const title = (c) => c?._display_name || c?.name || "Conversation";
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
          <button type="button" aria-label="New chat" onClick={() => window.dispatchEvent(new CustomEvent("convogram:new-chat"))}>
            <Plus size={19} />
          </button>
        </header>

        <div className="messages-controller-search">
          <Search size={17} />
          <span>Search messages</span>
        </div>

        <div className="messages-controller-list">
          {loading && items.length === 0 && <div className="messages-controller-state">Loading messages…</div>}
          {!loading && !error && items.length === 0 && (
            <div className="messages-controller-state">
              <MessageCircle size={26} />
              <strong>No conversations yet</strong>
              <span>Start a chat to see it here.</span>
            </div>
          )}
          {error && (
            <div className="messages-controller-state">
              <strong>Messages unavailable</strong>
              <span>{error}</span>
            </div>
          )}

          {items.map((c) => (
            <button key={c.id} type="button" className="messages-controller-item" onClick={() => setSelectedId(c.id)}>
              <div className="messages-controller-avatar">
                {c?._direct_profile?.avatar_url ? (
                  <img src={c._direct_profile.avatar_url} alt="" />
                ) : c?.type === "group" ? (
                  <Users size={18} />
                ) : (
                  <MessageCircle size={18} />
                )}
              </div>

              <div className="messages-controller-copy">
                <strong className="messages-controller-name">
                  <span className="messages-controller-name-text">{title(c)}</span>
                  {c._direct_profile?.is_verified === true && <VerifiedBadge verified size={15} />}
                </strong>
                <span>{preview(c)}</span>
              </div>

              {Number(c.unread_count) > 0 && (
                <b className="messages-controller-unread">
                  {c.unread_count > 99 ? "99+" : c.unread_count}
                </b>
              )}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default MessagesPanel;
