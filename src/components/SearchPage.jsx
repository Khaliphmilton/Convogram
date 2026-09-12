import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, UserPlus, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { VerifiedBadge } from "./VerifiedBadge";
import "./SearchPage.css";

export function SearchPage({ currentUserId, onBack, onOpenProfile }) {
  const [profiles, setProfiles] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio, is_verified, verification_status")
        .order("display_name", { ascending: true, nullsFirst: false })
        .order("username", { ascending: true });
      if (!alive) return;
      if (err) setError(err.message || "Could not load accounts.");
      else setProfiles(data || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => `${p.display_name || ""} ${p.username || ""} ${p.bio || ""}`.toLowerCase().includes(q));
  }, [profiles, query]);

  return <section className="search-page">
    <div className="search-page-head">
      <button className="search-back" onClick={onBack}><ArrowLeft size={20} /></button>
      <div><small>DISCOVER PEOPLE</small><h1>Search</h1></div>
    </div>
    <div className="account-search-box"><Search size={19}/><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search accounts by name or username" />{query && <button onClick={() => setQuery("")}><X size={17}/></button>}</div>
    {error && <div className="search-error">{error}</div>}
    <div className="accounts-head"><strong>{query ? `${filtered.length} result${filtered.length === 1 ? "" : "s"}` : "All accounts"}</strong><span>{profiles.length} created account{profiles.length === 1 ? "" : "s"}</span></div>
    <div className="accounts-list">{loading ? <div className="search-empty">Loading accounts…</div> : filtered.length ? filtered.map((person) => <button className="account-row" key={person.id} onClick={() => onOpenProfile?.(person)}><div className="account-avatar">{person.avatar_url ? <img src={person.avatar_url} alt=""/> : <span>{(person.display_name || person.username || "C").slice(0,1).toUpperCase()}</span>}</div><div className="account-info"><strong>{person.display_name || person.username || "Convogram User"}<VerifiedBadge verified={person.is_verified} verificationStatus={person.verification_status} size={16}/></strong><span>@{person.username || "user"}</span>{person.bio && <small>{person.bio}</small>}</div>{person.id !== currentUserId && <UserPlus size={18}/>}</button>) : <div className="search-empty"><Search size={30}/><h2>No accounts found</h2><p>Try another name or username.</p></div>}</div>
  </section>;
}
