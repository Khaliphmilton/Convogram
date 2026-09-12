import { ArrowLeft, Bookmark, ChevronRight, Edit3, Lock, LogOut, Mail, Settings, Shield, User } from "lucide-react";
import "./ProfileOptionsPage.css";

export function ProfileOptionsPage({ profile, onBack, onEditProfile, onSettings, onLogout }) {
  const displayName = profile?.display_name || "Convogram User";
  const username = profile?.username || "user";
  const initial = displayName.slice(0, 1).toUpperCase();

  const emailUs = (subject) => {
    window.location.href = `mailto:khaliphindustries@gmail.com?subject=${encodeURIComponent(subject)}`;
  };

  return (
    <section className="page profile-options-page">
      <header className="profile-options-head">
        <button className="profile-options-back" onClick={onBack} aria-label="Back"><ArrowLeft size={20} /></button>
        <div><small>ACCOUNT</small><h1>Menu</h1></div>
      </header>

      <div className="profile-options-user">
        <div className="avatar profile-options-avatar">{initial}</div>
        <div className="profile-options-identity"><strong>{displayName}</strong><span>@{username}</span></div>
      </div>

      <div className="profile-options-sections">
        <section className="profile-options-group" aria-labelledby="profile-menu-heading">
          <h2 id="profile-menu-heading">Profile</h2>
          <div className="profile-options-list">
            <button className="profile-option-row" onClick={onEditProfile}><span className="option-icon"><Edit3 size={19} /></span><span className="option-copy"><b>Edit profile</b><small>Photo, name, bio and username</small></span><ChevronRight className="option-chevron" size={19} /></button>
            <button className="profile-option-row" onClick={onBack}><span className="option-icon"><User size={19} /></span><span className="option-copy"><b>View profile</b><small>Posts, Shorts, Moments and saved content</small></span><ChevronRight className="option-chevron" size={19} /></button>
            <button className="profile-option-row" onClick={onBack}><span className="option-icon"><Bookmark size={19} /></span><span className="option-copy"><b>Saved</b><small>Posts you have saved</small></span><ChevronRight className="option-chevron" size={19} /></button>
          </div>
        </section>

        <section className="profile-options-group" aria-labelledby="account-menu-heading">
          <h2 id="account-menu-heading">Account</h2>
          <div className="profile-options-list">
            <button className="profile-option-row" onClick={onSettings}><span className="option-icon"><Settings size={19} /></span><span className="option-copy"><b>Settings</b><small>Notifications, appearance and account controls</small></span><ChevronRight className="option-chevron" size={19} /></button>
            <button className="profile-option-row" onClick={onSettings}><span className="option-icon"><Lock size={19} /></span><span className="option-copy"><b>Privacy &amp; security</b><small>Control who can interact with you</small></span><ChevronRight className="option-chevron" size={19} /></button>
            <button className="profile-option-row" onClick={onSettings}><span className="option-icon"><Shield size={19} /></span><span className="option-copy"><b>Account &amp; safety</b><small>Security and account protection</small></span><ChevronRight className="option-chevron" size={19} /></button>
          </div>
        </section>

        <section className="profile-options-group" aria-labelledby="help-menu-heading">
          <h2 id="help-menu-heading">Help</h2>
          <div className="profile-options-list">
            <button className="profile-option-row" onClick={() => emailUs("Convogram Support Request")}><span className="option-icon"><Mail size={19} /></span><span className="option-copy"><b>Support</b><small>Email Convogram support</small></span><ChevronRight className="option-chevron" size={19} /></button>
            <button className="profile-option-row" onClick={() => emailUs("Convogram Feedback")}><span className="option-icon"><Mail size={19} /></span><span className="option-copy"><b>Feedback</b><small>Send feedback or report a problem</small></span><ChevronRight className="option-chevron" size={19} /></button>
          </div>
        </section>
      </div>

      <button className="profile-options-logout" onClick={onLogout}><LogOut size={19} /><span>Log out</span></button>
    </section>
  );
}
