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

const bootScreenPattern = /  if \(booting\) return [\s\S]*?;\n  if \(!session\) return/;
const brandedBoot = `  if (booting) return <div className="boot" style={{ minHeight: "100vh", background: "#071426", color: "#fff", display: "grid", placeItems: "center", textAlign: "center", padding: "24px" }}><div><img src="/convogram-icon.svg" alt="Convogram" style={{ width: "132px", height: "132px", borderRadius: "32px", display: "block", margin: "0 auto 22px", boxShadow: "0 18px 55px rgba(0,0,0,.35)" }} /><h1 style={{ margin: "0 0 8px", fontSize: "32px", letterSpacing: "-0.04em" }}>Convogram</h1><p style={{ margin: "0 0 18px", color: "rgba(255,255,255,.62)", fontSize: "13px" }}>Everything social, together.</p><small style={{ color: "rgba(255,255,255,.42)", fontWeight: 700, letterSpacing: ".22em" }}>KHALIPH INDUSTRIES</small></div></div>;
  if (!session) return`;
if (!bootScreenPattern.test(source)) throw new Error("Could not locate the startup splash screen.");
source = source.replace(bootScreenPattern, brandedBoot);

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
  source = source.replace("createRoot(document.getElementById(\"root\")).render(<App />);", `${errorBoundary}\ncreateRoot(document.getElementById(\"root\")).render(<ConvogramErrorBoundary><App /></ConvogramErrorBoundary>);`);
}

fs.writeFileSync(path, source);

// The Android build already runs this script before the web build.
// Patch only the emoji picker so it replaces the Android keyboard region when open.
const emojiPath = "src/components/MessagesPanelOriginal.jsx";
let emoji = fs.readFileSync(emojiPath, "utf8");
const emojiState = 'const [replyingTo, setReplyingTo] = useState(null), [menuMessage, setMenuMessage] = useState(null), [editingMessage, setEditingMessage] = useState(null), [reactionOpen, setReactionOpen] = useState(false), [swipe, setSwipe] = useState({ id: null, x: 0 });';
if (!emoji.includes('const [emojiOpen, setEmojiOpen]')) {
  if (!emoji.includes(emojiState)) throw new Error("Could not locate chat state for emoji picker.");
  emoji = emoji.replace(emojiState, emojiState + '\n  const [emojiOpen, setEmojiOpen] = useState(false);', 1);
}
if (!emoji.includes('const toggleEmojiPicker')) {
  const pinMarker = '  const scrollToPinned = () => {';
  if (!emoji.includes(pinMarker)) throw new Error("Could not locate pinned-message helper.");
  const helper = '  const toggleEmojiPicker = () => { setEmojiOpen(open => { const next = !open; requestAnimationFrame(() => { if (next) document.activeElement?.blur(); else composerRef.current?.focus(); }); return next; }); };\n';
  emoji = emoji.replace(pinMarker, helper + pinMarker, 1);
}
if (!emoji.includes('from "emoji-picker-react"')) {
  const importMarker = 'import { VerifiedBadge } from "./VerifiedBadge";';
  if (!emoji.includes(importMarker)) throw new Error("Could not locate message-panel imports.");
  emoji = emoji.replace(importMarker, importMarker + '\nimport EmojiPicker from "emoji-picker-react";', 1);
}
const pickerStart = emoji.indexOf('<EmojiPicker');
if (pickerStart >= 0) {
  const pickerEnd = emoji.indexOf('/>', pickerStart);
  if (pickerEnd < 0) throw new Error("Could not locate emoji picker closing tag.");
  const picker = '''<EmojiPicker
          onEmojiClick={(emojiData) => { setDraft(value => value + emojiData.emoji); requestAnimationFrame(() => composerRef.current?.focus()); }}
          width="100%"
          height="100%"
          theme="dark"
          previewConfig={{ showPreview: false }}
          searchDisabled={false}
          skinTonesDisabled={false}
          lazyLoadEmojis={true}
        />''';
  const replacement = '{emojiOpen && <div className="convogram-emoji-keyboard-replacement" role="dialog" aria-label="Emoji picker">' + picker + '</div>}';
  emoji = emoji.slice(0, pickerStart) + replacement + emoji.slice(pickerEnd + 2);
}
if (!emoji.includes('aria-label="Open emoji picker"')) {
  const imagePos = emoji.indexOf('<ImagePlus');
  if (imagePos < 0) throw new Error("Could not locate media button for emoji toggle.");
  const buttonStart = emoji.lastIndexOf('<button', imagePos);
  if (buttonStart < 0) throw new Error("Could not locate media button start.");
  const button = '<button type="button" className="convogram-stable-icon" aria-label="Open emoji picker" aria-pressed={emojiOpen} onClick={toggleEmojiPicker}><Smile size={20}/></button>';
  emoji = emoji.slice(0, buttonStart) + button + emoji.slice(buttonStart);
}
fs.writeFileSync(emojiPath, emoji);

const cssPath = "src/components/MessagesPanel.css";
let css = fs.readFileSync(cssPath, "utf8");
if (!css.includes('.convogram-emoji-keyboard-replacement')) {
  css += `\n/* Convogram emoji picker replaces the Android keyboard region while open. */
.convogram-stable-chat .convogram-emoji-keyboard-replacement{position:fixed;left:0;right:0;bottom:calc(68px + env(safe-area-inset-bottom,0px));height:min(43vh,380px);min-height:270px;z-index:80;background:#0b0b0b;border-top:1px solid #202020;overflow:hidden;box-shadow:0 -8px 28px rgba(0,0,0,.38)}
.convogram-stable-chat .convogram-emoji-keyboard-replacement .EmojiPickerReact{width:100%!important;height:100%!important;background:#0b0b0b!important;border:0!important;border-radius:0!important;--epr-bg-color:#0b0b0b;--epr-category-label-bg-color:#0b0b0b;--epr-picker-border-color:#202020;--epr-search-input-bg-color:#111;--epr-search-input-border-color:#252525;--epr-search-input-text-color:#fff;--epr-text-color:#fff;--epr-category-icon-active-color:#20a4f3;--epr-hover-bg-color:#151515;--epr-focus-bg-color:#151515}
.convogram-stable-chat .convogram-emoji-keyboard-replacement .epr-search-container{background:#0b0b0b!important;padding:10px!important}.convogram-stable-chat .convogram-emoji-keyboard-replacement .epr-search-container input{background:#111!important;border:1px solid #252525!important;color:#fff!important;border-radius:20px!important}.convogram-stable-chat .convogram-emoji-keyboard-replacement .epr-category-nav{background:#0b0b0b!important;border-top:1px solid #202020!important}.convogram-stable-chat .convogram-emoji-keyboard-replacement .epr-category-nav button{color:#aaa!important;background:transparent!important}.convogram-stable-chat .convogram-emoji-keyboard-replacement .epr-category-nav button.epr-active{color:#20a4f3!important;background:#151515!important}
@media(max-width:760px){.convogram-stable-chat .convogram-emoji-keyboard-replacement{bottom:calc(68px + env(safe-area-inset-bottom,0px));height:min(44vh,380px);min-height:260px}}\n`;
}
fs.writeFileSync(cssPath, css);
console.log("Convogram login hardening, crash recovery, and emoji keyboard-area patch applied.");
