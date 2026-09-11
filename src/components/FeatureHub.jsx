import { useState } from "react";
import { BarChart3, Compass, Radio, Search, Shield, Smartphone } from "lucide-react";
import { DiscoveryPanel } from "./DiscoveryPanel";
import { CreatorDashboard } from "./CreatorDashboard";
import { createLivestream, startLivestream, endLivestream } from "../lib/livestream";
import { requestWebPushPermission } from "../lib/push";
import "./FeatureHub.css";

export function FeatureHub({ userId }) {
  const [view, setView] = useState("discover");
  const [stream, setStream] = useState(null);
  const [title, setTitle] = useState("");
  const [pushState, setPushState] = useState("");
  async function enablePush() { const result = await requestWebPushPermission(); setPushState(result.permission === "granted" ? "Notifications enabled" : `Notifications: ${result.permission}`); }
  async function goLive() { if (!title.trim()) return; const created = await createLivestream(userId, title); const live = await startLivestream(created.id, `convogram-${created.id}`); setStream(live); }
  async function stopLive() { if (!stream) return; await endLivestream(stream.id); setStream(null); }
  return <section className="feature-hub"><div className="feature-tabs"><button className={view === "discover" ? "active" : ""} onClick={() => setView("discover")}><Compass /> Discover</button><button className={view === "creator" ? "active" : ""} onClick={() => setView("creator")}><BarChart3 /> Creator</button><button className={view === "live" ? "active" : ""} onClick={() => setView("live")}><Radio /> Live</button><button className={view === "tools" ? "active" : ""} onClick={() => setView("tools")}><Shield /> Tools</button></div>{view === "discover" && <DiscoveryPanel userId={userId} />}{view === "creator" && <CreatorDashboard userId={userId} />}{view === "live" && <div className="feature-card"><Radio /><h2>Go Live</h2><p>Start a Convogram livestream room.</p>{stream ? <><strong>Live now: {stream.title}</strong><button onClick={stopLive}>End livestream</button></> : <><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Livestream title" /><button onClick={goLive}>Start Live</button></>}</div>}{view === "tools" && <div className="feature-tools"><button onClick={enablePush}><Smartphone /> Enable notifications</button>{pushState && <span>{pushState}</span>}<div><Search size={18} /><strong>Global search, creator analytics and safety foundations are connected.</strong></div></div>}</section>;
}
