import { useEffect, useState } from "react";
import { ArrowLeft, Bookmark, ChevronRight, Edit3, Lock, LogOut, Mail, Settings, Shield, User, UsersRound, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import "./ProfileOptionsPage.css";

const SAVED_ACCOUNTS_KEY = "convogram_saved_accounts";

function readSavedAccounts() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVED_ACCOUNTS_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    return raw.filter((item) => {
      const id = String(item?.id || "").trim();
      const email = String(item?.email || "").trim().toLowerCase();
      if (!id || seen.has(id) || (email && seen.has(`email:${email}`))) return false;
      seen.add(id);
      if (email) seen.add(`email:${email}`);
      return true;
    });
  } catch { return []; }
}

function writeSavedAccounts(accounts) {
  try { localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts.slice(0, 5))); } catch {}
}

function saveAccount(account) {
  if (!account?.id) return;
  const id = String(account.id);
  const email = String(account.email || "").trim().toLowerCase();
  const current = readSavedAccounts().filter((item) => item.id !== id && (!email || String(item.email || "").trim().toLowerCase() !== email));
  writeSavedAccounts([{ id, display_name: account.display_name || "Convogram User", username: account.username || "user", email, session: account.session || null }, ...current]);
}

export function ProfileOptionsPage({ profile, email, onBack, onViewProfile, onSaved, onEditProfile, onSettings, onLogout }) {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [switchError, setSwitchError] = useState("");
  const [switching, setSwitching] = useState(false);

  const displayName = profile?.display_name || "Convogram User";
  const username = profile?.username || "user";
  const initial = displayName.slice(0, 1).toUpperCase();

  useEffect(() => {
    let cancelled = false;
    async function syncCurrentAccount() {
      let session = null;
      try { const { data } = await supabase.auth.getSession(); session = data?.session || null; } catch {}
      if (cancelled) return;
      const authUser = session?.user;
      const account = { id: authUser?.id || profile?.id, display_name: displayName, username, email: authUser?.email || email || "", session };
      if (account.id && session) saveAccount(account);
      setSavedAccounts(readSavedAccounts());
      try {
        if (sessionStorage.getItem("convogram:open-switch-account") === "1") {
          sessionStorage.removeItem("convogram:open-switch-account");
          setSwitcherOpen(true);
        }
      } catch {}
    }
    syncCurrentAccount();
    return () => { cancelled = true; };
  }, [profile?.id, displayName, username, email]);

  const emailUs = (subject) => { window.location.href = `mailto:khaliphindustries@gmail.com?subject=${encodeURIComponent(subject)}`; };
  function openSwitcher() { setSavedAccounts(readSavedAccounts()); setSelectedAccount(null); setSwitchError(""); setSwitcherOpen(true); }
  function chooseAccount(account) {
    if (!account?.id) return;
    if (account.id === profile?.id) { setSwitchError("This is already the active account."); return; }
    if (!account.session?.access_token || !account.session?.refresh_token) {
      setSwitchError("This account needs to be logged in once on this device before passwordless switching is available. Remove it and add it again.");
      return;
    }
    setSelectedAccount(account); setSwitchError("");
  }
  function removeSavedAccount(account) {
    const next = readSavedAccounts().filter((item) => item.id !== account.id);
    writeSavedAccounts(next); setSavedAccounts(next);
    if (selectedAccount?.id === account.id) setSelectedAccount(null);
  }

  async function switchToAccount(account) {
    if (!account || switching) return;
    setSwitching(true); setSwitchError("");
    try {
      const targetSession = account.session;
      if (!targetSession?.access_token || !targetSession?.refresh_token) throw new Error("This account is not remembered yet. Log in to it once, then it can be switched to without a password.");
      const { data, error } = await supabase.auth.setSession({ access_token: targetSession.access_token, refresh_token: targetSession.refresh_token });
      if (error) throw error;
      const targetId = account.id;
      if (data?.user?.id !== targetId && data?.session?.user?.id !== targetId) throw new Error("The remembered login belongs to a different account. Remove this account and log in again.");
      const { data: verified, error: verifyError } = await supabase.auth.getUser();
      if (verifyError) throw verifyError;
      if (verified?.user?.id !== targetId) throw new Error("Account switch verification failed.");
      saveAccount({ ...account, session: data.session || targetSession, email: verified.user.email || account.email });
      window.location.replace(`${window.location.origin}${window.location.pathname}?account=${encodeURIComponent(targetId)}&switch=${Date.now()}`);
    } catch (error) { setSwitchError(error?.message || "Could not switch accounts."); setSwitching(false); }
  }

  return <section className="page profile-options-page">
    <header className="profile-options-head"><button className="profile-options-back" onClick={onBack} aria-label="Back"><ArrowLeft size={20} /></button><div><small>ACCOUNT</small><h1>Menu</h1></div></header>
    <div className="profile-options-user"><div className="avatar profile-options-avatar">{initial}</div><div className="profile-options-identity"><strong>{displayName}</strong><span>@{username}</span></div></div>
    <div className="profile-options-sections">
      <section className="profile-options-group"><h2>Profile</h2><div className="profile-options-list"><button className="profile-option-row" onClick={onEditProfile}><span className="option-icon"><Edit3 size={19} /></span><span className="option-copy"><b>Edit profile</b><small>Photo, name, bio and username</small></span><ChevronRight className="option-chevron" size={19} /></button><button className="profile-option-row" onClick={onViewProfile}><span className="option-icon"><User size={19} /></span><span className="option-copy"><b>View profile</b><small>Posts, Shorts, Moments and profile content</small></span><ChevronRight className="option-chevron" size={19} /></button><button className="profile-option-row" onClick={onSaved}><span className="option-icon"><Bookmark size={19} /></span><span className="option-copy"><b>Saved</b><small>Open the posts you have saved</small></span><ChevronRight className="option-chevron" size={19} /></button></div></section>
      <section className="profile-options-group"><h2>Account</h2><div className="profile-options-list"><button className="profile-option-row" onClick={openSwitcher}><span className="option-icon"><UsersRound size={19} /></span><span className="option-copy"><b>Switch account</b><small>Switch between up to 5 remembered accounts</small></span><ChevronRight className="option-chevron" size={19} /></button><button className="profile-option-row" onClick={onSettings}><span className="option-icon"><Settings size={19} /></span><span className="option-copy"><b>Settings</b><small>Notifications, appearance and account controls</small></span><ChevronRight className="option-chevron" size={19} /></button><button className="profile-option-row" onClick={onSettings}><span className="option-icon"><Lock size={19} /></span><span className="option-copy"><b>Privacy &amp; security</b><small>Control who can interact with you</small></span><ChevronRight className="option-chevron" size={19} /></button><button className="profile-option-row" onClick={onSettings}><span className="option-icon"><Shield size={19} /></span><span className="option-copy"><b>Account &amp; safety</b><small>Security and account protection</small></span><ChevronRight className="option-chevron" size={19} /></button></div></section>
      <section className="profile-options-group"><h2>Help</h2><div className="profile-options-list"><button className="profile-option-row" onClick={() => emailUs("Convogram Support Request")}><span className="option-icon"><Mail size={19} /></span><span className="option-copy"><b>Support</b><small>Email Convogram support</small></span><ChevronRight className="option-chevron" size={19} /></button><button className="profile-option-row" onClick={() => emailUs("Convogram Feedback")}><span className="option-icon"><Mail size={19} /></span><span className="option-copy"><b>Feedback</b><small>Send feedback or report a problem</small></span><ChevronRight className="option-chevron" size={19} /></button></div></section>
    </div>
    <button className="profile-options-logout" onClick={onLogout}><LogOut size={19} /><span>Log out</span></button>
    {switcherOpen && <div className="account-switch-backdrop" onClick={() => !switching && setSwitcherOpen(false)}><div className="account-switcher" onClick={(e) => e.stopPropagation()}>
      <div className="account-switch-head"><div><small>ACCOUNTS</small><h2>Switch account</h2></div><button disabled={switching} onClick={() => setSwitcherOpen(false)} aria-label="Close"><X size={19}/></button></div>
      <div className="saved-account-list">
        {savedAccounts.length === 0 && <div className="switch-error">No remembered accounts yet.</div>}
        {savedAccounts.map((account) => <div key={account.id} className={`saved-account ${account.id === profile?.id ? "current" : ""}`}>
          <button disabled={switching} className="saved-account-main" onClick={() => chooseAccount(account)}><span className="avatar saved-account-avatar">{(account.display_name || "C").slice(0,1).toUpperCase()}</span><span><b>{account.display_name}</b><small>@{account.username}{account.email ? ` · ${account.email}` : ""}</small></span>{account.id === profile?.id && <em>Current</em>}</button>
          {account.id !== profile?.id && <button className="saved-account-remove" disabled={switching} onClick={() => removeSavedAccount(account)} aria-label={`Remove ${account.username}`}>Remove</button>}
        </div>)}
      </div>
      {selectedAccount && <div className="switch-password"><p className="account-switch-note">{selectedAccount.email || `@${selectedAccount.username}`} is remembered on this device.</p>{switchError && <div className="switch-error">{switchError}</div>}<button className="primary" disabled={switching} onClick={() => switchToAccount(selectedAccount)}>{switching ? "Switching…" : "Switch now"}</button></div>}
      <button className="add-account-button" disabled={switching} onClick={() => { setSwitcherOpen(false); onLogout(); }}><span className="option-icon"><User size={17}/></span><span><b>Add account</b><small>Log in once to remember another account</small></span><ChevronRight size={18}/></button>
      <p className="account-switch-note">Remembered sessions are stored on this device so switching does not require a password each time. Convogram never stores your password.</p>
    </div></div>}
  </section>;
}
