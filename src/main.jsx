import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

function App() {
  const [activeTab, setActiveTab] = useState("Home");

  const tabs = ["Home", "Chats", "Shorts", "Calls", "Profile"];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo">C</div>
          <span>Convogram</span>
        </div>

        <button className="iconButton">🔔</button>
      </header>

      <main className="content">
        {activeTab === "Home" && (
          <>
            <section className="welcome">
              <h1>Welcome to Convogram 👋</h1>
              <p>Connect. Chat. Share. Discover.</p>
            </section>

            <section className="stories">
              <h2>Stories</h2>

              <div className="storyRow">
                <div className="story addStory">
                  <strong>+</strong>
                  <span>Your story</span>
                </div>

                <div className="story">
                  <div className="storyAvatar">A</div>
                  <span>Alex</span>
                </div>

                <div className="story">
                  <div className="storyAvatar">M</div>
                  <span>Mary</span>
                </div>

                <div className="story">
                  <div className="storyAvatar">J</div>
                  <span>James</span>
                </div>
              </div>
            </section>

            <section className="feed">
              <h2>Feed</h2>

              <article className="post">
                <div className="postHeader">
                  <div className="avatar">K</div>

                  <div>
                    <strong>Convogram</strong>
                    <small>@convogram · Just now</small>
                  </div>
                </div>

                <p>
                  Welcome to Convogram — one place for messages, calls,
                  stories and short videos.
                </p>

                <div className="postActions">
                  <button>♡ Like</button>
                  <button>💬 Comment</button>
                  <button>↗ Share</button>
                </div>
              </article>
            </section>
          </>
        )}

        {activeTab === "Chats" && (
          <section className="page">
            <h1>Chats</h1>
            <p>Your conversations will appear here.</p>
          </section>
        )}

        {activeTab === "Shorts" && (
          <section className="page">
            <h1>Shorts</h1>
            <p>Discover short videos on Convogram.</p>
          </section>
        )}

        {activeTab === "Calls" && (
          <section className="page">
            <h1>Calls</h1>
            <p>Your voice and video calls will appear here.</p>
          </section>
        )}

        {activeTab === "Profile" && (
          <section className="page">
            <h1>Profile</h1>
            <p>Your Convogram profile will appear here.</p>
          </section>
        )}
      </main>

      <nav className="bottomNav">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "active" : ""}
            onClick={() => setActiveTab(tab)}
          >
            <span>
              {tab === "Home" && "⌂"}
              {tab === "Chats" && "◌"}
              {tab === "Shorts" && "▶"}
              {tab === "Calls" && "☎"}
              {tab === "Profile" && "●"}
            </span>
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
