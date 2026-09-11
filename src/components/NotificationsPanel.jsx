import { useEffect, useState } from "react";
import { Bell, Check, Heart, MessageCircle, UserPlus, Video, X, Users } from "lucide-react";
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "../lib/notifications";

const icons = { like: Heart, comment: MessageCircle, follow: UserPlus, message: MessageCircle, call: Video, mention: Bell, moment_view: Bell, community_invite: Users };

export function NotificationsPanel({ userId, onClose }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; (async () => { try { const data = await getNotifications(userId, 50); if (active) setItems(data || []); } finally { if (active) setLoading(false); } })(); return () => { active = false; }; }, [userId]);
  async function read(item) { if (!item.is_read) { await markNotificationAsRead(item.id).catch(() => {}); setItems((current) => current.map((n) => n.id === item.id ? { ...n, is_read: true } : n)); } }
  async function readAll() { await markAllNotificationsAsRead(userId).catch(() => {}); setItems((current) => current.map((n) => ({ ...n, is_read: true }))); }
  function text(item) { const name = item.profiles?.display_name || item.profiles?.username || "Someone"; return item.type === "like" ? `${name} liked your post.` : item.type === "comment" ? `${name} commented on your post.` : item.type === "follow" ? `${name} started following you.` : item.type === "message" ? `${name} sent you a message.` : item.type === "call" ? `${name} started a call.` : item.type === "community_invite" ? `${name} invited you to a community.` : `${name} interacted with you.`; }
  return <div className="notification-popover"><header><div><span className="eyebrow">UPDATES</span><h2>Notifications</h2></div><div><button onClick={readAll} title="Mark all read"><Check size={17} /></button><button onClick={onClose}><X size={18} /></button></div></header>{loading ? <div className="notification-empty">Loading...</div> : items.length ? <div className="notification-list">{items.map((item) => { const Icon = icons[item.type] || Bell; return <button key={item.id} className={`notification-item ${item.is_read ? "read" : "unread"}`} onClick={() => read(item)}><span className="notification-icon"><Icon size={17} /></span><span><strong>{text(item)}</strong><small>{new Date(item.created_at).toLocaleString()}</small></span>{!item.is_read && <i />}</button>; })}</div> : <div className="notification-empty"><Bell size={30} /><h3>All caught up</h3><p>New activity will appear here.</p></div>}</div>;
}
