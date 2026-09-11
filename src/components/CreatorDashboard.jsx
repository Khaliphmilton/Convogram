import { useEffect, useState } from "react";
import { BarChart3, Coins, Heart, MessageCircle, Users } from "lucide-react";
import { getCreatorDashboard, getCreatorEngagement } from "../lib/creator";
import { getCreatorSummary } from "../lib/creator_tools";
import "./CreatorDashboard.css";

export function CreatorDashboard({ userId }) {
  const [stats, setStats] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { if (!userId) return; Promise.all([getCreatorDashboard(userId), getCreatorEngagement(userId), getCreatorSummary(userId)]).then(([a,b,c]) => { setStats(a); setEngagement(b); setEarnings(c); }).catch((err) => setError(err.message || "Unable to load creator analytics.")); }, [userId]);
  if (error) return <div className="creator-dashboard-error">{error}</div>;
  if (!stats) return <div className="creator-dashboard-loading">Loading creator dashboard…</div>;
  return <section className="creator-dashboard"><div className="creator-dashboard-head"><div><span className="eyebrow">CREATOR STUDIO</span><h2>Your performance</h2></div><BarChart3 size={22} /></div><div className="creator-metrics"><div><Users /><strong>{stats.followersCount || 0}</strong><span>Followers</span></div><div><Heart /><strong>{engagement?.totalLikes || 0}</strong><span>Likes</span></div><div><MessageCircle /><strong>{engagement?.totalComments || 0}</strong><span>Comments</span></div><div><Coins /><strong>{((earnings?.totalCents || 0) / 100).toFixed(2)}</strong><span>Earnings</span></div></div></section>;
}
