import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Bell, Camera, Compass, Home, MessageCircle, Plus, Search, Settings, Sparkles, User, Users, Video, X, Zap } from "lucide-react";
import { supabase } from "./lib/supabase";
import { getFeed, createPost, deletePost, likePost, unlikePost, addComment, isPostLikedByUser } from "./lib/posts";
import { getMomentsForFeed, createMoment, recordMomentView } from "./lib/moments";
import { uploadPostMedia, uploadMomentMedia } from "./lib/storage";
import { getShortsForDiscover } from "./lib/shorts";
import { getUnreadNotificationsCount } from "./lib/notifications";
import { getProfileStats } from "./lib/profiles";
import { PostCard } from "./components/PostCard";
import { MomentsRow } from "./components/MomentsRow";
import { ShortsPanel } from "./components/ShortsPanel";
import { MessagesPanel } from "./components/MessagesPanel";
import { CommunitiesPanel } from "./components/CommunitiesPanel";
import { NotificationsPanel } from "./components/NotificationsPanel";
import { ProfilePanel } from "./components/ProfilePanel";
import "./index.css";

const nav = [
  ["home", "Home", Home],
  ["discover", "Discover", Compass],
  ["shorts", "Shorts", Zap],
  ["messages", "Messages", MessageCircle],
  ["communities", "Communities", Users],
  ["profile", "Profile", User],
];

