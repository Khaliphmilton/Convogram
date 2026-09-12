import { useEffect, useState } from "react";
import { ArrowLeft, UserPlus, Users } from "lucide-react";
import { getFollowers, getFollowing } from "../lib/profiles";
import "../profile-fixes.css";

function Avatar({ profile }) {
  return profile?.avatar_url ? <img className="cv-person-avatar" src={profile.avatar_url} alt="" /> : <div className="cv-person-avatar profile-fallback">{(profile?.display_name || profile?.username || "C").slice(0, 1).toUpperCase()}</div>;
}

export function PeoplePage({ userId, mode = "followers", onBack, onOpenProfile }) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const title = mode === "followers" ? "Followers" : "Following";

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const data = mode === "followers" ? await getFollowers(userId) : await getFollowing(userId);
        if (alive) setPeople(data || []);
      } catch (e) {
        if (alive) setError(e.message || `Could not load ${title.toLowerCase()}.`);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId, mode]);

  return <section className="page people-page">
    <div className="page-head">
      <div><small>PEOPLE</small><h1>{title}</h1><p>{mode === "followers" ? "People who follow this profile." : "People this profile follows."}</p></div>
      <button onClick={onBack}><ArrowLeft size={18} /> Back</button>
    </div>
    {error && <div className="global-alert">{error}</div>}
    {loading ? <div className="empty">Loading {title.toLowerCase()}…</div> : people.length ? <div className="people-list-page">
      {people.map((person) => <button className="people-list-item" key={person.id} onClick={() => onOpenProfile?.(person)}>
        <Avatar profile={person} />
        <span><strong>{person.display_name || person.username || "Convogram User"}</strong><small>@{person.username || "user"}</small></span>
        <UserPlus size={18} />
      </button>)}
    </div> : <div className="empty"><Users size={30}/><h3>No {title.toLowerCase()} yet.</h3><p>{mode === "followers" ? "When people follow this profile, they will appear here." : "Profiles you follow will appear here."}</p></div>}
  </section>;
}
