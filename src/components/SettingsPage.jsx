import { ArrowLeft, Bell, Lock, LogOut, Shield, UserCog, MessageSquare, Moon } from "lucide-react";

export function SettingsPage({ profile, onBack, onEditProfile, onLogout }) {
  const open = (label) => {
    if (label === "Edit profile") return onEditProfile();
    window.alert(`${label} controls are being connected in Convogram.`);
  };

  return <section className="settings-page">
    <div className="settings-page-head"><button onClick={onBack} aria-label="Back"><ArrowLeft size={21}/></button><div><small>CONVOGRAM</small><h1>Settings</h1><p>Manage your account and app preferences.</p></div></div>
    <div className="settings-card settings-list">
      <button className="settings-row" onClick={() => open("Edit profile")}><UserCog size={20}/><span><strong>Edit profile</strong><small>Change your name, username, bio and profile photo.</small></span></button>
      <button className="settings-row" onClick={() => open("Privacy & security")}><Shield size={20}/><span><strong>Privacy & security</strong><small>Control who can see and interact with your account.</small></span><em>Open</em></button>
      <button className="settings-row" onClick={() => open("Notifications")}><Bell size={20}/><span><strong>Notifications</strong><small>Manage alerts for messages, follows and activity.</small></span><em>Open</em></button>
      <button className="settings-row" onClick={() => open("Account security")}><Lock size={20}/><span><strong>Account security</strong><small>Manage sign-in and account protection.</small></span><em>Open</em></button>
      <button className="settings-row" onClick={() => open("Appearance")}><Moon size={20}/><span><strong>Appearance</strong><small>Choose how Convogram looks on your device.</small></span><em>Open</em></button>
      <button className="settings-row" onClick={() => open("Support & feedback")}><MessageSquare size={20}/><span><strong>Support & feedback</strong><small>Get help or send feedback to Convogram.</small></span><em>Open</em></button>
    </div>
    <button className="settings-logout" onClick={onLogout}><LogOut size={18}/> Log out</button>
  </section>;
}
