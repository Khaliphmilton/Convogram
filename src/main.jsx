import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell,
  Camera,
  Compass,
  Home,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Sparkles,
  User,
  Users,
  X,
  Zap,
  SlidersHorizontal,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import {
  getFeed,
  createPost,
  deletePost,
  likePost,
  unlikePost,
  addComment,
  isPostLikedByUser,
} from "./lib/posts";
import { getMomentsForFeed, createMoment } from "./lib/moments";
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
import { FeatureSuite } from "./components/FeatureSuite";
import { EditProfilePage } from "./components/EditProfilePage";
import { SettingsPage } from "./components/SettingsPage";
import { SearchPage } from "./components/SearchPage";
import { ProfileOptionsPage } from "./components/ProfileOptionsPage";
import "./index.css";

const nav = [
  ["home", "Home", Home],
  ["shorts", "Shorts", Zap],
  ["messages", "Messages", MessageCircle],
  ["communities", "Communities", Users],
  ["profile", "Profile", User],
];

const avatar = (profile) =>
  (profile?.display_name || profile?.username || "C").slice(0, 1).toUpperCase();

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [booting, setBooting] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [active, setActiveState] = useState("home");
const activeRef = useRef("home");
const navigationStackRef = useRef([]);
const ignoreNextPopRef = useRef(false);

// All page changes go through this wrapper so Android/browser Back
// can return to the immediately previous Convogram screen.
function setActive(nextPage) {
  if (!nextPage || nextPage === activeRef.current) return;
  navigationStackRef.current.push(activeRef.current);
  activeRef.current = nextPage;
  setActiveState(nextPage);
  window.history.pushState({ convogram: true }, "", window.location.href);
}

function goBack() {
  const previousPage = navigationStackRef.current.pop();
  if (!previousPage) {
    // Keep the app inside the SPA instead of allowing Back to exit it.
    window.history.pushState({ convogram: true }, "", window.location.href);
    return;
  }
  activeRef.current = previousPage;
  setActiveState(previousPage);
  ignoreNextPopRef.current = true;
  window.history.back();
}