function avatar(profile) {
  return (profile?.display_name || profile?.username || "C").slice(0, 1).toUpperCase();
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [booting, setBooting] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [active, setActive] = useState("home");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [posts, setPosts] = useState([]);
  const [moments, setMoments] = useState([]);
  const [shorts, setShorts] = useState([]);
  const [liked, setLiked] = useState({});
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [composer, setComposer] = useState(null);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [unread, setUnread] = useState(0);
  const [stats, setStats] = useState({ postsCount: 0, followersCount: 0, followingCount: 0 });

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supabase) { setError("Supabase is not configured."); setBooting(false); return; }
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setBooting(false);
    })();
    const { data } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next);
      if (next) await loadProfile(next.user.id); else setProfile(null);
    });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { if (session?.user?.id) refresh(); }, [session?.user?.id]);
  useEffect(() => { if (active === "shorts" && session?.user?.id) loadShorts(); }, [active, session?.user?.id]);

  async function loadProfile(userId) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile(data);
  }

  async function refresh() {
    if (!session?.user?.id) return;
    setLoadingFeed(true); setError("");
    try {
      const [feed, activeMoments, profileStats, notificationCount] = await Promise.all([
        getFeed(40), getMomentsForFeed(session.user.id, 30), getProfileStats(session.user.id), getUnreadNotificationsCount(session.user.id)
      ]);
      setPosts(feed || []); setMoments(activeMoments || []); setStats(profileStats || stats); setUnread(notificationCount || 0);
      const map = {};
      await Promise.all((feed || []).map(async p => { map[p.id] = await isPostLikedByUser(p.id, session.user.id); }));
      setLiked(map);
    } catch (e) { setError(e.message || "Could not load Convogram."); }
    finally { setLoadingFeed(false); }
  }

  async function loadShorts() { try { setShorts((await getShortsForDiscover(30, 0)) || []); } catch (e) { setError(e.message || "Could not load Shorts."); } }

  async function authenticate(e) {
    e.preventDefault(); setError(""); setNotice("");
    if (!email || !password) return setError("Enter your email and password.");
    if (authMode === "login") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
      return;
    }
    if (!username.trim() || !displayName.trim()) return setError("Enter your name and username.");
    const { data, error: err } = await supabase.auth.signUp({ email, password, options: { data: { username: username.trim().toLowerCase(), display_name: displayName.trim() } } });
    if (err) return setError(err.message);
    if (!data.session) setNotice("Account created. Check your email to confirm your account.");
  }

  async function logout() { await supabase.auth.signOut(); setActive("home"); setPosts([]); setMoments([]); }

  function openComposer(type) { setComposer(type); setCaption(""); setFile(null); }
  function closeComposer() { setComposer(null); setCaption(""); setFile(null); }

  async function publish() {
    if (!session?.user?.id || (!caption.trim() && !file)) return;
    setPublishing(true); setError("");
    try {
      if (composer === "post") {
        let mediaUrl = null; let mediaType = "text";
        if (file) { const upload = await uploadPostMedia(file, session.user.id); mediaUrl = upload.url; mediaType = upload.mediaType; }
        const created = await createPost(session.user.id, caption.trim(), mediaUrl, mediaType);
        setPosts(p => [{ ...created, profiles: profile, likes: [{ count: 0 }], comments: [{ count: 0 }] }, ...p]);
      } else {
        if (!file) throw new Error("Choose a photo or video for a Moment.");
        const upload = await uploadMomentMedia(file, session.user.id);
        const created = await createMoment(session.user.id, upload.url, upload.mediaType, caption.trim());
        setMoments(p => [{ ...created, profiles: profile, moment_views: [{ count: 0 }] }, ...p]);
      }
      closeComposer();
      const next = await getProfileStats(session.user.id); if (next) setStats(next);
    } catch (e) { setError(e.message || "Publishing failed."); }
    finally { setPublishing(false); }
  }

  async function toggleLike(post) {
    try {
      if (liked[post.id]) { await unlikePost(post.id, session.user.id); setLiked(x => ({ ...x, [post.id]: false })); }
      else { await likePost(post.id, session.user.id); setLiked(x => ({ ...x, [post.id]: true })); }
      setPosts(items => items.map(p => p.id === post.id ? { ...p, likes: [{ count: Math.max(0, (p.likes?.[0]?.count || 0) + (liked[post.id] ? -1 : 1)) }] } : p));
    } catch (e) { setError(e.message || "Could not update like."); }
  }

  async function comment(post, text) { await addComment(post.id, session.user.id, text); setPosts(items => items.map(p => p.id === post.id ? { ...p, comments: [{ count: (p.comments?.[0]?.count || 0) + 1 }] } : p)); }
  async function removePost(post) { await deletePost(post.id); setPosts(items => items.filter(p => p.id !== post.id)); }
  async function viewMoment(moment) { if (moment.user_id !== session.user.id) await recordMomentView(moment.id, session.user.id); }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase(); if (!q) return posts;
    return posts.filter(p => `${p.caption || ""} ${p.profiles?.display_name || ""} ${p.profiles?.username || ""}`.toLowerCase().includes(q));
  }, [posts, search]);

  if (booting) return <div className="boot"><div className="brand-mark">C</div><h1>Convogram</h1><p>Loading your social world…</p></div>;

  if (!session) return <div className="auth"><div className="auth-card"><div className="brand-row"><div className="brand-mark">C</div><div><b>Convogram</b><span>Everything social, together.</span></div></div><div className="auth-copy"><small>THE SOCIAL SUPERAPP</small><h1>{authMode === "login" ? "Welcome back." : "Create your Convogram."}</h1><p>Post, chat, call, discover Shorts, follow people and build communities from one account.</p></div><form onSubmit={authenticate}>{authMode === "signup" && <><label>Display name<input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" /></label><label>Username<input value={username} onChange={e => setUsername(e.target.value)} placeholder="username" /></label></>}<label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" /></label>{error && <div className="alert error">{error}</div>}{notice && <div className="alert">{notice}</div>}<button className="primary" type="submit">{authMode === "login" ? "Log in" : "Create account"}</button></form><button className="switch" onClick={() => setAuthMode(m => m === "login" ? "signup" : "login")}>{authMode === "login" ? "New to Convogram? Create an account" : "Already have an account? Log in"}</button></div></div>;

  return <div className="app">
    <header className="topbar"><button className="brand-button" onClick={() => setActive("home")}><span className="brand-mark small">C</span><b>Convogram</b></button><div className="top-search">{searchOpen && <><Search size={17}/><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people, posts and communities"/><button onClick={() => { setSearch(""); setSearchOpen(false); }}><X size={17}/></button></>}</div><div className="top-actions"><button onClick={() => setSearchOpen(v => !v)}><Search size={20}/></button><button className="notification" onClick={() => setNotifications(v => !v)}><Bell size={20}/>{unread > 0 && <i>{unread > 9 ? "9+" : unread}</i>}</button><button onClick={() => setActive("profile")}><span className="avatar mini">{avatar(profile)}</span></button></div></header>
    {notifications && <NotificationsPanel userId={session.user.id} onClose={() => { setNotifications(false); refresh(); }} />}
    <main className="layout"><aside className="sidebar"><div className="side-profile"><span className="avatar">{avatar(profile)}</span><div><b>{profile?.display_name || "You"}</b><small>@{profile?.username || "user"}</small></div></div>{nav.map(([id, label, Icon]) => <button key={id} className={active === id ? "active" : ""} onClick={() => setActive(id)}><Icon size={20}/><span>{label}</span>{id === "messages" && <em>Chat</em>}</button>)}<div className="sidebar-divider"/><button onClick={() => openComposer("post")}><Plus size={20}/><span>Create</span></button><button onClick={() => setActive("profile")}><Settings size={20}/><span>Settings</span></button><button className="logout" onClick={logout}><span>↪</span><span>Log out</span></button></aside>
      <section className="content">
        {error && <div className="global-alert">{error}<button onClick={() => setError("")}><X size={15}/></button></div>}
        {active === "home" && <>
          <section className="welcome"><div><small>YOUR SOCIAL WORLD</small><h1>Everything you love.<br/><span>One conversation.</span></h1><p>Share moments, watch Shorts, message friends and grow communities without jumping between apps.</p><div className="welcome-actions"><button className="primary" onClick={() => openComposer("post")}><Plus size={17}/> Create post</button><button onClick={() => openComposer("moment")}><Camera size={17}/> Add Moment</button></div></div><div className="feature-orb"><Sparkles size={34}/><b>Connect<br/>more.</b></div></section>
          <section className="panel"><div className="section-head"><div><small>24 HOURS</small><h2>Moments</h2></div><button onClick={() => openComposer("moment")}><Plus size={16}/> Add</button></div><MomentsRow moments={moments} currentUserId={session.user.id} onAddMoment={() => openComposer("moment")} onViewMoment={viewMoment} loading={false} error={null}/></section>
          <section className="panel"><div className="section-head"><div><small>YOUR FEED</small><h2>For you</h2></div><button onClick={refresh}><Compass size={16}/> Refresh</button></div>{loadingFeed ? <div className="empty">Loading your feed…</div> : filtered.length ? filtered.map(post => <PostCard key={post.id} post={post} currentUserId={session.user.id} isLiked={!!liked[post.id]} onLike={() => toggleLike(post)} onUnlike={() => toggleLike(post)} onComment={text => comment(post, text)} onDelete={() => removePost(post)} likeCount={post.likes?.[0]?.count || 0} commentCount={post.comments?.[0]?.count || 0}/>) : <div className="empty"><Sparkles size={28}/><h3>Your feed starts here.</h3><p>Share the first thing your people will see.</p><button className="primary" onClick={() => openComposer("post")}>Create your first post</button></div>}</section>
        </>}
        {active === "discover" && <section className="page"><div className="page-head"><div><small>EXPLORE</small><h1>Discover</h1><p>Find people, conversations, communities and content.</p></div><button className="primary" onClick={() => setSearchOpen(true)}><Search size={17}/> Search</button></div><div className="discover-grid"><div><h3>Short-form video</h3><p>Jump into Shorts and discover creators.</p><button onClick={() => setActive("shorts")}>Open Shorts <Video size={16}/></button></div><div><h3>Communities</h3><p>Join spaces built around shared interests.</p><button onClick={() => setActive("communities")}>Explore communities <Users size={16}/></button></div><div><h3>Messages & calls</h3><p>Private chats, groups, voice and video experiences.</p><button onClick={() => setActive("messages")}>Open messages <MessageCircle size={16}/></button></div></div></section>}
        {active === "shorts" && <section className="page"><div className="page-head"><div><small>DISCOVER</small><h1>Shorts</h1><p>Short videos, sounds and creators.</p></div><button onClick={loadShorts}><Zap size={18}/> Refresh</button></div>{shorts.length ? <ShortsPanel shorts={shorts} userId={session.user.id}/> : <div className="empty"><Zap size={30}/><h3>No Shorts yet</h3><p>Short videos will appear here as creators publish them.</p></div>}</section>}
        {active === "messages" && <section className="page"><MessagesPanel userId={session.user.id}/></section>}
        {active === "communities" && <section className="page"><CommunitiesPanel userId={session.user.id}/></section>}
        {active === "profile" && <ProfilePanel profile={profile} stats={stats} posts={posts} onCreatePost={() => openComposer("post")} onCreateMoment={() => openComposer("moment")} onMessage={() => setActive("messages")} onEdit={() => setNotice("Profile settings are ready for your account.")} />}
      </section>
    </main>
    <nav className="mobile-nav">{nav.slice(0, 5).map(([id, label, Icon]) => <button key={id} className={active === id ? "active" : ""} onClick={() => setActive(id)}><Icon size={21}/><span>{label}</span></button>)}</nav>
    {composer && <div className="modal-backdrop" onClick={closeComposer}><div className="composer" onClick={e => e.stopPropagation()}><div className="composer-head"><div><small>{composer === "post" ? "CREATE" : "24 HOURS"}</small><h2>{composer === "post" ? "New post" : "New Moment"}</h2></div><button onClick={closeComposer}><X/></button></div><textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder={composer === "post" ? "What's happening?" : "Add a caption…"}/><label className="file-picker"><Camera size={18}/><span>{file ? file.name : "Add photo or video"}</span><input type="file" accept="image/*,video/*" onChange={e => setFile(e.target.files?.[0] || null)}/></label><button className="primary publish" disabled={publishing || (!caption.trim() && !file)} onClick={publish}>{publishing ? "Publishing…" : "Publish"}</button></div></div>}
  </div>;
}

createRoot(document.getElementById("root")).render(<App />);
