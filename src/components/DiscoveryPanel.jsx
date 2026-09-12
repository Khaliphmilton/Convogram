import { useEffect, useState } from "react";
import { Compass, Search, UserPlus, Users } from "lucide-react";
import { searchCommunities, searchPosts, searchUsers, getRecommendedProfiles } from "../lib/discovery";
import { followUser, isFollowing, unfollowUser } from "../lib/follows";
import { VerifiedBadge } from "./VerifiedBadge";
import "./DiscoveryPanel.css";

export function DiscoveryPanel({ userId, initialQuery = "" }) {
  const [query, setQuery] = useState(initialQuery);
  const [users, setUsers] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [posts, setPosts] = useState([]);
  const [following, setFollowing] = useState({});
  const [loading, setLoading] = useState(false);

  async function runSearch(term = query) {
    const value = term.trim();
    setLoading(true);
    try {
      if (!value) {
        const recommendations = await getRecommendedProfiles(userId, 12);
        setUsers(recommendations);
        setCommunities([]); setPosts([]);
        const states = {};
        await Promise.all(recommendations.map(async (profile) => { states[profile.id] = await isFollowing(userId, profile.id); }));
        setFollowing(states);
      } else {
        const [foundUsers, foundCommunities, foundPosts] = await Promise.all([searchUsers(value), searchCommunities(value), searchPosts(value)]);
        setUsers(foundUsers); setCommunities(foundCommunities); setPosts(foundPosts);
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { runSearch(initialQuery); }, [userId]);

  async function toggleFollow(profile) {
    const current = !!following[profile.id];
    if (current) await unfollowUser(userId, profile.id); else await followUser(userId, profile.id);
    setFollowing((state) => ({ ...state, [profile.id]: !current }));
  }

  return <section className="discovery-panel"><div className="discovery-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") runSearch(); }} placeholder="Search people, posts, communities" /><button onClick={() => runSearch()}><Compass size={17} /></button></div>{loading ? <div className="discovery-empty">Searching Convogram…</div> : <>
    <div className="discovery-section"><div className="discovery-heading"><Users size={18} /><h3>{query ? "People" : "People you may know"}</h3></div>{users.length ? <div className="discovery-grid">{users.map((profile) => <article className="discovery-card" key={profile.id}><div className="discovery-avatar">{(profile.display_name || profile.username || "C").charAt(0).toUpperCase()}</div><strong>{profile.display_name || profile.username}<VerifiedBadge verified={profile.is_verified} verificationStatus={profile.verification_status} size={15}/></strong><span>@{profile.username}</span><button onClick={() => toggleFollow(profile)}><UserPlus size={15} />{following[profile.id] ? "Following" : "Follow"}</button></article>)}</div> : <p className="discovery-muted">No people found.</p>}</div>
    {query && <div className="discovery-section"><div className="discovery-heading"><Compass size={18} /><h3>Communities</h3></div>{communities.length ? communities.map((community) => <div className="discovery-result" key={community.id}><strong>{community.name}</strong><span>{community.description || "Community"}</span></div>) : <p className="discovery-muted">No communities found.</p>}</div>}
    {query && <div className="discovery-section"><div className="discovery-heading"><Search size={18} /><h3>Posts</h3></div>{posts.length ? posts.slice(0, 10).map((post) => <div className="discovery-result" key={post.id}><strong>@{post.profiles?.username || "user"}<VerifiedBadge verified={post.profiles?.is_verified} verificationStatus={post.profiles?.verification_status} size={14}/></strong><span>{post.caption || "Media post"}</span></div>) : <p className="discovery-muted">No posts found.</p>}</div>}
  </>}</section>;
}
