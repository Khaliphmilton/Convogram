import { useState } from "react";
import { ArrowLeft, BadgeCheck, Bell, Lock, LogOut, Shield, UserCog, MessageSquare, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { VerificationRequestPage } from "./VerificationRequestPage";

const panelStyle = { marginTop: 12, padding: 18, borderRadius: 16, border: "1px solid rgba(120,140,180,.18)", background: "rgba(255,255,255,.035)" };
const actionStyle = { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(120,140,180,.2)", background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer", marginTop: 10 };

export function SettingsPage({ profile, userId, email, onBack, onEditProfile, onLogout, onProfileUpdated }) {
  const [open, setOpen] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [privateAccount, setPrivateAccount] = useState(!!profile?.is_private);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem("convogram_notifications") !== "off");

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
    if (!email) { setMessage("No account email is available for password recovery."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setMessage(error ? error.message : "Password reset instructions have been sent to your email.");
  };

  const toggleNotifications = () => {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    localStorage.setItem("convogram_notifications", next ? "on" : "off");
    setMessage(next ? "Notifications enabled." : "Notifications disabled on this device.");
  };

  const emailUs = (subject) => { window.location.href = `mailto:khaliphindustries@gmail.com?subject=${encodeURIComponent(subject)}`; };

  const SettingsRow = ({ icon: Icon, title, description, action, children }) => <>
    <button className="settings-row" onClick={action}><Icon size={20}/><span><strong>{title}</strong><small>{description}</small></span><ChevronRight size={18}/></button>
    {children}
  </>;

  if (open === "verification") return <VerificationRequestPage profile={profile} userId={userId} onBack={() => setOpen(null)} />;

  return <section className="settings-page">
    <div className="settings-page-head"><button onClick={onBack} aria-label="Back"><ArrowLeft size={21}/></button><div><small>CONVOGRAM</small><h1>Settings</h1><p>Manage your account and app preferences.</p></div></div>
    {message && <div className="alert" role="status">{message}</div>}
    <div className="settings-card settings-list">
      <SettingsRow icon={UserCog} title="Edit profile" description="Change your name, username, bio and profile photo." action={onEditProfile} />
      <SettingsRow icon={BadgeCheck} title="Request verification" description={profile?.is_verified ? "Your account has the blue verified badge." : profile?.verification_status === "pending" ? "Your verification request is under review." : "Apply for the blue Convogram Verified badge."} action={() => setOpen("verification")} />
      <SettingsRow icon={Shield} title="Privacy & security" description="Control who can see and interact with your account." action={() => setOpen(open === "privacy" ? null : "privacy")} />
      {open === "privacy" && <div style={panelStyle}>
        <strong>Privacy</strong><p>Private accounts require people to follow you before they can see your posts.</p>
        <button style={actionStyle} onClick={togglePrivacy} disabled={saving}><strong>{privateAccount ? "Private account: ON" : "Private account: OFF"}</strong><br/><small>{privateAccount ? "Only approved followers can see your content." : "Anyone can follow you and see public content."}</small></button>
      </div>}
      <SettingsRow icon={Bell} title="Notifications" description="Manage alerts for messages, follows and activity." action={() => setOpen(open === "notifications" ? null : "notifications")} />
      {open === "notifications" && <div style={panelStyle}><strong>Notifications on this device</strong><button style={actionStyle} onClick={toggleNotifications}>{notificationsEnabled ? "Turn notifications off" : "Turn notifications on"}</button></div>}
      <SettingsRow icon={Lock} title="Account security" description="Manage your password and account protection." action={() => setOpen(open === "security" ? null : "security")} />
      {open === "security" && <div style={panelStyle}><strong>Password</strong><p>Send a secure password-reset email to the address on your Convogram account.</p><button style={actionStyle} onClick={resetPassword}>Send password reset email</button></div>}
      <SettingsRow icon={MessageSquare} title="Support & feedback" description="Get help or send feedback to Convogram." action={() => setOpen(open === "support" ? null : "support")} />
      {open === "support" && <div style={panelStyle}><strong>We're here to help.</strong><p>Email the Convogram team directly.</p><button style={actionStyle} onClick={() => emailUs("Convogram Support Request")}>Email support</button><button style={actionStyle} onClick={() => emailUs("Convogram Feedback")}>Send feedback</button></div>}
    </div>
    <button className="settings-logout" onClick={onLogout}><LogOut size={18}/> Log out</button>
  </section>;
}
