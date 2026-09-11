import { useEffect, useState } from "react";
import { Heart, MessageCircle, Send, Volume2, VolumeX } from "lucide-react";
import { getShortComments, isShortLikedByUser, likeShort, unlikeShort, addShortComment } from "../lib/shorts";
import "./ShortsPanel.css";

export function ShortsPanel({ shorts = [], userId }) {
  const [items, setItems] = useState(shorts);
  const [commentsFor, setCommentsFor] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    setItems(shorts);
    let active = true;
    Promise.all(shorts.map(async (short) => [short.id, await isShortLikedByUser(short.id, userId)])).then((states) => {
      if (active) setItems(shorts.map((short) => ({ ...short, liked: states.find(([id]) => id === short.id)?.[1] || false })));
    });
    return () => { active = false; };
  }, [shorts, userId]);

  async function toggleLike(item) {
    if (item.liked) await unlikeShort(item.id, userId); else await likeShort(item.id, userId);
    setItems((prev) => prev.map((s) => s.id === item.id ? { ...s, liked: !s.liked, short_likes: [{ count: Math.max(0, (s.short_likes?.[0]?.count || 0) + (s.liked ? -1 : 1)) }] } : s));
  }

  async function openComments(item) {
    setCommentsFor(item);
    setComments(await getShortComments(item.id));
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!commentText.trim() || !commentsFor) return;
    const created = await addShortComment(commentsFor.id, userId, commentText.trim());
    setComments((prev) => [created, ...prev]);
    setCommentText("");
  }

  return <div className="shorts-panel">
    {items.map((short) => <article className="shorts-panel-card" key={short.id}>
      <video src={short.video_url || short.media_url} autoPlay muted={muted} loop playsInline controls />
      <div className="shorts-overlay"><strong>@{short.profiles?.username || "creator"}</strong><p>{short.caption || ""}</p><span>{short.sound_name ? `♫ ${short.sound_name}` : "Original sound"}</span></div>
      <div className="shorts-actions"><button onClick={() => toggleLike(short)} className={short.liked ? "liked" : ""}><Heart fill={short.liked ? "currentColor" : "none"} /><small>{short.short_likes?.[0]?.count || 0}</small></button><button onClick={() => openComments(short)}><MessageCircle /><small>{short.short_comments?.[0]?.count || 0}</small></button><button><Send /></button><button onClick={() => setMuted((v) => !v)}>{muted ? <VolumeX /> : <Volume2 />}</button></div>
    </article>)}
    {commentsFor && <div className="short-comments-backdrop" onClick={() => setCommentsFor(null)}><div className="short-comments" onClick={(e) => e.stopPropagation()}><div className="short-comments-head"><strong>Comments</strong><button onClick={() => setCommentsFor(null)}>×</button></div><div className="short-comments-list">{comments.map((comment) => <div key={comment.id}><strong>@{comment.profiles?.username || "user"}</strong><span>{comment.content}</span></div>)}</div><form onSubmit={submitComment}><input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." /><button><Send size={17} /></button></form></div></div>}
  </div>;
}
