import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, UserPlus, Users, X } from "lucide-react";
import { getFollowers, getFollowing } from "../lib/profiles";
import { VerifiedBadge } from "./VerifiedBadge";
import "../profile-fixes.css";

function Avatar({ profile }) {
  return profile?.avatar_url ? (
    <img className="cv-person-avatar" src={profile.avatar_url} alt="" />
  ) : (
    <div className="cv-person-avatar profile-fallback">
      {(profile?.display_name || profile?.username || "C").slice(0, 1).toUpperCase()}
    </div>
  );
}

export function PeoplePage({ userId, mode = "followers", onBack, onOpenProfile }) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const title = mode === "followers" ? "Followers" : "Following";
  const description = mode === "followers" ? "People who follow this profile" : "People this profile follows";

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    setQuery("");
    (async () => {
      try {
        const data = mode === "followers" ? await getFollowers(userId) : await getFollowing(userId);
        if (alive) setPeople((data || []).filter(Boolean));
      } catch (e) {
        if (alive) setError(e.message || `Could not load ${title.toLowerCase()}.`);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId, mode]);

  const filteredPeople = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return people;
    return people.filter((person) =>
      `${person.display_name || ""} ${person.username || ""}`.toLowerCase().includes(term)
    );
  }, [people, query]);

  return (
    <section className="page people-page">
      <div className="people-page-shell">
        <header className="people-page-head">
          <button className="people-back" onClick={onBack} aria-label="Back">
            <ArrowLeft size={19} />
          </button>
          <div className="people-heading">
            <h1>{title}</h1>
            <span>{people.length} {people.length === 1 ? "person" : "people"}</span>
          </div>
          <div className="people-head-spacer" />
        </header>

        <div className="people-intro">
          <div>
            <strong>{title}</strong>
            <p>{description}.</p>
          </div>
        </div>

        {people.length > 0 && (
          <div className="people-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}`}
              aria-label={`Search ${title.toLowerCase()}`}
            />
            {query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={16} /></button>}
          </div>
        )}

        {error && <div className="global-alert">{error}</div>}

        {loading ? (
          <div className="people-loading">
            {[1, 2, 3, 4].map((item) => <div className="people-skeleton" key={item}><span /><i /><b /></div>)}
          </div>
        ) : filteredPeople.length ? (
          <div className="people-list-page">
            {filteredPeople.map((person) => (
              <div className="people-list-item" key={person.id}>
                <button className="people-person" onClick={() => onOpenProfile?.(person)}>
                  <Avatar profile={person} />
                  <span className="people-person-copy">
                    <strong>{person.display_name || person.username || "Convogram User"}<VerifiedBadge verified={person.is_verified} verificationStatus={person.verification_status} size={16}/></strong>
                    <small>@{person.username || "user"}</small>
                  </span>
                </button>
                <button className="people-view" onClick={() => onOpenProfile?.(person)} aria-label={`Open ${person.display_name || person.username || "profile"}`}>
                  <UserPlus size={16} />
                  <span>View</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty people-empty">
            <span className="people-empty-icon"><Users size={25} /></span>
            <h3>{query ? "No matches" : `No ${title.toLowerCase()} yet`}</h3>
            <p>{query ? `No ${title.toLowerCase()} match “${query}”.` : mode === "followers" ? "When people follow this profile, they will appear here." : "Profiles this account follows will appear here."}</p>
            {query && <button onClick={() => setQuery("")}>Clear search</button>}
          </div>
        )}
      </div>
    </section>
  );
}
