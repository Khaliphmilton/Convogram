import { useEffect, useState } from "react";
import { Check, Compass, Plus, Users, X } from "lucide-react";
import { createCommunity, createCommunityPost, getCommunities, getCommunityPosts, getUserCommunities, joinCommunity, leaveCommunity } from "../lib/communities";

export function CommunitiesPanel({ userId }) {
  const [communities, setCommunities] = useState([]);
  const [mine, setMine] = useState([]);
  const [selected, setSelected] = useState(null);
  const [posts, setPosts] = useState([]);
  const [draft, setDraft] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [all, joined] = await Promise.all([getCommunities(50), getUserCommunities(userId)]);
      setCommunities(all || []); setMine(joined || []);
    } catch (err) { setError(err.message || "Unable to load communities."); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (userId) load(); }, [userId]);
  async function openCommunity(community) {
    setSelected(community);
    try { setPosts(await getCommunityPosts(community.id, 30) || []); }
    catch (err) { setError(err.message || "Unable to load community posts."); }
  }
  const joinedIds = new Set(mine.map((item) => item.id));
  async function toggleJoin(community) {
    try {
      if (joinedIds.has(community.id)) { await leaveCommunity(community.id, userId); setMine((current) => current.filter((item) => item.id !== community.id)); }
      else { await joinCommunity(community.id, userId); setMine((current) => [...current, { ...community, userRole: "member" }]); }
    } catch (err) { setError(err.message || "Could not update membership."); }
  }
  async function publishPost(event) {
    event.preventDefault();
    if (!draft.trim() || !selected || !joinedIds.has(selected.id)) return;
    try { const created = await createCommunityPost(selected.id, userId, draft.trim()); setPosts((current) => [created, ...current]); setDraft(""); }
    catch (err) { setError(err.message || "Could not publish community post."); }
  }
  async function handleCreate(event) {
    event.preventDefault(); if (!name.trim()) return;
    try {
      const created = await createCommunity(userId, name.trim(), description.trim());
      const hydrated = { ...created, profiles: { display_name: "You" }, community_members: [{ count: 1 }] };
      setCommunities((current) => [hydrated, ...current]); setMine((current) => [{ ...created, userRole: "owner" }, ...current]);
      setName(""); setDescription(""); setCreateOpen(false); await openCommunity(hydrated);
    } catch (err) { setError(err.message || "Could not create community."); }
  }
  return <div className="community-workspace">
    {error && <div className="global-error">{error}<button onClick={() => setError("")}><X size={15} /></button></div>}
    <div className="community-toolbar"><div><span className="eyebrow">YOUR SPACES</span><h2>Communities</h2></div><div className="community-toolbar-actions"><button className="secondary-button" onClick={load}><Compass size={16} /> Discover</button><button className="primary-button small" onClick={() => setCreateOpen(true)}><Plus size={16} /> Create</button></div></div>
    {loading ? <div className="feature-panel">Loading communities...</div> : <div className="community-layout"><aside className="community-list">{communities.map((community) => <button key={community.id} className={`community-list-item ${selected?.id === community.id ? "selected" : ""}`} onClick={() => openCommunity(community)}><div className="community-icon">{community.name?.charAt(0).toUpperCase()}</div><div><strong>{community.name}</strong><span>{community.community_members?.[0]?.count || 0} members</span></div></button>)}{!communities.length && <div className="empty-state"><Users size={28} /><p>No communities yet.</p></div>}</aside>
      <section className="community-detail">{selected ? <><header className="community-detail-head"><div><span className="eyebrow">COMMUNITY</span><h2>{selected.name}</h2><p>{selected.description || "A place to connect and share."}</p></div><button className={joinedIds.has(selected.id) ? "secondary-button" : "primary-button small"} onClick={() => toggleJoin(selected)}>{joinedIds.has(selected.id) ? <><Check size={16} /> Joined</> : "Join"}</button></header>{joinedIds.has(selected.id) && <form className="community-composer" onSubmit={publishPost}><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Share something with ${selected.name}...`} /><button type="submit"><Plus size={17} /></button></form>}<div className="community-posts">{posts.map((post) => <article className="community-post" key={post.id}><div className="mini-avatar">{(post.profiles?.display_name || "C").charAt(0).toUpperCase()}</div><div><strong>{post.profiles?.display_name || "Member"}</strong><small>@{post.profiles?.username || "member"}</small><p>{post.content}</p></div></article>)}{!posts.length && <div className="empty-state"><Users size={28} /><h3>No posts yet</h3><p>Start the first conversation.</p></div>}</div></> : <div className="feature-panel"><Users size={36} /><h2>Find your people</h2><p>Choose a community to view its posts, or create your own space.</p></div>}</section></div>}
    {createOpen && <div className="modal-backdrop"><form className="composer-modal" onSubmit={handleCreate}><div className="modal-head"><div><span className="eyebrow">NEW SPACE</span><h2>Create community</h2></div><button type="button" onClick={() => setCreateOpen(false)}><X /></button></div><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Community name" required /><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this community about?" /><button className="primary-button" type="submit">Create community</button></form></div>}
  </div>;
}
