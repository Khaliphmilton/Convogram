import fs from "node:fs";

const path = "src/main.jsx";
let source = fs.readFileSync(path, "utf8");

const oldLoadProfile = `  async function loadProfile(id, generation = accountGenerationRef.current) { if (!supabase || !id) return; const { data } = await supabase.from("profiles").select("*").eq("id", id).single(); if (data && isCurrentAccount(id, generation)) setProfile(data); }`;
const newLoadProfile = `  async function loadProfile(id, generation = accountGenerationRef.current) { if (!supabase || !id) return; try { const { data, error: profileError } = await supabase.from("profiles").select("*").eq("id", id).single(); if (profileError && profileError.code !== "PGRST116") throw profileError; if (data && isCurrentAccount(id, generation)) setProfile(data); } catch (e) { if (isCurrentAccount(id, generation)) setError(e?.message || "Could not load your profile."); } }`;

const oldAuth = `  async function authenticate(e) { e.preventDefault(); setError(""); setNotice(""); if (!email || !password) { setError("Enter your email and password."); return; } if (authMode === "login") { const { error: authError } = await supabase.auth.signInWithPassword({ email, password }); if (authError) setError(authError.message); return; } if (!username.trim() || !displayName.trim()) { setError("Enter your name and username."); return; } const { data, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { username: username.trim().toLowerCase(), display_name: displayName.trim() } } }); if (authError) setError(authError.message); else if (!data.session) setNotice("Account created. Check your email to confirm your account."); }`;
const newAuth = `  async function authenticate(e) { e.preventDefault(); if (!supabase) { setError("Convogram is temporarily unavailable. Please try again."); return; } setError(""); setNotice(""); if (!email.trim() || !password) { setError("Enter your email and password."); return; } try { if (authMode === "login") { const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); if (authError) throw authError; return; } if (!username.trim() || !displayName.trim()) { setError("Enter your name and username."); return; } const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { username: username.trim().toLowerCase(), display_name: displayName.trim() } } }); if (authError) throw authError; if (!data?.session) setNotice("Account created. Check your email to confirm your account."); } catch (e) { setError(e?.message || "Unable to sign in right now. Please try again."); } }`;

if (source.includes(oldLoadProfile)) source = source.replace(oldLoadProfile, newLoadProfile);
if (source.includes(oldAuth)) source = source.replace(oldAuth, newAuth);

fs.writeFileSync(path, source);
console.log("Convogram login hardening applied.");
