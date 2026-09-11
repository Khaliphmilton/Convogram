import { useState } from "react";
import { Upload, Video } from "lucide-react";
import { publishShort } from "../lib/shorts_publish";
import "./ShortCreator.css";

export function ShortCreator({ userId, onCreated }) {
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [soundName, setSoundName] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) { event.preventDefault(); if (!file) return setError("Choose a video first."); setPublishing(true); setError(""); try { const short = await publishShort(userId, file, caption, soundName); setFile(null); setCaption(""); setSoundName(""); onCreated?.(short); } catch (err) { setError(err.message || "Short could not be published."); } finally { setPublishing(false); } }
  return <form className="short-creator" onSubmit={submit}><div className="short-creator-icon"><Video /></div><div><span className="eyebrow">CREATE</span><h3>Publish a Short</h3></div><label className="short-file"><Upload size={18} />{file ? file.name : "Choose vertical video"}<input type="file" accept="video/*" hidden onChange={(event) => setFile(event.target.files?.[0] || null)} /></label><input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Caption" /><input value={soundName} onChange={(event) => setSoundName(event.target.value)} placeholder="Sound name (optional)" />{error && <p className="short-error">{error}</p>}<button disabled={publishing}>{publishing ? "Publishing…" : "Publish Short"}</button></form>;
}
