import fs from "node:fs";

const path = "src/main.jsx";
let source = fs.readFileSync(path, "utf8");

// Keep the Android build self-healing for the login/startup fixes while also
// wiring the unread-message navigation badge into the generated app bundle.
const loadPattern = /  if \(booting\) return[\s\S]*?;\n  if \(!session\) return/;
if (loadPattern.test(source)) {
  source = source.replace(loadPattern, `  if (booting) return <div className="boot" style={{ minHeight: "100vh", background: "#071426", color: "#fff", display: "grid", placeItems: "center", textAlign: "center", padding: "24px" }}><div><img src="/convogram-icon.svg" alt="Convogram" style={{ width: "132px", height: "132px", borderRadius: "32px", display: "block", margin: "0 auto 22px", boxShadow: "0 18px 55px rgba(0,0,0,.35)" }} /><h1 style={{ margin: "0 0 8px", fontSize: "32px", letterSpacing: "-0.04em" }}>Convogram</h1><p style={{ margin: "0 0 18px", color: "rgba(255,255,255,.62)", fontSize: "13px" }}>Everything social, together.</p><small style={{ color: "rgba(255,255,255,.42)", fontWeight: 700, letterSpacing: ".22em" }}>KHALIPH INDUSTRIES</small></div></div>;
  if (!session) return`);
}

const unreadImport = 'import "./lib/message-unread-badge";';
if (!source.includes(unreadImport)) {
  const importMarker = 'import "./index.css";';
  if (!source.includes(importMarker)) throw new Error("Could not locate main stylesheet import.");
  source = source.replace(importMarker, `${importMarker}\n${unreadImport}`);
}

const errorBoundary = `
class ConvogramErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false, message: "" }; }
  static getDerivedStateFromError(error) { return { failed: true, message: error?.message || "Convogram hit an unexpected error." }; }
  componentDidCatch(error) { console.error("Convogram render crash", error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="auth"><div className="auth-card"><div className="brand-row"><div className="brand-mark">C</div><div><b>Convogram</b><span>Everything social, together.</span></div></div><div className="auth-copy"><small>RECOVERED FROM ERROR</small><h1>Convogram needs to reload.</h1><p>{this.state.message}</p></div><button className="primary" onClick={() => window.location.reload()}>Reload Convogram</button></div></div>;
  }
}
`;
if (!source.includes("class ConvogramErrorBoundary")) {
  source = source.replace('import { useEffect, useRef, useState } from "react";', 'import { Component, useEffect, useRef, useState } from "react";');
  source = source.replace('createRoot(document.getElementById("root")).render(<App />);', `${errorBoundary}\ncreateRoot(document.getElementById("root")).render(<ConvogramErrorBoundary><App /></ConvogramErrorBoundary>);`);
}

fs.writeFileSync(path, source);

const finalSource = fs.readFileSync(path, "utf8");
for (const marker of [
  'setTimeout(() => {',
  'Could not start Convogram',
  'Unable to sign in right now',
  'class ConvogramErrorBoundary',
  unreadImport,
]) {
  if (!finalSource.includes(marker)) throw new Error(`Login/navigation marker is missing: ${marker}`);
}
if (finalSource.includes("Loading your social world")) throw new Error("Obsolete startup loading screen is still present.");
console.log("Convogram startup hardening and unread-message navigation badge are ready.");
