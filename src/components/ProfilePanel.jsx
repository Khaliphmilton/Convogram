import { useMemo, useState } from "react";
import { Bookmark, Camera, Grid3X3, Heart, Link2, Lock, MessageCircle, MoreHorizontal, PlaySquare, Plus, Settings, Share2, Sparkles, Tag, UserPlus, Users } from "lucide-react";

const tabs = [
  { id: "posts", label: "Posts", icon: Grid3X3 },
  { id: "shorts", label: "Shorts", icon: PlaySquare },
  { id: "saved", label: "Saved", icon: Bookmark },
  { id: "liked", label: "Liked", icon: Heart },
  { id: "tagged", label: "Tagged", icon: Tag },
];

export function ProfilePanel({ profile, stats, posts = [], onCreatePost, onCreateMoment, onMessage, onEdit, onLogout }) {
  const [active, setActive] = useState("posts");
  const [following, setFollowing] = useState(false);
  const [notice, setNotice] = useState("");

  const ownPosts = useMemo(() => posts.filter((post) => post.user_id === profile?.id), [posts, profile?.id]);
  const mediaPosts = ownPosts.filter((post) => post.media_url);
  const displayPosts = active === "posts" ? ownPosts : active === "liked" ? [] : active === "saved" ? [] : active === "tagged" ? [] : mediaPosts;

  function action(text) {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 2200);
  }

  return (
    <section className="profile-pro">
      <div className="profile-pro-cover">
        <div className="profile-cover-grid" />
        <div className="profile-cover-orb" />
        <button className="profile-cover-more" onClick={() => action("Profile cover options opened")} aria-label="Cover options"><MoreHorizontal size={21} /></button>
      </div>

      <div className="profile-pro-body">
        <div className="profile-pro-head">
          <div className="profile-pro-avatar-wrap">
            <div className="profile-pro-avatar">{(profile?.display_name || profile?.username || "C").charAt(0).toUpperCase()}</div>
            <span className="profile-online" />
          </div>
          <div className="profile-pro-identity">
            <div className="profile-name-row"><h1>{profile?.display_name || "Convogram User"}</h1><span className="verified-badge">✓</span></div>
            <p className="profile-handle">@{profile?.username || "user"}</p>
            <p className="profile-bio-pro">{profile?.bio || "Creating moments, sharing ideas and connecting with my people on Convogram."}</p>
            <div className="profile-meta"><span><Link2 size={14} /> convogram.social/{profile?.username || "user"}</span><span><Sparkles size={14} /> Creator</span></div>
          </div>
          <div className="profile-pro-menu"><button onClick={onEdit}><Settings size={18} /></button><button onClick={() => action("Profile link copied")}><Share2 size={18} /></button><button onClick={() => action("More profile options opened")}><MoreHorizontal size={18} /></button></div>
        </div>

        <div className="profile-stat-row">
          <button onClick={() => setActive("posts")}><strong>{stats?.postsCount || 0}</strong><span>Posts</span></button>
          <button onClick={() => action("Followers list opened")}><strong>{stats?.followersCount || 0}</strong><span>Followers</span></button>
          <button onClick={() => action("Following list opened")}><strong>{stats?.followingCount || 0}</strong><span>Following</span></button>
          <button onClick={() => action("Likes activity opened")}><strong>{ownPosts.reduce((n, p) => n + (p.likes?.[0]?.count || 0), 0)}</strong><span>Likes</span></button>
        </div>

        <div className="profile-primary-actions">
          <button className="profile-follow" onClick={() => { setFollowing((v) => !v); action(following ? "Unfollowed" : "Following"); }}><UserPlus size={17} /> {following ? "Following" : "Follow"}</button>
          <button onClick={onMessage}><MessageCircle size={17} /> Message</button>
          <button onClick={onCreatePost}><Plus size={17} /> Post</button>
          <button onClick={onCreateMoment}><Camera size={17} /> Moment</button>
        </div>

        <div className="profile-highlights">
          <button onClick={() => action("New highlight created")}><span className="highlight-circle add"><Plus size={22} /></span><small>New</small></button>
          <button onClick={() => action("Moments highlight opened")}><span className="highlight-circle"><Sparkles size={22} /></span><small>Moments</small></button>
          <button onClick={() => action("Creator highlight opened")}><span className="highlight-circle"><Camera size={22} /></span><small>Creator</small></button>
          <button onClick={() => action("Community highlight opened")}><span className="highlight-circle"><Users size={22} /></span><small>Community</small></button>
        </div>

        <div className="profile-tools-card">
          <div><span className="tool-kicker">CREATOR CENTER</span><strong>Professional dashboard</strong><p>Insights, content tools, monetization and audience controls.</p></div>
          <button onClick={() => action("Creator dashboard opened")}><Sparkles size={16} /> Open</button>
        </div>

        <div className="profile-tabs">
          {tabs.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? "active" : ""} onClick={() => setActive(id)}><Icon size={18} /><span>{label}</span></button>)}
        </div>

        {active === "saved" && <div className="profile-empty-tab"><Bookmark size={30} /><h2>Saved for later</h2><p>Your private collection of posts, Shorts and Moments.</p></div>}
        {active === "liked" && <div className="profile-empty-tab"><Heart size={30} /><h2>Your likes</h2><p>Posts and Shorts you have liked will appear here.</p></div>}
        {active === "tagged" && <div className="profile-empty-tab"><Tag size={30} /><h2>Tagged</h2><p>Photos and posts that mention you will appear here.</p></div>}
        {active === "shorts" && <div className="profile-empty-tab"><PlaySquare size={30} /><h2>Your Shorts</h2><p>Your published short videos will live here.</p><button onClick={onCreatePost}>Create a Short</button></div>}

        {(active === "posts" || active === "shorts") && <div className="profile-grid">
          {displayPosts.length ? displayPosts.map((post) => <article className="profile-grid-item" key={post.id} onClick={() => action("Post opened")}>
            {post.media_url ? <>{post.media_type === "video" ? <video src={post.media_url} muted /> : <img src={post.media_url} alt={post.caption || "Post"} />}<span className="grid-overlay"><Heart size={15} /> {post.likes?.[0]?.count || 0}</span></> : <div className="grid-text-post"><p>{post.caption}</p></div>}
          </article>) : <div className="profile-empty-grid"><Grid3X3 size={32} /><h2>Share your first post</h2><p>Build your profile with photos, videos and conversations.</p><button onClick={onCreatePost}><Plus size={16} /> Create post</button></div>}
        </div>}

        <div className="profile-private-note"><Lock size={14} /> Saved and liked content is private to you.</div>
        {notice && <div className="profile-toast">{notice}</div>}
        {onLogout && <button className="profile-logout" onClick={onLogout}>Log out</button>}
      </div>
    </section>
  );
}
