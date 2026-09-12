import { useEffect, useState } from "react";
import { Bookmark, Check, Copy, Hash, MessageSquareText, MoreHorizontal, Plus, Radio, Repeat2, Search, Smile, Sparkles, Vote, X } from "lucide-react";
import { createNote, getActiveNotes, getSavedPosts, toggleRepost, toggleSavedPost } from "../lib/socialSuite";
import { VerifiedBadge } from "./VerifiedBadge";
import "./FeatureSuite.css";

const tabs = [
  ["saved", "Saved", Bookmark],
  ["notes", "Notes", MessageSquareText],
  ["creator", "Creator", Sparkles],
  ["live", "Live", Radio],
  ["safety", "Safety", Check],
];

export function FeatureSuite({ userId, onClose }) {
  const [tab, setTab] = useState("saved");
  const [saved, setSaved] = useState([]);
  const [notes, setNotes] = useState([]);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [savedRows, noteRows] = await Promise.all([getSavedPosts(userId), getActiveNotes()]);
      setSaved(savedRows || []); setNotes(noteRows || []);
    } catch (e) { setNotice(e.message || "Could not load feature data."); }
  }
  useEffect(() => { if (userId) load(); }, [userId]);

  async function saveNote(e) {
    e.preventDefault();
    if (!note.trim() || busy) return;
    setBusy(true); setNotice("");
    try { const created = await createNote(userId, note); setNotes(rows => [created, ...rows]); setNote(""); setNotice("Note posted for 24 hours."); }
    catch (e) { setNotice(e.message || "Could not post note."); }
    finally { setBusy(false); }
  }

  async function removeSaved(postId) {
    try { await toggleSavedPost(userId, postId); setSaved(rows => rows.filter(row => row.post_id !== postId)); }
    catch (e) { setNotice(e.message || "Could not update saved posts."); }
  }

  async function repost(postId) {
    try { const active = await toggleRepost(userId, postId); setNotice(active ? "Reposted." : "Repost removed."); }
    catch (e) { setNotice(e.message || "Could not repost."); }
  }

  return <div className="feature-suite-backdrop" onClick={onClose}>
    <section className="feature-suite" onClick={e => e.stopPropagation()}>
      <header className="feature-suite-head"><div><small>CONVOGRAM</small><h2>Everything free</h2><p>Social tools, creator tools and safety controls — no payments.</p></div><button onClick={onClose}><X size={20}/></button></header>
      <div className="feature-tabs">{tabs.map(([id, label, Icon]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={17}/>{label}</button>)}</div>
      {notice && <div className="feature-notice">{notice}</div>}
      {tab === "saved" && <div className="feature-body"><div className="feature-title"><div><small>YOUR LIBRARY</small><h3>Saved posts</h3></div><Bookmark size={22}/></div>{saved.length ? saved.map(row => <article className="saved-row" key={row.id}><div><strong>{row.posts?.profiles?.display_name || "Convogram post"}<VerifiedBadge verified={row.posts?.profiles?.is_verified} verificationStatus={row.posts?.profiles?.verification_status} size={15}/></strong><p>{row.posts?.caption || "Media post"}</p></div><button onClick={() => removeSaved(row.post_id)}>Remove</button></article>) : <div className="feature-empty"><Bookmark/><h3>Nothing saved yet</h3><p>Save posts you want to return to later.</p></div>}</div>}
      {tab === "notes" && <div className="feature-body"><div className="feature-title"><div><small>24 HOURS</small><h3>Notes</h3></div><MessageSquareText size={22}/></div><form className="note-form" onSubmit={saveNote}><input maxLength={280} value={note} onChange={e => setNote(e.target.value)} placeholder="Share a quick thought…"/><button className="primary-button" disabled={!note.trim() || busy}><Plus size={16}/> Post</button></form><div className="notes-list">{notes.map(item => <article className="note-card" key={item.id}><span className="note-avatar">{(item.profiles?.display_name || "C").slice(0,1).toUpperCase()}</span><div><strong>{item.profiles?.display_name || "You"}<VerifiedBadge verified={item.profiles?.is_verified} verificationStatus={item.profiles?.verification_status} size={15}/></strong><p>{item.content}</p><small>Expires in 24 hours</small></div></article>)}</div></div>}
      {tab === "creator" && <div className="feature-body"><div className="feature-title"><div><small>CREATOR STUDIO</small><h3>Publish & grow</h3></div><Sparkles size={22}/></div><div className="feature-grid"><div><h4>Drafts</h4><p>Keep unfinished posts organized before publishing.</p></div><div><h4>Scheduling</h4><p>Plan posts and Moments around your audience.</p></div><div><h4>Analytics</h4><p>Track reach, engagement and follower growth.</p></div><div><h4>Broadcasts</h4><p>One-to-many updates for people who follow your channel.</p></div></div><p className="feature-footnote">The app keeps these as free creator capabilities; no Premium tier or payment flow is included.</p></div>}
      {tab === "live" && <div className="feature-body"><div className="feature-title"><div><small>LIVE</small><h3>Go live</h3></div><Radio size={22}/></div><div className="feature-grid"><div><h4>Live video</h4><p>Use the existing livestream backend to create scheduled/live sessions.</p></div><div><h4>Live audience</h4><p>Viewer membership and presence are stored with the stream.</p></div><div><h4>Live moderation</h4><p>Hosts can manage the session and end it when finished.</p></div></div><button className="primary-button" onClick={() => setNotice("Live session controls are available from the Live area.")}><Radio size={16}/> Open Live</button></div>}
      {tab === "safety" && <div className="feature-body"><div className="feature-title"><div><small>SAFETY CENTER</small><h3>Stay in control</h3></div><Check size={22}/></div><div className="feature-grid"><div><h4>Privacy</h4><p>Private accounts and activity controls protect your profile.</p></div><div><h4>Reports</h4><p>Report abusive or unwanted content for review.</p></div><div><h4>Muted words</h4><p>Reduce unwanted topics in your experience.</p></div><div><h4>Blocked accounts</h4><p>Keep unwanted accounts away from your conversations.</p></div></div></div>}
    </section>
  </div>;
}
