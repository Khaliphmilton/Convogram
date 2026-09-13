import fs from "node:fs";

const path = "src/main.jsx";
let source = fs.readFileSync(path, "utf8");

const newLoadProfile = `  async function loadProfile(id, generation = accountGenerationRef.current) { if (!supabase || !id) return; try { const { data, error: profileError } = await supabase.from("profiles").select("*").eq("id", id).single(); if (profileError && profileError.code !== "PGRST116") throw profileError; if (data && isCurrentAccount(id, generation)) setProfile(data); } catch (e) { if (isCurrentAccount(id, generation)) setError(e?.message || "Could not load your profile."); } }`;
const loadProfilePattern = /  async function loadProfile\(id, generation = accountGenerationRef\.current\) \{[\s\S]*?\n  async function refreshForUser/;
if (!loadProfilePattern.test(source)) throw new Error("Could not locate profile loader.");
source = source.replace(loadProfilePattern, `${newLoadProfile}\n  async function refreshForUser`);

const newAuthEffect = `  useEffect(() => { let alive = true; let subscription; async function boot() { if (!supabase) { setError("Supabase is not configured."); setBooting(false); return; } try { const { data, error: sessionError } = await supabase.auth.getSession(); if (sessionError) throw sessionError; if (!alive) return; const next = data.session || null; const generation = ++accountGenerationRef.current; sessionRef.current = next; setSession(next); setEmail(next?.user?.email || ""); if (next) { await loadProfile(next.user.id, generation); await refreshForUser(next.user.id, generation); } else setProfile(null); } catch (e) { if (alive) setError(e?.message || "Could not start Convogram."); } finally { if (alive) setBooting(false); } } boot(); if (supabase) { const auth = supabase.auth.onAuthStateChange((_event, next) => { const generation = ++accountGenerationRef.current; sessionRef.current = next || null; setSession(next || null); setEmail(next?.user?.email || ""); setProfile(null); setViewedProfile(null); setPosts([]); setMoments([]); setShorts([]); setLiked({}); setUnread(0); setStats({ postsCount: 0, followersCount: 0, followingCount: 0 }); setLoadingFeed(false); activeRef.current = "home"; setActiveState("home"); navigationStackRef.current = []; if (next) { setTimeout(() => { if (!alive || !isCurrentAccount(next.user.id, generation)) return; loadProfile(next.user.id, generation); refreshForUser(next.user.id, generation); }, 0); } }); subscription = auth.data?.subscription; } return () => { alive = false; subscription?.unsubscribe(); }; }, []);`;
const authEffectPattern = /  useEffect\(\(\) => \{ let alive = true; let subscription; async function boot\(\) \{[\s\S]*?subscription = auth\.data\?\.subscription; \} return \(\) => \{ alive = false; subscription\?\.unsubscribe\(\); \}; \}, \[\]\);/;
if (!authEffectPattern.test(source)) throw new Error("Could not locate auth startup effect.");
source = source.replace(authEffectPattern, newAuthEffect);

const newAuth = `  async function authenticate(e) { e.preventDefault(); if (!supabase) { setError("Convogram is temporarily unavailable. Please try again."); return; } setError(""); setNotice(""); if (!email.trim() || !password) { setError("Enter your email and password."); return; } try { if (authMode === "login") { const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); if (authError) throw authError; return; } if (!username.trim() || !displayName.trim()) { setError("Enter your name and username."); return; } const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { username: username.trim().toLowerCase(), display_name: displayName.trim() } } }); if (authError) throw authError; if (!data?.session) setNotice("Account created. Check your email to confirm your account."); } catch (e) { setError(e?.message || "Unable to sign in right now. Please try again."); } }`;
const authPattern = /  async function authenticate\(e\) \{[\s\S]*?\n  async function logout/;
if (!authPattern.test(source)) throw new Error("Could not locate authentication handler.");
source = source.replace(authPattern, `${newAuth}\n  async function logout`);

const errorBoundary = `\nclass ConvogramErrorBoundary extends Component {\n  constructor(props) { super(props); this.state = { failed: false, message: "" }; }\n  static getDerivedStateFromError(error) { return { failed: true, message: error?.message || "Convogram hit an unexpected error." }; }\n  componentDidCatch(error) { console.error("Convogram render crash", error); }\n  render() {\n    if (!this.state.failed) return this.props.children;\n    return <div className="auth"><div className="auth-card"><div className="brand-row"><div className="brand-mark">C</div><div><b>Convogram</b><span>Everything social, together.</span></div></div><div className="auth-copy"><small>RECOVERED FROM ERROR</small><h1>Convogram needs to reload.</h1><p>{this.state.message}</p></div><button className="primary" onClick={() => window.location.reload()}>Reload Convogram</button></div></div>;\n  }\n}\n`;
if (!source.includes("class ConvogramErrorBoundary")) {
  source = source.replace('import { useEffect, useRef, useState } from "react";', 'import { Component, useEffect, useRef, useState } from "react";');
  source = source.replace("createRoot(document.getElementById(\"root\")).render(<App />);", `${errorBoundary}\ncreateRoot(document.getElementById(\"root\")).render(<ConvogramErrorBoundary><App /></ConvogramErrorBoundary>);`);
}

fs.writeFileSync(path, source);
console.log("Convogram login hardening and crash recovery applied.");
