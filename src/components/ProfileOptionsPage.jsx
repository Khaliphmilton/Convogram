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
  } catch {
    return [];
  }
}

function writeSavedAccounts(accounts) {
  try {
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts.slice(0, 5)));
  } catch {}
}

function saveAccount(account) {
  if (!account?.id) return;
  const id = String(account.id);
  const email = String(account.email || "").trim().toLowerCase();
  const current = readSavedAccounts().filter((item) => item.id !== id && (!email || String(item.email || "").trim().toLowerCase() !== email));
  writeSavedAccounts([
    {
      id,
      display_name: account.display_name || "Convogram User",
      username: account.username || "user",
      email,
    },
    ...current,
  ]);
}

export function ProfileOptionsPage({ profile, email, onBack, onViewProfile, onSaved, onEditProfile, onSettings, onLogout }) {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [switchEmail, setSwitchEmail] = useState("");
  const [switchPassword, setSwitchPassword] = useState("");
  const [switchError, setSwitchError] = useState("");
  const [switching, setSwitching] = useState(false);

  const displayName = profile?.display_name || "Convogram User";
  const username = profile?.username || "user";
  const initial = displayName.slice(0, 1).toUpperCase();

  useEffect(() => {
    let cancelled = false;
    async function syncCurrentAccount() {
      let authUser = null;
      try {
        const { data } = await supabase.auth.getUser();
        authUser = data?.user || null;
      } catch {}
      if (cancelled) return;
      const account = {
        id: authUser?.id || profile?.id,
        display_name: displayName,
        username,
        email: authUser?.email || email || "",
      };
      if (account.id) saveAccount(account);
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

  const emailUs = (subject) => {
    window.location.href = `mailto:khaliphindustries@gmail.com?subject=${encodeURIComponent(subject)}`;
  };

  function openSwitcher() {
    setSavedAccounts(readSavedAccounts());
    setSelectedAccount(null);
    setSwitchEmail("");
    setSwitchPassword("");
    setSwitchError("");
    setSwitcherOpen(true);
  }

  function chooseAccount(account) {
    if (!account?.id) return;
    if (account.id === profile?.id) {
      setSwitchError("This is already the active account. Select a different account.");
      setSelectedAccount(null);
      return;
    }
    setSelectedAccount(account);
    setSwitchEmail(account.email || "");
    setSwitchPassword("");
    setSwitchError("");
  }

  function removeSavedAccount(account) {
    const next = readSavedAccounts().filter((item) => item.id !== account.id);
    writeSavedAccounts(next);
    setSavedAccounts(next);
    if (selectedAccount?.id === account.id) {
      setSelectedAccount(null);
      setSwitchEmail("");
      setSwitchPassword("");
    }
  }

  async function switchToAccount() {
    const targetEmail = switchEmail.trim().toLowerCase();
    if (!selectedAccount || !targetEmail || !switchPassword || switching) return;
    setSwitching(true);
    setSwitchError("");
    const targetId = selectedAccount.id;
    try {
      // Always end the current local session first. Passwords are never stored.
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: switchPassword,
      });
      if (error) throw error;

      const signedInId = data?.user?.id || data?.session?.user?.id;
      if (!signedInId) throw new Error("Convogram could not identify the account that was just signed in.");

      // If the saved identity is stale, do not silently send the user back to another account.
      if (signedInId !== targetId) {
        await supabase.auth.signOut({ scope: "local" });
        throw new Error("That email/password belongs to a different Convogram account than the saved account. Remove this saved account and add it again with the correct login.");
      }

      const { data: verified, error: verifyError } = await supabase.auth.getUser();
      if (verifyError) throw verifyError;
      if (verified?.user?.id !== targetId) {
        await supabase.auth.signOut({ scope: "local" });
        throw new Error("Account switch verification failed. The previous account was not restored.");
      }

      // Replace the saved record with the authoritative Supabase identity/email.
      saveAccount({ ...selectedAccount, email: verified.user.email || targetEmail });

      // Force the whole SPA to boot from the newly authenticated session.
      window.location.replace(`${window.location.origin}${window.location.pathname}?account=${encodeURIComponent(targetId)}&switch=${Date.now()}`);
    } catch (error) {
      setSwitchError(error?.message || "Could not switch accounts.");
      setSwitching(false);
    }
  }

  return <section className="page profile-options-page">
    <header className="profile-options-head"><button className="profile-options-back" onClick={onBack} aria-label="Back"><ArrowLeft size={20} /></button><div><small>ACCOUNT</small><h1>Menu</h1></div></header>
    <div className="profile-options-user"><div className="avatar profile-options-avatar">{initial}</div><div className="profile-options-identity"><strong>{displayName}</strong><span>@{username}</span></div></div>
    <div className="profile-options-sections">
      <section className="profile-options-group"><h2>Profile</h2><div className="profile-options-list"><button className="profile-option-row" onClick={onEditProfile}><span className="option-icon"><Edit3 size={19} /></span><span className="option-copy"><b>Edit profile</b><small>Photo, name, bio and username</small></span><ChevronRight className="option-chevron" size={19} /></button><button className="profile-option-row" onClick={onViewProfile}><span className="option-icon"><User size={19} /></span><span className="option-copy"><b>View profile</b><small>Posts, Shorts, Moments and profile content</small></span><ChevronRight className="option-chevron" size={19} /></button><button className="profile-option-row" onClick={onSaved}><span className="option-icon"><Bookmark size={19} /></span><span className="option-copy"><b>Saved</b><small>Open the posts you have saved</small></span><ChevronRight className="option-chevron" size={19} /></button></div></section>
      <section className="profile-options-group"><h2>Account</h2><div className="profile-options-list"><button className="profile-option-row" onClick={openSwitcher}><span className="option-icon"><UsersRound size={19} /></span><span className="option-copy"><b>Switch account</b><small>Keep up to 5 accounts saved on this device</small></span><ChevronRight className="option-chevron" size={19} /></button><button className="profile-option-row" onClick={onSettings}><span className="option-icon"><Settings size={19} /></span><span className="option-copy"><b>Settings</b><small>Notifications, appearance and account controls</small></span><ChevronRight className="option-chevron" size={19} /></button><button className="profile-option-row" onClick={onSettings}><span className="option-icon"><Lock size={19} /></span><span className="option-copy"><b>Privacy &amp; security</b><small>Control who can interact with you</small></span><ChevronRight className="option-chevron" size={19} /></button><button className="profile-option-row" onClick={onSettings}><span className="option-icon"><Shield size={19} /></span><span className="option-copy"><b>Account &amp; safety</b><small>Security and account protection</small></span><ChevronRight className="option-chevron" size={19} /></button></div></section>
      <section className="profile-options-group"><h2>Help</h2><div className="profile-options-list"><button className="profile-option-row" onClick={() => emailUs("Convogram Support Request")}><span className="option-icon"><Mail size={19} /></span><span className="option-copy"><b>Support</b><small>Email Convogram support</small></span><ChevronRight className="option-chevron" size={19} /></button><button className="profile-option-row" onClick={() => emailUs("Convogram Feedback")}><span className="option-icon"><Mail size={19} /></span><span className="option-copy"><b>Feedback</b><small>Send feedback or report a problem</small></span><ChevronRight className="option-chevron" size={19} /></button></div></section>
    </div>
    <button className="profile-options-logout" onClick={onLogout}><LogOut size={19} /><span>Log out</span></button>
    {switcherOpen && <div className="account-switch-backdrop" onClick={() => !switching && setSwitcherOpen(false)}><div className="account-switcher" onClick={(e) => e.stopPropagation()}>
      <div className="account-switch-head"><div><small>ACCOUNTS</small><h2>Switch account</h2></div><button disabled={switching} onClick={() => setSwitcherOpen(false)} aria-label="Close"><X size={19}/></button></div>
      <div className="saved-account-list">
        {savedAccounts.length === 0 && <div className="switch-error">No saved accounts yet. Log in to another account first.</div>}
        {savedAccounts.map((account) => <div key={account.id} className={`saved-account ${account.id === profile?.id ? "current" : ""}`}>
          <button disabled={switching} className="saved-account-main" onClick={() => chooseAccount(account)}><span className="avatar saved-account-avatar">{(account.display_name || "C").slice(0,1).toUpperCase()}</span><span><b>{account.display_name}</b><small>@{account.username}{account.email ? ` · ${account.email}` : ""}</small></span>{account.id === profile?.id && <em>Current</em>}</button>
          {account.id !== profile?.id && <button className="saved-account-remove" disabled={switching} onClick={() => removeSavedAccount(account)} aria-label={`Remove ${account.username}`}>Remove</button>}
        </div>)}
      </div>
      {selectedAccount && <div className="switch-password">
        <label>Login email<input autoFocus disabled={switching} type="email" value={switchEmail} onChange={(e) => setSwitchEmail(e.target.value)} /></label>
        <label>Enter password for @{selectedAccount.username}<input disabled={switching} type="password" value={switchPassword} onChange={(e) => setSwitchPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") switchToAccount(); }} placeholder="Password" /></label>
        {switchError && <div className="switch-error">{switchError}</div>}
        <button className="primary" disabled={switching || !switchEmail.trim() || !switchPassword} onClick={switchToAccount}>{switching ? "Switching…" : "Switch account"}</button>
      </div>}
      <button className="add-account-button" disabled={switching} onClick={() => { setSwitcherOpen(false); onLogout(); }}><span className="option-icon"><User size={17}/></span><span><b>Add account</b><small>Log in to another Convogram account</small></span><ChevronRight size={18}/></button>
      <p className="account-switch-note">Each account is verified by its Supabase user ID. Convogram never saves your passwords.</p>
    </div></div>}
  </section>;
}