useEffect(() => {
  // Create an in-app history boundary. This prevents Android/browser
  // Back from immediately closing the Convogram SPA at Home.
  window.history.replaceState({ convogram: true }, "", window.location.href);
  window.history.pushState({ convogram: true, root: true }, "", window.location.href);

  const handlePopState = () => {
    if (ignoreNextPopRef.current) {
      ignoreNextPopRef.current = false;
      return;
    }

    const previousPage = navigationStackRef.current.pop();
    if (previousPage) {
      activeRef.current = previousPage;
      setActiveState(previousPage);
    } else {
      // Re-arm the root boundary so Back never exits the SPA.
      window.history.pushState({ convogram: true, root: true }, "", window.location.href);
    }
  };

  window.addEventListener("popstate", handlePopState);
  return () => window.removeEventListener("popstate", handlePopState);
}, []);
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
  const [notifications, setNotifications] = useState(false);
  const [featureSuite, setFeatureSuite] = useState(false);
  const [unread, setUnread] = useState(0);
  const [stats, setStats] = useState({
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
  });

  async function loadProfile(id) {
    if (!supabase || !id) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", id).single();
    if (data) setProfile(data);
  }

  async function refresh() {
    if (!session?.user?.id || !supabase) return;
    setLoadingFeed(true);
    setError("");
    try {
      const [feed, ms, ps, nu] = await Promise.all([
        getFeed(40),
        getMomentsForFeed(session.user.id, 30),
        getProfileStats(session.user.id),
        getUnreadNotificationsCount(session.user.id),
      ]);

      setPosts(feed || []);
      setMoments(ms || []);
      if (ps) setStats(ps);
      setUnread(nu || 0);

      const map = {};
      await Promise.all(
        (feed || []).map(async (post) => {
          map[post.id] = await isPostLikedByUser(post.id, session.user.id);
        })
      );
      setLiked(map);
    } catch (e) {
      setError(e.message || "Could not load Convogram.");
    } finally {
      setLoadingFeed(false);
    }
  }

  async function loadShorts() {
    try {
      const data = await getShortsForDiscover(30, 0);
      setShorts(data || []);
    } catch (e) {
      setError(e.message || "Could not load Shorts.");
    }
  }

  useEffect(() => {
    let alive = true;
    let subscription;

    async function boot() {
      if (!supabase) {
        setError("Supabase is not configured.");
        setBooting(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!alive) return;

      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setBooting(false);
    }

    boot();

    if (supabase) {
      const auth = supabase.auth.onAuthStateChange(async (_event, next) => {
        setSession(next);
        if (next) await loadProfile(next.user.id);
        else setProfile(null);
      });
      subscription = auth.data?.subscription;
    }

    return () => {
      alive = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session?.user?.id) refresh();
  }, [session?.user?.id]);

  useEffect(() => {
    if (active === "shorts" && session?.user?.id) loadShorts();
  }, [active, session?.user?.id]);

  async function authenticate(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }

    if (authMode === "login") {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) setError(authError.message);
      return;
    }

    if (!username.trim() || !displayName.trim()) {
      setError("Enter your name and username.");
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.trim().toLowerCase(),
          display_name: displayName.trim(),
        },
      },
    });

    if (authError) {
      setError(authError.message);
    } else if (!data.session) {
      setNotice("Account created. Check your email to confirm your account.");
    }
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut();
    setActive("home");
    setPosts([]);
    setMoments([]);
    setProfile(null);
  }

  function openComposer(type) {
    setComposer(type);
    setCaption("");
    setFile(null);
  }

  function closeComposer() {
    setComposer(null);
    setCaption("");
    setFile(null);
  }

  async function publish() {
    if (!session?.user?.id || (!caption.trim() && !file)) return;

    setPublishing(true);
    setError("");

    try {
      if (composer === "post") {
        let url = null;
        let type = "text";

        if (file) {
          const uploaded = await uploadPostMedia(file, session.user.id);
          url = uploaded.url;
          type = uploaded.mediaType;
        }

        const created = await createPost(
          session.user.id,
          caption.trim(),
          url,
          type
        );

        setPosts((current) => [
          {
            ...created,
            profiles: profile,
            likes: [{ count: 0 }],
            comments: [{ count: 0 }],
          },
          ...current,
        ]);
      } else {
        if (!file) throw new Error("Choose a photo or video for a Moment.");

        const uploaded = await uploadMomentMedia(file, session.user.id);
        const created = await createMoment(
          session.user.id,
          uploaded.url,
          uploaded.mediaType,
          caption.trim()
        );

        setMoments((current) => [
          {
            ...created,
            profiles: profile,
            moment_views: [{ count: 0 }],
            moment_likes: [{ count: 0 }],
          },
          ...current,
        ]);
      }

      closeComposer();
      const nextStats = await getProfileStats(session.user.id);
      if (nextStats) setStats(nextStats);
    } catch (e) {
      setError(e.message || "Publishing failed.");
    } finally {
      setPublishing(false);
    }
  }

  async function toggleLike(post) {
    try {
      const wasLiked = !!liked[post.id];
      if (wasLiked) await unlikePost(post.id, session.user.id);
      else await likePost(post.id, session.user.id);

      setLiked((current) => ({ ...current, [post.id]: !wasLiked }));
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                likes: [
                  {
                    count: Math.max(
                      0,
                      (item.likes?.[0]?.count || 0) + (wasLiked ? -1 : 1)
                    ),
                  },
                ],
              }
            : item
        )
      );
    } catch (e) {
      setError(e.message || "Could not update like.");
    }
  }

  async function comment(post, text) {
    try {
      const created = await addComment(post.id, session.user.id, text);
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                comments: [{ count: (item.comments?.[0]?.count || 0) + 1 }],
              }
            : item
        )
      );
      return created;
    } catch (e) {
      setError(e.message || "Could not add comment.");
      throw e;
    }
  }

  async function removePost(post) {
    try {
      await deletePost(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));
    } catch (e) {
      setError(e.message || "Could not delete post.");
    }
  }

  if (booting) {
    return (
      <div className="boot">
        <div className="brand-mark">C</div>
        <h1>Convogram</h1>
        <p>Loading your social world…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="auth">
        <div className="auth-card">
          <div className="brand-row">
            <div className="brand-mark">C</div>
            <div>
              <b>Convogram</b>
              <span>Everything social, together.</span>
            </div>
          </div>

          <div className="auth-copy">
            <small>THE SOCIAL SUPERAPP</small>
            <h1>
              {authMode === "login"
                ? "Welcome back."
                : "Create your Convogram."}
            </h1>
            <p>
              Post, chat, call, discover Shorts, follow people and build
              communities from one account.
            </p>
          </div>

          <form onSubmit={authenticate}>
            {authMode === "signup" && (
              <>
                <label>
                  Display name
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                  />
                </label>
                <label>
                  Username
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                  />
                </label>
              </>
            )}

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
            </label>

            {error && <div className="alert error">{error}</div>}
            {notice && <div className="alert">{notice}</div>}

            <button className="primary">
              {authMode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          <button
            className="switch"
            onClick={() =>
              setAuthMode((mode) => (mode === "login" ? "signup" : "login"))
            }
          >
            {authMode === "login"
              ? "New to Convogram? Create an account"
              : "Already have an account? Log in"}
          </button>
        </div>
      </div>
    );
  }

  const openAccount = (account) => {
    setProfile(account);
    setStats({ postsCount: 0, followersCount: 0, followingCount: 0 });
    setActive("profile");
  };

  return (
    <div className="app" style={{ overflowX: "hidden" }}>
      <header className="topbar">
        <button className="brand-button" onClick={() => setActive("home")}>
          <span className="brand-mark small">C</span>
          <b>Convogram</b>
        </button>

        <div className="top-search" />

        <div className="top-actions">
          <button className="top-create" onClick={() => openComposer("post")}>
            <Plus size={20} />
            <span>Post</span>
          </button>
          <button onClick={() => setActive("search")}>
            <Search size={20} />
          </button>
          <button onClick={() => setFeatureSuite(true)}>
            <SlidersHorizontal size={20} />
          </button>
          <button
            className="notification"
            onClick={() => setNotifications((value) => !value)}
          >
            <Bell size={20} />
            {unread > 0 && <i>{unread > 9 ? "9+" : unread}</i>}
          </button>
          <button onClick={() => setActive("profile")}>
            <span className="avatar mini">{avatar(profile)}</span>
          </button>
        </div>
      </header>

      {notifications && (
        <NotificationsPanel
          userId={session.user.id}
          onClose={() => {
            setNotifications(false);
            refresh();
          }}
        />
      )}

      <main className="layout">
        <aside className="sidebar">
          <div className="side-profile">
            <span className="avatar">{avatar(profile)}</span>
            <div>
              <b>{profile?.display_name || "You"}</b>
              <small>@{profile?.username || "user"}</small>
            </div>
          </div>

          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              className={active === id ? "active" : ""}
              onClick={() => setActive(id)}
            >
              <Icon size={20} />
              <span>{label}</span>
              {id === "messages" && <em>Chat</em>}
            </button>
          ))}

          <div className="sidebar-divider" />

          <button className="create-nav" onClick={() => openComposer("post")}>
            <Plus size={20} />
            <span>Create post</span>
          </button>
          <button onClick={() => setActive("search")}>
            <Search size={20} />
            <span>Search</span>
          </button>
          <button onClick={() => setFeatureSuite(true)}>
            <SlidersHorizontal size={20} />
            <span>All features</span>
          </button>
          <button onClick={() => setActive("settings")}>
            <Settings size={20} />
            <span>Settings</span>
          </button>
          <button className="logout" onClick={logout}>
            <span>↪</span>
            <span>Log out</span>
          </button>
        </aside>

        <section className="content">
          {error && (
            <div className="global-alert">
              {error}
              <button onClick={() => setError("")}>
                <X size={15} />
              </button>
            </div>
          )}

          {active === "home" && (
            <>
              <section className="panel first-panel">
                <div className="section-head">
                  <div>
                    <small>24 HOURS</small>
                    <h2>Moments</h2>
                  </div>
                  <div className="section-actions">
                    <button onClick={() => openComposer("moment")}>
                      <Plus size={16} /> Add Moment
                    </button>
                    <button onClick={() => openComposer("post")}>
                      <Plus size={16} /> Post
                    </button>
                  </div>
                </div>
                <MomentsRow
                  moments={moments}
                  currentUserId={session.user.id}
                  onAddMoment={() => openComposer("moment")}
                  loading={false}
                  error={null}
                />
              </section>

              <section className="panel">
                <div className="section-head">
                  <div>
                    <small>YOUR FEED</small>
                    <h2>For you</h2>
                  </div>
                  <div className="section-actions">
                    <button onClick={() => openComposer("post")}>
                      <Plus size={16} /> Create post
                    </button>
                    <button onClick={refresh}>
                      <Compass size={16} /> Refresh
                    </button>
                  </div>
                </div>

                {loadingFeed ? (
                  <div className="empty">Loading your feed…</div>
                ) : posts.length ? (
                  posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={session.user.id}
                      isLiked={!!liked[post.id]}
                      onLike={() => toggleLike(post)}
                      onUnlike={() => toggleLike(post)}
                      onComment={(text) => comment(post, text)}
                      onDelete={() => removePost(post)}
                      likeCount={post.likes?.[0]?.count || 0}
                      commentCount={post.comments?.[0]?.count || 0}
                    />
                  ))
                ) : (
                  <div className="empty">
                    <Sparkles size={28} />
                    <h3>Your feed starts here.</h3>
                    <p>Share the first thing your people will see.</p>
                    <button
                      className="primary"
                      onClick={() => openComposer("post")}
                    >
                      Create your first post
                    </button>
                  </div>
                )}
              </section>
            </>
          )}

          {active === "search" && (
            <SearchPage
              currentUserId={session.user.id}
              onBack={goBack}
              onOpenProfile={openAccount}
            />
          )}

          {active === "shorts" && (
            <section className="page">
              <div className="page-head">
                <div>
                  <small>SHORT VIDEO</small>
                  <h1>Shorts</h1>
                  <p>Short videos, sounds and creators.</p>
                </div>
                <button onClick={loadShorts}>
                  <Zap size={18} /> Refresh
                </button>
              </div>
              <ShortsPanel shorts={shorts} userId={session.user.id} />
            </section>
          )}

          {active === "messages" && (
            <section className="page">
              <MessagesPanel userId={session.user.id} />
            </section>
          )}

          {active === "communities" && (
            <section className="page">
              <CommunitiesPanel userId={session.user.id} />
            </section>
          )}

          {active === "profile" && (
            <ProfilePanel
              userId={session.user.id}
              profile={profile}
              stats={stats}
              onCreatePost={() => openComposer("post")}
              onCreateMoment={() => openComposer("moment")}
              onMessage={() => setActive("messages")}
              onEdit={() => setActive("profile-options")}
              onProfileUpdated={setProfile}
            />
          )}

          {active === "profile-options" && (
            <ProfileOptionsPage
              profile={profile}
              onBack={goBack}
              onEditProfile={() => setActive("edit-profile")}
              onSettings={() => setActive("settings")}
              onLogout={logout}
            />
          )}

          {active === "settings" && (
            <SettingsPage
              profile={profile}
              onBack={goBack}
              onEditProfile={() => setActive("edit-profile")}
              onLogout={logout}
            />
          )}

          {active === "edit-profile" && (
            <EditProfilePage
              profile={profile}
              userId={session.user.id}
              onBack={goBack}
              onProfileUpdated={setProfile}
            />
          )}
        </section>
      </main>

      <nav className="mobile-nav">
        {nav.map(([id, label, Icon]) => (
          <button
            key={id}
            className={active === id ? "active" : ""}
            onClick={() => setActive(id)}
          >
            <Icon size={21} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {composer && (
        <div className="modal-backdrop" onClick={closeComposer}>
          <div className="composer" onClick={(e) => e.stopPropagation()}>
            <div className="composer-head">
              <div>
                <small>{composer === "post" ? "CREATE" : "24 HOURS"}</small>
                <h2>{composer === "post" ? "New post" : "New Moment"}</h2>
              </div>
              <button onClick={closeComposer}>
                <X />
              </button>
            </div>

            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={
                composer === "post" ? "What's happening?" : "Add a caption…"
              }
            />

            <label className="file-picker">
              <Camera size={18} />
              <span>{file ? file.name : "Add photo or video"}</span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>

            <button
              className="primary publish"
              disabled={publishing || (!caption.trim() && !file)}
              onClick={publish}
            >
              {publishing ? "Publishing…" : "Publish"}
            </button>
          </div>
        </div>
      )}

      {featureSuite && (
        <FeatureSuite
          userId={session.user.id}
          onClose={() => setFeatureSuite(false)}
        />
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
