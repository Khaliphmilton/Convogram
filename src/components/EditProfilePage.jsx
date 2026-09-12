import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, Save } from "lucide-react";
import { uploadProfileAvatar } from "../lib/storage";
import { updateProfile } from "../lib/profile_features";

export function EditProfilePage({ profile, userId, onBack, onProfileUpdated }) {
  const [form, setForm] = useState({ display_name: profile?.display_name || "", username: profile?.username || "", bio: profile?.bio || "", website: profile?.website || "" });
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);

  useEffect(() => setForm({ display_name: profile?.display_name || "", username: profile?.username || "", bio: profile?.bio || "", website: profile?.website || "" }), [profile]);

  async function save(e) {
    e.preventDefault(); setSaving(true); setMessage("");
    try { const updated = await updateProfile(userId, form); onProfileUpdated?.(updated); setMessage("Profile updated successfully."); }
    catch (err) { setMessage(err.message || "Could not update your profile."); }
    finally { setSaving(false); }
  }

  async function changeAvatar(e) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMessage("Choose an image file.");
    if (file.size > 5 * 1024 * 1024) return setMessage("Profile photos must be 5 MB or smaller.");
    setAvatarSaving(true); setMessage("");
    try {
      const avatarUrl = await uploadProfileAvatar(file, userId);
      const updated = await updateProfile(userId, { avatar_url: avatarUrl });
      onProfileUpdated?.(updated);
      setMessage("Profile photo updated.");
    } catch (err) { setMessage(err.message || "Could not update profile photo."); }
    finally { setAvatarSaving(false); }
  }

  return <section className="settings-page">
    <div className="settings-page-head"><button onClick={onBack} aria-label="Back"><ArrowLeft size={21} /></button><div><small>PROFILE</small><h1>Edit profile</h1><p>Keep your public identity up to date.</p></div></div>
    <div className="settings-card edit-profile-card">
      <div className="edit-profile-avatar-row"><div className="edit-profile-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" /> : (profile?.display_name || profile?.username || "C").charAt(0).toUpperCase()}</div><button type="button" onClick={() => inputRef.current?.click()} disabled={avatarSaving}><Camera size={17} /> {avatarSaving ? "Uploading…" : "Change photo"}</button><input ref={inputRef} type="file" accept="image/*" hidden onChange={changeAvatar} /></div>
      <form className="settings-form" onSubmit={save}>
        <label>Display name<input value={form.display_name} onChange={e=>setForm({...form,display_name:e.target.value})} required /></label>
        <label>Username<input value={form.username} onChange={e=>setForm({...form,username:e.target.value.toLowerCase().replace(/\s/g,"")})} required /></label>
        <label>Bio<textarea value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} maxLength={500} /></label>
        <label>Website<input value={form.website} onChange={e=>setForm({...form,website:e.target.value})} placeholder="https://..." /></label>
        {message && <div className="settings-message"><Check size={16}/>{message}</div>}
        <button className="settings-save" disabled={saving}><Save size={17}/> {saving ? "Saving…" : "Save changes"}</button>
      </form>
    </div>
  </section>;
}
