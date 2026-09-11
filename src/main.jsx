import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import "./index.css";

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);

      if (!currentSession) {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadSession() {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    setSession(currentSession);

    if (currentSession) {
      await loadProfile(currentSession.user.id);
    }

    setLoading(false);
  }

  async function loadProfile(userId) {
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!profileError) {
      setProfile(data);
    }
  }

  async function handleAuth(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (authMode === "signup" && !username) {
      setError("Please choose a username.");
      return;
    }

    if (authMode === "signup" && !displayName) {
      setError("Please enter your display name.");
      return;
    }

    if (authMode === "login") {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      setSession(data.session);

      if (data.session) {
        await loadProfile(data.session.user.id);
      }

      return;
    }

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.trim().toLowerCase(),
          display_name: displayName.trim(),
        },
      },
    });

    if (signupError) {
      setError(signupError.message);
      return;
    }

    if (data.session) {
      setSession(data.session);
      await loadProfile(data.session.user.id);
    } else {
      setMessage(
        "Account created. Check your email to confirm your Convogram account."
      );
    }
  }

  async function logout() {
    await supabase.auth.signOut();

    setSession(null);
    setProfile(null);
    setActiveTab("home");
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="logo-mark">C</div>
        <h1>Convogram</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="brand">
            <div className="logo-mark">C</div>

            <div>
              <h1>Convogram</h1>
              <span>Connect. Share. Communicate.</span>
            </div>
          </div>

          <div className="auth-heading">
            <h2>
              {authMode === "login"
                ? "Welcome back"
                : "Create your Convogram account"}
            </h2>

            <p>
              {authMode === "login"
                ? "Sign in to continue to Convogram."
                : "Join the next generation of social communication."}
            </p>
          </div>

          <form onSubmit={handleAuth}>
            {authMode === "signup" && (
              <>
                <label>Display name</label>

                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />

                <label>Username</label>

                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@username"
                />
              </>
            )}

            <label>Email</label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />

            <label>Password</label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete={
                authMode === "login" ? "current-password" : "new-password"
              }
            />

            {error && <div className="error-box">{error}</div>}

            {message && <div className="success-box">{message}</div>}

            <button className="primary-button" type="submit">
              {authMode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          <div className="auth-switch">
            {authMode === "login" ? (
              <>
                <span>Don't have an account?</span>

                <button onClick={() => setAuthMode("signup")}>
                  Create one
                </button>
              </>
            ) : (
              <>
                <span>Already have an account?</span>

                <button onClick={() => setAuthMode("login")}>
                  Log in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="small-logo">C</div>
          <strong>Convogram</strong>
        </div>

        <div className="topbar-actions">
          <button>⌕</button>
          <button>♡</button>
          <button>☰</button>
        </div>
      </header>

      <main className="main-content">
        {activeTab === "home" && (
          <>
            <section className="welcome-card">
              <div>
                <span className="eyebrow">WELCOME TO CONVOGRAM</span>

                <h1>
                  Connect with
                  <br />
                  everyone.
                </h1>

                <p>
                  Share moments, chat with friends, discover content and
                  communicate in one place.
                </p>
              </div>

              <div className="welcome-icon">C</div>
            </section>

            <section className="section">
              <div className="section-header">
                <h2>Stories</h2>
                <button>See all</button>
              </div>

              <div className="stories">
                <div className="story add-story">
                  <div>+</div>
                  <span>Your story</span>
                </div>

                <div className="story">
                  <div className="story-avatar">A</div>
                  <span>Alex</span>
                </div>

                <div className="story">
                  <div className="story-avatar">J</div>
                  <span>James</span>
                </div>

                <div className="story">
                  <div className="story-avatar">M</div>
                  <span>Mary</span>
                </div>
              </div>
            </section>

            <section className="section">
              <div className="section-header">
                <h2>For you</h2>
                <button>Explore</button>
              </div>

              <article className="post-card">
                <div className="post-header">
                  <div className="avatar">C</div>

                  <div>
                    <strong>Convogram</strong>
                    <span>@convogram</span>
                  </div>

                  <button className="more-button">•••</button>
                </div>

                <div className="post-content">
                  <h3>Welcome to Convogram 🚀</h3>

                  <p>
                    One place for your conversations, communities, stories,
                    videos and connections.
                  </p>
                </div>

                <div className="post-actions">
                  <button>♡ 0</button>
                  <button>💬 0</button>
                  <button>↗ Share</button>
                </div>
              </article>
            </section>
          </>
        )}

        {activeTab === "chats" && (
          <section className="page-section">
            <div className="page-title">
              <div>
                <span className="eyebrow">CONVERSATIONS</span>
                <h1>Chats</h1>
              </div>

              <button className="round-button">＋</button>
            </div>

            <div className="empty-state">
              <div className="empty-icon">💬</div>

              <h2>Your conversations</h2>

              <p>
                Your real Convogram chats will appear here as people start
                messaging each other.
              </p>

              <button className="primary-button small">
                Start a conversation
              </button>
            </div>
          </section>
        )}

        {activeTab === "shorts" && (
          <section className="page-section">
            <div className="page-title">
              <div>
                <span className="eyebrow">DISCOVER</span>
                <h1>Shorts</h1>
              </div>
            </div>

            <div className="empty-state">
              <div className="empty-icon">▶</div>
              <h2>Convogram Shorts</h2>
              <p>
                Short videos, creators and discoveries will live here.
              </p>
            </div>
          </section>
        )}

        {activeTab === "calls" && (
          <section className="page-section">
            <div className="page-title">
              <div>
                <span className="eyebrow">COMMUNICATION</span>
                <h1>Calls</h1>
              </div>

              <button className="round-button">＋</button>
            </div>

            <div className="empty-state">
              <div className="empty-icon">☎</div>
              <h2>Your calls</h2>
              <p>
                Voice and video calls will appear here.
              </p>
            </div>
          </section>
        )}

        {activeTab === "profile" && (
          <section className="profile-page">
            <div className="profile-cover"></div>

            <div className="profile-main">
              <div className="profile-avatar">
                {profile?.display_name?.charAt(0)?.toUpperCase() || "C"}
              </div>

              <button className="edit-profile">Edit profile</button>

              <h1>{profile?.display_name || "Convogram User"}</h1>

              <p className="username">
                @{profile?.username || "user"}
              </p>

              <p className="bio">
                {profile?.bio || "Welcome to my Convogram profile."}
              </p>

              <div className="profile-stats">
                <div>
                  <strong>0</strong>
                  <span>Posts</span>
                </div>

                <div>
                  <strong>0</strong>
                  <span>Followers</span>
                </div>

                <div>
                  <strong>0</strong>
                  <span>Following</span>
                </div>
              </div>

              <button className="logout-button" onClick={logout}>
                Log out
              </button>
            </div>
          </section>
        )}
      </main>

      <nav className="bottom-nav">
        <NavButton
          active={activeTab === "home"}
          icon="⌂"
          label="Home"
          onClick={() => setActiveTab("home")}
        />

        <NavButton
          active={activeTab === "chats"}
          icon="◉"
          label="Chats"
          onClick={() => setActiveTab("chats")}
        />

        <NavButton
          active={activeTab === "shorts"}
          icon="▶"
          label="Shorts"
          onClick={() => setActiveTab("shorts")}
        />

        <NavButton
          active={activeTab === "calls"}
          icon="☎"
          label="Calls"
          onClick={() => setActiveTab("calls")}
        />

        <NavButton
          active={activeTab === "profile"}
          icon="●"
          label="Profile"
          onClick={() => setActiveTab("profile")}
        />
      </nav>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }) {
  return (
    <button
      className={`nav-button ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <span>{icon}</span>
      <small>{label}</small>
    </button>
  );
}

export default App;
