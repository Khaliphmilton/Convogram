import { useEffect, useState } from "react";
import { ArrowLeft, Bookmark, ChevronRight, Edit3, Lock, LogOut, Mail, Settings, Shield, User, UsersRound, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import "./ProfileOptionsPage.css";

const SAVED_ACCOUNTS_KEY = "convogram_saved_accounts";
function readSavedAccounts() { try { return JSON.parse(localStorage.getItem(SAVED_ACCOUNTS_KEY) || "[]"); } catch { return []; } }
function saveAccount(account) { if (!account?.id) return; const current = readSavedAccounts().filter((item) => item.id !== account.id); localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify([{ id: account.id, display_name: account.display_name || "Convogram User", username: account.username || "user", email: account.email || "" }, ...current].slice(0, 5))); }

export function ProfileOptionsPage({ profile, email, onBack, onViewProfile, onSaved, onEditProfile, onSettings, onLogout }) {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [switchPassword, setSwitchPassword] = useState("");
  const [switchError, setSwitchError] = useState("");
  const [switching, setSwitching] = useState(false);
  const displayName = profile?.display_name || "Convogram User";
  const username = profile?.username || "user";
  const initial = displayName.slice(0, 1).toUpperCase();
  useEffect(() => { const account = { id: profile?.id, display_name: displayName, username, email: email || "" }; if (account.id) saveAccount(account); setSavedAccounts(readSavedAccounts()); }, [profile?.id, displayName, username, email]);
  const emailUs = (subject) => { window.location.href = `mailto:khaliphindustries@gmail.com?subject=${encodeURIComponent(subject)}`; };
  function openSwitcher() { setSavedAccounts(readSavedAccounts()); setSelectedAccount(null); setSwitchPassword(""); setSwitchError(""); setSwitcherOpen(true); }
  function chooseAccount(account) { if (account.id === profile?.id) { setSwitcherOpen(false); return; } setSelectedAccount(account); setSwitchPassword(""); setSwitchError(""); }
  async function switchToAccount() {
    if (!selectedAccount?.email || !switchPassword) return;
    setSwitching(true); setSwitchError("");
    const { error } = await supabase.auth.signInWithPassword({ email: selectedAccount.email, password: switchPassword });
    if (error) setSwitchError(error.message || "Could not switch accounts."); else { saveAccount(selectedAccount); setSwitcherOpen(false); }
    setSwitching(false);
  }
  return <section className="page profile-options-page">
    <header className="profile-options-head"><button className="profile-options-back" onClick={onBack} aria-label="Back"><ArrowLeft size={20} /></button><div><small>ACCOUNT</small><h1>Menu</h1></div></header>
    <div className="profile-options-user"><div className="avatar profile-options-avatar">{initial}</div><div className="profile-options-identity"><strong>{displayName}</strong><span>@{username}</span></div></div>
    <div className="profile-options-sections">
      <section className="profile-options-group"><h2>Profile</h2><div className="profile-options-list">
        <button className="profile-option-row" onClick={onEditProfile}><span className="option-icon"><Edit3 size={19} /></span><span className="option-copy"><b>Edit profile</b><small>Photo, name, bio and username</small></span><ChevronRight className="option-chevron" size={19} /></button>
        <button className="profile-option-row" onClick={onViewProfile}><span className="option-icon"><User size={19} /></span><span className="option-copy"><b>View profile</b><small>Posts, Shorts, Moments and profile content</small></span><ChevronRight className="option-chevron" size={19} /></button>
        <button className="profile-option-row" onClick={onSaved}><span className="option-icon"><Bookmark size={19} /></span><span className="option-copy"><b>Saved</b><small>Open the posts you have saved</small></span><ChevronRight className="option-chevron" size={19} /></button>
      </div></section>
      <section className="profile-options-group"><h2>Account</h2><div className="profile-options-list">
        <button className="profile-option-row" onClick={openSwitcher}><span className="option-icon"><UsersRound size={19} /></span><span className="option-copy"><b>Switch account</b><small>Keep up to 5 accounts saved on this device</small></span><ChevronRight className="option-chevron" size={19} /></button>
        <button className="profile-option-row" onClick={onSettings}><span className="option-icon"><Settings size={19} /></span><span className="option-copy"><b>Settings</b><small>Notifications, appearance and account controls</small></span><ChevronRight className="option-chevron" size={19} /></button>
        <button className="profile-option-row" onClick={onSettings}><span className="option-icon"><Lock size={19} /></span><span className="option-copy"><b>Privacy &amp; security</b><small>Control who can interact with you</small></span><ChevronRight className="option-chevron" size={19} /></button>
        <button className="profile-option-row" onClick={onSettings}><span className="option-icon"><Shield size={19} /></span><span className="option-copy"><b>Account &amp; safety</b><small>Security and account protection</small></span><ChevronRight className="option-chevron" size={19} /></button>
      </div></section>
      <section className="profile-options-group"><h2>Help</h2><div className="profile-options-list">
        <button className="profile-option-row" onClick={() => emailUs("Convogram Support Request")}><span className="option-icon"><Mail size={19} /></span><span className="option-copy"><b>Support</b><small>Email Convogram support</small></span><ChevronRight className="option-chevron" size={19} /></button>
        <button className="profile-option-row" onClick={() => emailUs("Convogram Feedback")}><span className="option-icon"><Mail size={19} /></span><span className="option-copy"><b>Feedback</b><small>Send feedback or report a problem</small></span><ChevronRight className="option-chevron" size={19} /></button>
      </div></section>
    </div>
    <button className="profile-options-logout" onClick={onLogout}><LogOut size={19} /><span>Log out</span></button>
    {switcherOpen && <div className="account-switch-backdrop" onClick={() => setSwitcherOpen(false)}><div className="account-switcher" onClick={(e) => e.stopPropagation()}>
      <div className="account-switch-head"><div><small>ACCOUNTS</small><h2>Switch account</h2></div><button onClick={() => setSwitcherOpen(false)} aria-label="Close"><X size={19}/></button></div>
      <div className="saved-account-list">{savedAccounts.map((account) => <button key={account.id} className={`saved-account ${account.id === profile?.id ? "current" : ""}`} onClick={() => chooseAccount(account)}><span className="avatar saved-account-avatar">{(account.display_name || "C").slice(0,1).toUpperCase()}</span><span><b>{account.display_name}</b><small>@{account.username}</small></span>{account.id === profile?.id && <em>Current</em>}</button>)}</div>
      {selectedAccount && <div className="switch-password"><label>Enter password for @{selectedAccount.username}<input autoFocus type="password" value={switchPassword} onChange={(e) => setSwitchPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") switchToAccount(); }} placeholder="Password" /></label>{switchError && <div className="switch-error">{switchError}</div>}<button className="primary" disabled={switching || !switchPassword} onClick={switchToAccount}>{switching ? "Switching…" : "Switch account"}</button></div>}
      <button className="add-account-button" onClick={() => { setSwitcherOpen(false); onLogout(); }}><span className="option-icon"><User size={17}/></span><span><b>Add account</b><small>Log in to another Convogram account</small></span><ChevronRight size={18}/></button>
      <p className="account-switch-note">Saved account names and login emails stay on this device. Convogram never saves your passwords.</p>
    </div></div>}
  </section>;
}
