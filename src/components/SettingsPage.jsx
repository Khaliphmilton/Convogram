import { ArrowLeft, Bell, Lock, LogOut, Shield, UserCog } from "lucide-react";

export function SettingsPage({ profile, onBack, onEditProfile, onLogout }) {
  return <section className="settings-page">
    <div className="settings-page-head"><button onClick={onBack} aria-label="Back"><ArrowLeft size={21}/></button><div><small>CONVOGRAM</small><h1>Settings</h1><p>Manage your account and privacy.</p></div></div>
    <div className="settings-card settings-list">
      <button className="settings-row" onClick={onEditProfile}><UserCog size={20}/><span><strong>Edit profile</strong><small>Change your name, username, bio and profile photo.</small></span></button>
      <div className="settings-row"><Shield size={20}/><span><strong>Privacy & security</strong><small>Control who can see and interact with your account.</small></span><em>Coming next</em></div>
      <div className="settings-row"><Bell size={20}/><span><strong>Notifications</strong><small>Manage alerts for messages, follows and activity.</small></span><em>Coming next</em></div>
      <div className="settings-row"><Lock size={20}/><span><strong>Account security</strong><small>Manage sign-in and account protection.</small></span><em>Coming next</em></div>
    </div>
    <button className="settings-logout" onClick={onLogout}><LogOut size={18}/> Log out</button>
  </section>;
}
