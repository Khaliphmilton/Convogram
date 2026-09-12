import { ArrowLeft, Bookmark, ChevronRight, Edit3, Lock, LogOut, Settings, Shield, User, X } from "lucide-react";

export function ProfileOptionsPage({ profile, onBack, onEditProfile, onSettings, onLogout }) {
  return (
    <section className="page profile-options-page">
      <div className="page-head profile-options-head">
        <button className="profile-options-back" onClick={onBack} aria-label="Back"><ArrowLeft size={19}/></button>
        <div><small>PROFILE</small><h1>Profile options</h1><p>Manage your profile and account from one place.</p></div>
      </div>

      <div className="profile-options-card">
        <div className="profile-options-user">
          <div className="avatar profile-options-avatar">{(profile?.display_name || profile?.username || "C").slice(0,1).toUpperCase()}</div>
          <div><strong>{profile?.display_name || "Convogram User"}</strong><span>@{profile?.username || "user"}</span></div>
        </div>

        <div className="profile-options-group">
          <p>Profile</p>
          <button onClick={onEditProfile}><span className="option-icon"><Edit3 size={18}/></span><span><b>Edit profile</b><small>Photo, name, bio and username</small></span><ChevronRight size={18}/></button>
          <button onClick={onBack}><span className="option-icon"><User size={18}/></span><span><b>View profile</b><small>Posts, Shorts, Moments and saved content</small></span><ChevronRight size={18}/></button>
          <button onClick={onBack}><span className="option-icon"><Bookmark size={18}/></span><span><b>Saved</b><small>Posts you've saved</small></span><ChevronRight size={18}/></button>
        </div>

        <div className="profile-options-group">
          <p>Account</p>
          <button onClick={onSettings}><span className="option-icon"><Settings size={18}/></span><span><b>Settings</b><small>Notifications, appearance and account controls</small></span><ChevronRight size={18}/></button>
          <button onClick={onSettings}><span className="option-icon"><Lock size={18}/></span><span><b>Privacy & security</b><small>Control who can interact with you</small></span><ChevronRight size={18}/></button>
          <button onClick={onSettings}><span className="option-icon"><Shield size={18}/></span><span><b>Account & safety</b><small>Security and account protection</small></span><ChevronRight size={18}/></button>
        </div>

        <button className="profile-options-logout" onClick={onLogout}><LogOut size={18}/> Log out</button>
      </div>
    </section>
  );
}
