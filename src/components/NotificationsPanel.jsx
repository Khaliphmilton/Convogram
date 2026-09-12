import { useEffect, useMemo, useState } from "react";
import { Bell, Check, Heart, MessageCircle, UserPlus, Video, X, Users } from "lucide-react";
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "../lib/notifications";
import "./NotificationsPanelExtras.css";

const icons = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  message: MessageCircle,
  call: Video,
  mention: Bell,
  moment_view: Bell,
  community_invite: Users,
};

export function NotificationsPanel({ userId, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getNotifications(userId, 50);
        if (active) setItems(data || []);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId]);

  async function read(item) {
    if (!item.is_read) {
      await markNotificationAsRead(item.id).catch(() => {});
      setItems((current) => current.map((n) => n.id === item.id ? { ...n, is_read: true } : n));
    }
  }

  async function readAll() {
    await markAllNotificationsAsRead(userId).catch(() => {});
    setItems((current) => current.map((n) => ({ ...n, is_read: true })));
  }

  function text(item) {
    const name = item.profiles?.display_name || item.profiles?.username || "Someone";
    return item.type === "like" ? `${name} liked your post.`
      : item.type === "comment" ? `${name} commented on your post.`
      : item.type === "follow" ? `${name} started following you.`
      : item.type === "message" ? `${name} sent you a message.`
      : item.type === "call" ? `${name} started a call.`
      : item.type === "community_invite" ? `${name} invited you to a community.`
      : `${name} interacted with you.`;
  }

  const unreadCount = useMemo(() => items.filter((item) => !item.is_read).length, [items]);

  return (
    <div className="notification-popover">
      <header className="notification-header">
        <div className="notification-title">
          <span className="notification-kicker">ACTIVITY</span>
          <h2>Notifications</h2>
          <p>{unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "You're all caught up"}</p>
        </div>
        <div className="notification-header-actions">
          {unreadCount > 0 && (
            <button onClick={readAll} title="Mark all as read" aria-label="Mark all as read">
              <Check size={17} />
            </button>
          )}
          <button onClick={onClose} title="Close notifications" aria-label="Close notifications">
            <X size={18} />
          </button>
        </div>
      </header>

      <main className="notification-content">
        {loading ? (
          <div className="notification-loading">
            {[1, 2, 3, 4].map((item) => <div className="notification-skeleton" key={item} />)}
          </div>
        ) : items.length ? (
          <section className="notification-section">
            <div className="notification-section-head">
              <h3>Recent activity</h3>
              {unreadCount > 0 && <span>{unreadCount} new</span>}
            </div>
            <div className="notification-list">
              {items.map((item) => {
                const Icon = icons[item.type] || Bell;
                return (
                  <button
                    key={item.id}
                    className={`notification-item ${item.is_read ? "read" : "unread"}`}
                    onClick={() => read(item)}
                  >
                    <span className="notification-icon"><Icon size={18} /></span>
                    <span className="notification-copy">
                      <strong>{text(item)}</strong>
                      <small>{new Date(item.created_at).toLocaleString()}</small>
                    </span>
                    {!item.is_read && <i aria-label="Unread" />}
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <div className="notification-empty">
            <span className="notification-empty-icon"><Bell size={28} /></span>
            <h3>All caught up</h3>
            <p>Likes, comments, follows, messages and other activity will appear here.</p>
          </div>
        )}
      </main>
    </div>
  );
}
