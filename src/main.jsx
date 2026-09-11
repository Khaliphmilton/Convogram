import { useEffect, useMemo, useState } from "react";
import { Bell, Camera, Check, Compass, Home, ImagePlus, LogOut, MessageCircle, Plus, Search, Send, Settings, Sparkles, User, Users, Video, X, Zap } from "lucide-react";
import { supabase } from "./lib/supabase";
import { getFeed, createPost, deletePost, likePost, unlikePost, addComment, isPostLikedByUser } from "./lib/posts";
import { getMomentsForFeed, createMoment, recordMomentView } from "./lib/moments";
import { uploadPostMedia, uploadMomentMedia } from "./lib/storage";
import { getShortsForDiscover } from "./lib/shorts";
import { PostCard } from "./components/PostCard";
import { MomentsRow } from "./components/MomentsRow";
import { ShortsPanel } from "./components/ShortsPanel";
import "./index.css";
import "./convogram.css";

const navItems = [
  { id: "home", label: "Home", icon: Home },
  { id: "shorts", label: "Shorts", icon: Zap },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "communities", label: "Communities", icon: Users },
  { id: "profile", label: "Profile", icon: User },
];

function avatarLetter(profile, fallback = "C") {
  return (profile?.display_name || profile?.username || fallback).charAt(0).toUpperCase();
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [activeTab, setActiveTab] = useState("home");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [posts, setPosts] = useState([]);
  const [moments, setMoments] = useState([]);
  const [shorts, setShorts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [momentLoading, setMomentLoading] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState("post");
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [viewingMoment, setViewingMoment] = useState(null);
  const [likedPosts, setLikedPosts] = useState({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadSession();
    if (!supabase) return undefined;
    const { data } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (!currentSession) setProfile(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.id) refreshHome(session.user.id);
  }, [session?.user?.id]);

  useEffect(() => {
    if (activeTab === "shorts" && session?.user?.id) loadShorts();
  }, [activeTab, session?.user?.id]);

  async function loadSession() {
    if (!supabase) {
      setError("Convogram is not connected to Supabase yet.");
      setLoading(false);
      return;
    }
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session) await loadProfile(data.session.user.id);
    setLoading(false);
  }

  async function loadProfile(userId) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile(data);
  }

  async function refreshHome(userId) {
    setFeedLoading(true);
    setMomentLoading(true);
    try {
      const [feed, activeMoments] = await Promise.all([getFeed(30), getMomentsForFeed(userId, 30)]);
      setPosts(feed || []);
      setMoments(activeMoments || []);
      const likes = {};
      await Promise.all((feed || []).map(async (post) => {
        likes[post.id] = await isPostLikedByUser(post.id, userId);
      }));
      setLikedPosts(likes);
    } catch (err) {
      setError(err.message || "Unable to load your feed.");
    } finally {
      setFeedLoading(false);
      setMomentLoading(false);
    }
  }

  async function loadShorts() {
    try {
      const data = await getShortsForDiscover(20, 0);
      setShorts(data || []);
    } catch (err) {
      setError(err.message || "Unable to load Shorts.");
    }
  }

  async function handleAuth(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!email || !password) return setError("Enter your email and password.");
    if (authMode === "signup" && (!username || !displayName)) return setError("Enter your name and choose a username.");
    if (authMode === "login") {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) return setError(loginError.message);
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      return;
    }
    const { data, error: signupError } = await supabase.auth.signUp({ email, password, options: { data: { username: username.trim().toLowerCase(), display_name: displayName.trim() } } });
    if (signupError) return setError(signupError.message);
    if (data.session) {
      setSession(data.session);
      await loadProfile(data.session.user.id);
    } else setMessage("Account created. Check your email to confirm your account.");
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setPosts([]);
    setMoments([]);
    setActiveTab("home");
  }

  function openComposer(type = "post") {
    setComposerType(type);
    setCaption("");
    setSelectedFile(null);
    setComposerOpen(true);
  }

  function closeComposer() {
    setComposerOpen(false);
    setCaption("");
    setSelectedFile(null);
  }

  async function publish() {
    if (!session?.user?.id || (!caption.trim() && !selectedFile)) return;
    setPublishing(true);
    setError("");
    try {
      if (composerType === "post") {
        let mediaUrl = null;
        let mediaType = "text";
        if (selectedFile) {
          const uploaded = await uploadPostMedia(selectedFile, session.user.id);
          mediaUrl = uploaded.url;
          mediaType = uploaded.mediaType;
        }
        const created = await createPost(session.user.id, caption.trim(), mediaUrl, mediaType);
        setPosts((prev) => [{ ...created, profiles: profile, likes: [{ count: 0 }], comments: [{ count: 0 }] }, ...prev]);
      } else {
        if (!selectedFile) throw new Error("Choose a photo or video for your Moment.");
        const uploaded = await uploadMomentMedia(selectedFile, session.user.id);
        const created = await createMoment(session.user.id, uploaded.url, uploaded.mediaType, caption.trim());
        setMoments((prev) => [{ ...created, profiles: profile, moment_views: [{ count: 0 }] }, ...prev]);
      }
      closeComposer();
    } catch (err) {
      setError(err.message || "Publishing failed.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleLike(post) {
    await likePost(post.id, session.user.id);
    setLikedPosts((prev) => ({ ...prev, [post.id]: true }));
    setPosts((prev) => prev.map((item) => item.id === post.id ? { ...item, likes: [{ count: (item.likes?.[0]?.count || 0) + 1 }] } : item));
  }

  async function handleUnlike(post) {
    await unlikePost(post.id, session.user.id);
    setLikedPosts((prev) => ({ ...prev, [post.id]: false }));
    setPosts((prev) => prev.map((item) => item.id === post.id ? { ...item, likes: [{ count: Math.max(0, (item.likes?.[0]?.count || 0) - 1) }] } : item));
  }

  async function handleComment(post, content) {
    await addComment(post.id, session.user.id, content);
    setPosts((prev) => prev.map((item) => item.id === post.id ? { ...item, comments: [{ count: (item.comments?.[0]?.count || 0) + 1 }] } : item));
  }

  async function handleDelete(post) {
    await deletePost(post.id);
    setPosts((prev) => prev.filter((item) => item.id !== post.id));
  }

  async function viewMoment(moment) {
    setViewingMoment(moment);
    if (moment.user_id !== session.user.id) await recordMomentView(moment.id, session.user.id);
  }

  const filteredPosts = useMemo(() => {
    if (!searchTerm.trim()) return posts;
    const term = searchTerm.toLowerCase();
    return posts.filter((post) => `${post.caption || ""} ${post.profiles?.display_name || ""} ${post.profiles?.username || ""}`.toLowerCase().includes(term));
  }, [posts, searchTerm]);

  if (loading) return <div className="loading-screen"><div className="loading-logo">C</div><h1>Convogram</h1><p>Preparing your world...</p></div>;

  if (!session) {
    return <div className="auth-page"><div className="auth-glow" /><div className="auth-card"><div className="brand"><div className="logo-mark">C</div><div><h1>Convogram</h1><span>Connect. Share. Communicate.</span></div></div><div className="auth-heading"><span className="eyebrow">THE SOCIAL SUPERAPP</span><h2>{authMode === "login" ? "Welcome back" : "Join Convogram"}</h2><p>{authMode === "login" ? "Your people, conversations and moments are waiting." : "One place for messages, Moments, Shorts and communities."}</p></div><form onSubmit={handleAuth}>{authMode === "signup" && <><label>Display name</label><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" /><label>Username</label><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" /></>}<label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /><label>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />{error && <div className="error-box">{error}</div>}{message && <div className="success-box">{message}</div>}<button className="primary-button" type="submit">{authMode === "login" ? "Log in" : "Create account"}</button></form><div className="auth-switch"><span>{authMode === "login" ? "New to Convogram?" : "Already here?"}</span><button onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>{authMode === "login" ? "Create account" : "Log in"}</button></div></div></div>;
  }

  return <div className="app-shell"><header className="topbar"><button className="topbar-brand" onClick={() => setActiveTab("home")}><div className="small-logo">C</div><strong>Convogram</strong></button><div className="topbar-actions"><button onClick={() => setSearchOpen((v) => !v)} aria-label="Search"><Search size={20} /></button><button aria-label="Notifications"><Bell size={20} /></button><button onClick={() => setActiveTab("profile")} aria-label="Profile"><div className="mini-avatar">{avatarLetter(profile)}</div></button></div></header>{searchOpen && <div className="search-bar"><Search size={18} /><input autoFocus value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search Convogram..." /><button onClick={() => { setSearchTerm(""); setSearchOpen(false); }}><X size={18} /></button></div>}<main className="main-content">{error && <div className="global-error">{error}<button onClick={() => setError("")}><X size={15} /></button></div>}
  {activeTab === "home" && <><section className="hero-card"><div><span className="eyebrow">GOOD TO SEE YOU, {profile?.display_name?.split(" ")[0]?.toUpperCase() || "FRIEND"}</span><h1>Everything you love.<br /><span>One conversation.</span></h1><p>Share Moments, discover Shorts, message your people and build communities.</p><div className="hero-actions"><button onClick={() => openComposer("post")}><Plus size={17} /> Create post</button><button className="ghost" onClick={() => openComposer("moment")}><Camera size={17} /> Add Moment</button></div></div><div className="hero-orbit"><Sparkles size={34} /><div>Connect<br />more.</div></div></section><section className="section"><div className="section-header"><div><span className="eyebrow">24 HOURS</span><h2>Moments</h2></div><button onClick={() => openComposer("moment")}><Plus size={17} /> Add</button></div><MomentsRow moments={moments} currentUserId={session.user.id} onAddMoment={() => openComposer("moment")} onViewMoment={viewMoment} loading={momentLoading} error={null} /></section><section className="section"><div className="section-header"><div><span className="eyebrow">YOUR FEED</span><h2>For you</h2></div><button onClick={() => refreshHome(session.user.id)}><Compass size={16} /> Refresh</button></div>{feedLoading ? <div className="feed-loader">Loading your feed...</div> : filteredPosts.length ? filteredPosts.map((post) => <PostCard key={post.id} post={post} currentUserId={session.user.id} isLiked={!!likedPosts[post.id]} onLike={() => handleLike(post)} onUnlike={() => handleUnlike(post)} onComment={(content) => handleComment(post, content)} onDelete={() => handleDelete(post)} likeCount={post.likes?.[0]?.count || 0} commentCount={post.comments?.[0]?.count || 0} />) : <div className="empty-state"><Sparkles size={28} /><h2>Your feed is ready</h2><p>Be the first to share something with your Convogram community.</p><button className="primary-button small" onClick={() => openComposer("post")}>Create your first post</button></div>}</section></>}
  {activeTab === "shorts" && <section className="page-section"><div className="page-title"><div><span className="eyebrow">DISCOVER</span><h1>Shorts</h1></div><button className="round-button"><Video size={20} /></button></div><ShortsPanel shorts={shorts} userId={session.user.id} /></section>}
  {activeTab === "messages" && <section className="page-section"><div className="page-title"><div><span className="eyebrow">PRIVATE & GROUP</span><h1>Messages</h1></div><button className="round-button"><Plus size={20} /></button></div><div className="feature-panel"><MessageCircle size={32} /><h2>Your conversations</h2><p>Chat, share files, react, reply and keep your conversations together in Convogram.</p><button className="primary-button small">Start a chat</button></div></section>}
  {activeTab === "communities" && <section className="page-section"><div className="page-title"><div><span className="eyebrow">FIND YOUR PEOPLE</span><h1>Communities</h1></div><button className="round-button"><Plus size={20} /></button></div><div className="community-grid"><div className="community-card"><div className="community-icon">C</div><h3>Discover communities</h3><p>Join groups, channels and conversations around what you love.</p><button className="secondary-button">Explore</button></div><div className="community-card"><div className="community-icon"><Users size={24} /></div><h3>Create your community</h3><p>Build a space for your friends, audience or organization.</p><button className="secondary-button">Create</button></div></div></section>}
  {activeTab === "profile" && <section className="profile-page"><div className="profile-cover"><div className="cover-glow" /></div><div className="profile-main"><div className="profile-avatar">{avatarLetter(profile)}</div><button className="edit-profile"><Settings size={15} /> Edit</button><h1>{profile?.display_name || "Convogram User"}</h1><p className="username">@{profile?.username || "user"}</p><p className="bio">{profile?.bio || "Welcome to my Convogram profile."}</p><div className="profile-stats"><div><strong>{posts.filter((p) => p.user_id === session.user.id).length}</strong><span>Posts</span></div><div><strong>0</strong><span>Followers</span></div><div><strong>0</strong><span>Following</span></div></div><div className="profile-actions"><button onClick={() => openComposer("post")}><Plus size={16} /> Post</button><button onClick={() => openComposer("moment")}><Camera size={16} /> Moment</button></div><button className="logout-button" onClick={logout}><LogOut size={16} /> Log out</button></div></section>}
</main><nav className="bottom-nav">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-button ${activeTab === id ? "active" : ""}`} onClick={() => setActiveTab(id)}><Icon size={21} /><small>{label}</small></button>)}</nav>
{composerOpen && <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closeComposer()}><div className="composer-modal"><div className="modal-head"><div><span className="eyebrow">CREATE</span><h2>{composerType === "post" ? "New post" : "New Moment"}</h2></div><button onClick={closeComposer}><X /></button></div><textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder={composerType === "post" ? "What's on your mind?" : "Add a caption..."} /><label className="upload-box"><input type="file" accept="image/*,video/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />{selectedFile ? <><Check size={24} /><strong>{selectedFile.name}</strong><span>Ready to upload</span></> : <><ImagePlus size={28} /><strong>Add photo or video</strong><span>Up to 50MB</span></>}</label><button className="primary-button" disabled={publishing || (composerType === "post" && !caption.trim() && !selectedFile)} onClick={publish}>{publishing ? "Publishing..." : composerType === "post" ? "Publish post" : "Share Moment"}<Send size={16} /></button></div></div>}
{viewingMoment && <div className="moment-viewer" onClick={() => setViewingMoment(null)}><button className="viewer-close" onClick={() => setViewingMoment(null)}><X /></button><div className="viewer-content" onClick={(e) => e.stopPropagation()}>{viewingMoment.media_type === "video" ? <video src={viewingMoment.media_url} controls autoPlay /> : <img src={viewingMoment.media_url} alt={viewingMoment.caption || "Moment"} />}<div className="viewer-caption"><strong>{viewingMoment.profiles?.display_name}</strong><span>{viewingMoment.caption}</span></div></div></div>}
</div>;
}

export default App;
