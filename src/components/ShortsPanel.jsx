import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bookmark, Heart, MessageCircle, Send, Upload, Video, Volume2, VolumeX } from "lucide-react";
import { getShortComments, isShortLikedByUser, likeShort, unlikeShort, addShortComment } from "../lib/shorts";
import { publishShort } from "../lib/shorts_publish";
import { VerifiedBadge } from "./VerifiedBadge";
import { ProfilePanel } from "./ProfilePanel";
import { supabase } from "../lib/supabase";
import "./ShortsPanel.css";

export function ShortsPanel({ shorts = [], userId, onOpenCreator }) {
  const [items, setItems] = useState(shorts);
  const [savedShortIds, setSavedShortIds] = useState(new Set());
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
  const [creatorProfile, setCreatorProfile] = useState(null);
  const feedRef = useRef(null);
  const videoRefs = useRef(new Map());
  const swipeStartRef = useRef(null);
  const profileHistoryRef = useRef(false);

  useEffect(() => {
    setItems(shorts);
    let active = true;
    Promise.all(shorts.map(async (short) => [short.id, await isShortLikedByUser(short.id, userId)])).then((states) => {
      if (active) setItems(shorts.map((short) => ({ ...short, liked: states.find(([id]) => id === short.id)?.[1] || false })));
    }).catch(() => {});
    return () => { active = false; };
  }, [shorts, userId]);

  useEffect(() => {
    let active = true;
    if (!userId) return () => { active = false; };
    supabase.from("saved_shorts").select("short_id").eq("user_id", userId).then(({ data }) => {
      if (active) setSavedShortIds(new Set((data || []).map((row) => row.short_id)));
    }).catch(() => {});
    return () => { active = false; };
  }, [userId, shorts]);

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

  useEffect(() => {
    function handlePopState(event) {
      if (!profileHistoryRef.current) return;
      profileHistoryRef.current = false;
      event.stopImmediatePropagation();
      setCreatorProfile(null);
    }
    window.addEventListener("popstate", handlePopState, { capture: true });
    return () => window.removeEventListener("popstate", handlePopState, { capture: true });
  }, []);

  async function toggleLike(item) {
    if (item.liked) await unlikeShort(item.id, userId); else await likeShort(item.id, userId);
    setItems((prev) => prev.map((s) => s.id === item.id ? { ...s, liked: !s.liked, short_likes: [{ count: Math.max(0, (s.short_likes?.[0]?.count || 0) + (s.liked ? -1 : 1)) }] } : s));
  }
  async function toggleSave(short) {
    if (!userId) return;
    try {
      if (savedShortIds.has(short.id)) {
        const { error: deleteError } = await supabase.from("saved_shorts").delete().eq("user_id", userId).eq("short_id", short.id);
        if (deleteError) throw deleteError;
        setSavedShortIds((prev) => { const next = new Set(prev); next.delete(short.id); return next; });
      } else {
        const { error: insertError } = await supabase.from("saved_shorts").upsert({ user_id: userId, short_id: short.id }, { onConflict: "user_id,short_id" });
        if (insertError) throw insertError;
        setSavedShortIds((prev) => new Set(prev).add(short.id));
      }
    } catch (err) { setError(err.message || "Could not update Saved."); }
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

  function openCreatorProfile(short) {
    const creator = short.profiles || {};
    const creatorId = creator.id || short.user_id || short.creator_id;
    if (!creatorId) return;
    const nextProfile = { ...creator, id: creatorId };
    window.history.pushState({ convogramShortsProfile: true }, "", window.location.href);
    profileHistoryRef.current = true;
    setCreatorProfile(nextProfile);
  }

  function closeCreatorProfile() {
    if (profileHistoryRef.current) window.history.back();
    else setCreatorProfile(null);
  }

  function handleTouchStart(event, short) {
    const touch = event.touches?.[0];
    if (touch) swipeStartRef.current = { x: touch.clientX, y: touch.clientY, short };
  }

  function handleTouchEnd(event) {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (dx < -80 && Math.abs(dx) > Math.abs(dy) * 1.25) openCreatorProfile(start.short);
  }

  if (creatorProfile) {
    return <div className="shorts-creator-profile-view">
      <div className="shorts-creator-profile-bar"><button onClick={closeCreatorProfile} aria-label="Back to Shorts"><ArrowLeft size={21} /></button><strong>@{creatorProfile.username || "creator"}</strong></div>
      <ProfilePanel profile={creatorProfile} stats={{ postsCount: 0, followersCount: 0, followingCount: 0 }} userId={userId} initialTab="posts" onPeople={() => {}} onMessage={() => {}} />
    </div>;
  }

  return <div className="shorts-panel">
    <div className="shorts-create-bar"><button onClick={() => setCreateOpen((v) => !v)}><Upload size={17} /> Create Short</button>{error && <span>{error}</span>}</div>
    {createOpen && <div className="shorts-create-form"><div className="shorts-create-title"><Video size={18} /><strong>New Short</strong></div><label className="short-file-label"><Upload size={17} />{shortFile ? shortFile.name : "Choose video"}<input type="file" accept="video/*" hidden onChange={(e) => setShortFile(e.target.files?.[0] || null)} /></label><input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption" /><input value={soundName} onChange={(e) => setSoundName(e.target.value)} placeholder="Sound name (optional)" /><button onClick={create} disabled={publishing}>{publishing ? "Publishing…" : "Publish"}</button></div>}
    {items.length ? <div className="shorts-panel-feed" ref={feedRef} aria-label="Shorts video feed">
      {items.map((short) => <article className="shorts-panel-card" key={short.id} onTouchStart={(event) => handleTouchStart(event, short)} onTouchEnd={handleTouchEnd}>
        <video ref={(node) => { if (node) videoRefs.current.set(short.id, node); else videoRefs.current.delete(short.id); }} data-short-video src={short.video_url || short.media_url} autoPlay muted={muted} loop playsInline preload="metadata" onClick={(e) => { if (e.currentTarget.paused) e.currentTarget.play().catch(() => {}); else e.currentTarget.pause(); }} />
        <div className="shorts-overlay"><div className="shorts-owner"><strong>@{short.profiles?.username || "creator"}</strong><VerifiedBadge verified={short.profiles?.is_verified} verificationStatus={short.profiles?.verification_status} size={16}/></div><p>{short.caption || ""}</p><span>{short.sound_name ? `♫ ${short.sound_name}` : "Original sound"}</span></div>
        <div className="shorts-actions">
          <button onClick={() => toggleLike(short)} className={short.liked ? "liked" : ""} aria-label="Like"><Heart fill={short.liked ? "currentColor" : "none"} /><small>{short.short_likes?.[0]?.count || 0}</small></button>
          <button onClick={() => openComments(short)} aria-label="Comment"><MessageCircle /><small>{short.short_comments?.[0]?.count || 0}</small></button>
          <button onClick={() => { if (navigator.share) navigator.share({ title: "Convogram Short", url: short.video_url || short.media_url }).catch(() => {}); }} aria-label="Share"><Send /></button>
          <button className="shorts-mute-button" onClick={toggleMute} aria-label={muted ? "Unmute sound" : "Mute sound"} title={muted ? "Unmute" : "Mute"}>{muted ? <VolumeX /> : <Volume2 />}</button>
          <button className={`shorts-save-button ${savedShortIds.has(short.id) ? "saved" : ""}`} onClick={() => toggleSave(short)} aria-label={savedShortIds.has(short.id) ? "Unsave Short" : "Save Short"} title={savedShortIds.has(short.id) ? "Saved" : "Save"}><Bookmark fill={savedShortIds.has(short.id) ? "currentColor" : "none"} /></button>
        </div>
      </article>)}
    </div> : <div className="shorts-empty"><Video size={34}/><h2>No Shorts yet</h2><p>Upload a short video to start the feed.</p></div>}
    {commentsFor && <div className="short-comments-backdrop" onClick={() => setCommentsFor(null)}><div className="short-comments" onClick={(e) => e.stopPropagation()}><div className="short-comments-head"><strong>Comments</strong><button onClick={() => setCommentsFor(null)}>×</button></div><div className="short-comments-list">{comments.map((comment) => <div key={comment.id}><strong>@{comment.profiles?.username || "user"}<VerifiedBadge verified={comment.profiles?.is_verified} verificationStatus={comment.profiles?.verification_status} size={14}/></strong><span>{comment.content}</span></div>)}</div><form onSubmit={submitComment}><input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." /><button><Send size={17} /></button></form></div></div>}
  </div>;
}
