import { useState } from "react";
import { ArrowLeft, Bell, Lock, LogOut, Shield, UserCog, MessageSquare, Moon, Sun, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase";

const panelStyle = { marginTop: 12, padding: 18, borderRadius: 16, border: "1px solid rgba(120,140,180,.18)", background: "rgba(255,255,255,.035)" };
const actionStyle = { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(120,140,180,.2)", background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer", marginTop: 10 };

export function SettingsPage({ profile, userId, onBack, onEditProfile, onLogout, onProfileUpdated }) {
  const [open, setOpen] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [privateAccount, setPrivateAccount] = useState(!!profile?.is_private);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem("convogram_notifications") !== "off");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("convogram_theme") !== "light");

  const togglePrivacy = async () => {
    if (!userId || !supabase) return;
    setSaving(true); setMessage("");
    const next = !privateAccount;
    const { data, error } = await supabase.from("profiles").update({ is_private: next }).eq("id", userId).select().single();
    if (error) setMessage(error.message);
    else { setPrivateAccount(next); onProfileUpdated?.(data); setMessage(next ? "Your account is now private." : "Your account is now public."); }
    setSaving(false);
  };

  const resetPassword = async () => {
    const email = profile?.email || "";
    if (!email) { setMessage("Open your email account and use the sign-in recovery option."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setMessage(error ? error.message : "Password reset instructions have been sent to your email.");
  };

  const toggleNotifications = () => {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    localStorage.setItem("convogram_notifications", next ? "on" : "off");
    setMessage(next ? "Notifications enabled." : "Notifications disabled on this device.");
  };

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("convogram_theme", next ? "dark" : "light");
    document.documentElement.dataset.theme = next ? "dark" : "light";
    setMessage(`Appearance set to ${next ? "dark" : "light"}.`);
  };

  const emailUs = (subject) => { window.location.href = `mailto:khaliphindustries@gmail.com?subject=${encodeURIComponent(subject)}`; };

  return <section className="settings-page">
    <div className="settings-page-head"><button onClick={onBack} aria-label="Back"><ArrowLeft size={21}/></button><div><small>CONVOGRAM</small><h1>Settings</h1><p>Manage your account and app preferences.</p></div></div>
    {message && <div className="alert" role="status">{message}</div>}
    <div className="settings-card settings-list">
      <button className="settings-row" onClick={onEditProfile}><UserCog size={20}/><span><strong>Edit profile</strong><small>Change your name, username, bio and profile photo.</small></span><ChevronRight size={18}/></button>
      <button className="settings-row" onClick={() => setOpen(open === "privacy" ? null : "privacy")}><Shield size={20}/><span><strong>Privacy & security</strong><small>Control who can see and interact with your account.</small></span><ChevronRight size={18}/></button>
      {open === "privacy" && <div style={panelStyle}>
        <strong>Privacy</strong><p>Private accounts require people to follow you before they can see your posts.</p>
        <button style={actionStyle} onClick={togglePrivacy} disabled={saving}><strong>{privateAccount ? "Private account: ON" : "Private account: OFF"}</strong><br/><small>{privateAccount ? "Only approved followers can see your content." : "Anyone can follow you and see public content."}</small></button>
      </div>}
      <button className="settings-row" onClick={() => setOpen(open === "notifications" ? null : "notifications")}><Bell size={20}/><span><strong>Notifications</strong><small>Manage alerts for messages, follows and activity.</small></span><ChevronRight size={18}/></button>
      {open === "notifications" && <div style={panelStyle}><strong>Notifications on this device</strong><button style={actionStyle} onClick={toggleNotifications}>{notificationsEnabled ? "Turn notifications off" : "Turn notifications on"}</button></div>}
      <button className="settings-row" onClick={() => setOpen(open === "security" ? null : "security")}><Lock size={20}/><span><strong>Account security</strong><small>Manage your password and account protection.</small></span><ChevronRight size={18}/></button>
      {open === "security" && <div style={panelStyle}><strong>Password</strong><p>Send a secure password-reset email to the address on your Convogram account.</p><button style={actionStyle} onClick={resetPassword}>Send password reset email</button></div>}
      <button className="settings-row" onClick={toggleTheme}><{darkMode ? Moon : Sun} size={20}/><span><strong>Appearance</strong><small>Currently using {darkMode ? "dark" : "light"} mode. Tap to switch.</small></span><ChevronRight size={18}/></button>
      <button className="settings-row" onClick={() => setOpen(open === "support" ? null : "support")}><MessageSquare size={20}/><span><strong>Support & feedback</strong><small>Get help or send feedback to Convogram.</small></span><ChevronRight size={18}/></button>
      {open === "support" && <div style={panelStyle}><strong>We're here to help.</strong><p>Email the Convogram team directly.</p><button style={actionStyle} onClick={() => emailUs("Convogram Support Request")}>Email support</button><button style={actionStyle} onClick={() => emailUs("Convogram Feedback")}>Send feedback</button></div>}
    </div>
    <button className="settings-logout" onClick={onLogout}><LogOut size={18}/> Log out</button>
  </section>;
}
