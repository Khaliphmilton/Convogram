import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Send, Upload, Video, Volume2, VolumeX } from "lucide-react";
import { getShortComments, isShortLikedByUser, likeShort, unlikeShort, addShortComment } from "../lib/shorts";
import { publishShort } from "../lib/shorts_publish";
import "./ShortsPanel.css";

export function ShortsPanel({ shorts = [], userId }) {
  const [items, setItems] = useState(shorts);
  const [commentsFor, setCommentsFor] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [shortFile, setShortFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [soundName, setSoundName] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(true);
  const feedRef = useRef(null);
  const videoRefs = useRef(new Map());

  useEffect(() => {
    setItems(shorts);
    let active = true;
    Promise.all(shorts.map(async (short) => [short.id, await isShortLikedByUser(short.id, userId)])).then((states) => {
      if (active) setItems(shorts.map((short) => ({ ...short, liked: states.find(([id]) => id === short.id)?.[1] || false })));
    }).catch(() => {});
    return () => { active = false; };
  }, [shorts, userId]);

  useEffect(() => {
    const root = feedRef.current;
    if (!root) return undefined;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.7) video.play().catch(() => {});
        else video.pause();
      });
    }, { root, threshold: [0, 0.7, 1] });
    root.querySelectorAll("video[data-short-video]").forEach((video) => observer.observe(video));
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    videoRefs.current.forEach((video) => { if (video) video.muted = muted; });
  }, [muted]);

  async function toggleLike(item) {
    if (item.liked) await unlikeShort(item.id, userId); else await likeShort(item.id, userId);
    setItems((prev) => prev.map((s) => s.id === item.id ? { ...s, liked: !s.liked, short_likes: [{ count: Math.max(0, (s.short_likes?.[0]?.count || 0) + (s.liked ? -1 : 1)) }] } : s));
  }
  async function openComments(item) { setCommentsFor(item); setComments(await getShortComments(item.id)); }
  async function submitComment(e) { e.preventDefault(); if (!commentText.trim() || !commentsFor) return; const created = await addShortComment(commentsFor.id, userId, commentText.trim()); setComments((prev) => [created, ...prev]); setCommentText(""); }
  async function create() {
    if (!shortFile) return setError("Choose a video first.");
    setPublishing(true); setError("");
    try { const created = await publishShort(userId, shortFile, caption, soundName); setItems((prev) => [{ ...created, liked: false, short_likes: [{ count: 0 }], short_comments: [{ count: 0 }] }, ...prev]); setShortFile(null); setCaption(""); setSoundName(""); setCreateOpen(false); }
    catch (err) { setError(err.message || "Short could not be published."); }
    finally { setPublishing(false); }
  }

  function toggleMute() { setMuted((current) => !current); }

  return <div className="shorts-panel">
    <div className="shorts-create-bar"><button onClick={() => setCreateOpen((v) => !v)}><Upload size={17} /> Create Short</button>{error && <span>{error}</span>}</div>
    {createOpen && <div className="shorts-create-form"><div className="shorts-create-title"><Video size={18} /><strong>New Short</strong></div><label className="short-file-label"><Upload size={17} />{shortFile ? shortFile.name : "Choose video"}<input type="file" accept="video/*" hidden onChange={(e) => setShortFile(e.target.files?.[0] || null)} /></label><input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption" /><input value={soundName} onChange={(e) => setSoundName(e.target.value)} placeholder="Sound name (optional)" /><button onClick={create} disabled={publishing}>{publishing ? "Publishing…" : "Publish"}</button></div>}
    {items.length ? <div className="shorts-panel-feed" ref={feedRef} aria-label="Shorts video feed">
      {items.map((short) => <article className="shorts-panel-card" key={short.id}>
        <video ref={(node) => { if (node) videoRefs.current.set(short.id, node); else videoRefs.current.delete(short.id); }} data-short-video src={short.video_url || short.media_url} autoPlay muted={muted} loop playsInline preload="metadata" onClick={(e) => { if (e.currentTarget.paused) e.currentTarget.play().catch(() => {}); else e.currentTarget.pause(); }} />
        <div className="shorts-overlay"><strong>@{short.profiles?.username || "creator"}</strong><p>{short.caption || ""}</p><span>{short.sound_name ? `♫ ${short.sound_name}` : "Original sound"}</span></div>
        <div className="shorts-actions">
          <button onClick={() => toggleLike(short)} className={short.liked ? "liked" : ""} aria-label="Like"><Heart fill={short.liked ? "currentColor" : "none"} /><small>{short.short_likes?.[0]?.count || 0}</small></button>
          <button onClick={() => openComments(short)} aria-label="Comment"><MessageCircle /><small>{short.short_comments?.[0]?.count || 0}</small></button>
          <button onClick={() => { if (navigator.share) navigator.share({ title: "Convogram Short", url: short.video_url || short.media_url }).catch(() => {}); }} aria-label="Share"><Send /></button>
          <button className="shorts-mute-button" onClick={toggleMute} aria-label={muted ? "Unmute sound" : "Mute sound"} title={muted ? "Unmute" : "Mute"}>{muted ? <VolumeX /> : <Volume2 />}</button>
        </div>
      </article>)}
    </div> : <div className="shorts-empty"><Video size={34}/><h2>No Shorts yet</h2><p>Upload a short video to start the feed.</p></div>}
    {commentsFor && <div className="short-comments-backdrop" onClick={() => setCommentsFor(null)}><div className="short-comments" onClick={(e) => e.stopPropagation()}><div className="short-comments-head"><strong>Comments</strong><button onClick={() => setCommentsFor(null)}>×</button></div><div className="short-comments-list">{comments.map((comment) => <div key={comment.id}><strong>@{comment.profiles?.username || "user"}</strong><span>{comment.content}</span></div>)}</div><form onSubmit={submitComment}><input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." /><button><Send size={17} /></button></form></div></div>}
  </div>;
}
