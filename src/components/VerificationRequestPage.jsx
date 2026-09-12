import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, ExternalLink, Send } from "lucide-react";
import { supabase } from "../lib/supabase";

const field = { width: "100%", boxSizing: "border-box", marginTop: 8, padding: "12px 13px", borderRadius: 12, border: "1px solid rgba(120,140,180,.22)", background: "rgba(255,255,255,.035)", color: "inherit" };

export function VerificationRequestPage({ profile, userId, onBack }) {
  const [type, setType] = useState("individual");
  const [identityName, setIdentityName] = useState(profile?.display_name || "");
  const [reason, setReason] = useState("");
  const [website, setWebsite] = useState(profile?.website || "");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    if (!userId || !supabase) return;
    supabase.from("verification_requests").select("status,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => {
      if (active && data) setStatus(data);
    });
    return () => { active = false; };
  }, [userId]);

  async function submit(event) {
    event.preventDefault();
    if (!userId || !supabase) return;
    if (reason.trim().length < 40) { setStatus({ error: "Please explain why this account should be verified (at least 40 characters)." }); return; }
    setSending(true); setStatus(null);
    const { data, error } = await supabase.from("verification_requests").insert({ user_id: userId, verification_type: type, identity_name: identityName.trim() || null, reason: reason.trim(), website: website.trim() || null, evidence_url: evidenceUrl.trim() || null }).select().single();
    if (error) { setStatus({ error: error.message }); setSending(false); return; }
    const { error: emailError } = await supabase.functions.invoke("notify-verification-request", { body: { request_id: data.id } });
    setStatus(emailError ? { warning: "Request submitted successfully. Email notification still needs to be configured by Convogram." } : { success: "Request submitted. The Convogram team has been notified for review." });
    setSending(false);
  }

  return <section className="settings-page">
    <div className="settings-page-head"><button onClick={onBack} aria-label="Back"><ArrowLeft size={21} /></button><div><small>CONVOGRAM</small><h1>Verification</h1><p>Request the blue Convogram Verified badge.</p></div></div>
    <div className="settings-card" style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}><BadgeCheck size={30} color="#1d9bf0" fill="#1d9bf0" stroke="white" /><div><strong>Convogram Verified</strong><p style={{ margin: "5px 0 0", opacity: .72 }}>The badge confirms that Convogram has reviewed the account and confirmed it represents who it claims to represent. It is not based simply on follower count.</p></div></div>
      {status?.error && <div className="alert error" style={{ marginTop: 16 }}>{status.error}</div>}
      {status?.success && <div className="alert" style={{ marginTop: 16 }}>{status.success}</div>}
      {status?.warning && <div className="alert" style={{ marginTop: 16 }}>{status.warning}</div>}
      {status?.status === "pending" && <div className="alert" style={{ marginTop: 16 }}>Your latest verification request is pending review.</div>}
      {status?.status === "verified" && <div className="alert" style={{ marginTop: 16 }}>This account is already verified.</div>}
      {!status?.success && status?.status !== "verified" && <form onSubmit={submit} style={{ marginTop: 20 }}>
        <label>Account type<select value={type} onChange={e => setType(e.target.value)} style={field}><option value="individual">Individual / public figure</option><option value="creator">Creator</option><option value="business">Business / brand</option><option value="organization">Organization / institution</option><option value="community">Community leader</option></select></label>
        <label style={{ display: "block", marginTop: 14 }}>Name or organization represented<input value={identityName} onChange={e => setIdentityName(e.target.value)} style={field} placeholder="Your real name or organization" /></label>
        <label style={{ display: "block", marginTop: 14 }}>Why should this account be verified?<textarea value={reason} onChange={e => setReason(e.target.value)} style={{ ...field, minHeight: 130, resize: "vertical" }} placeholder="Tell Convogram who you represent, why the account is authentic, and why verification is useful or necessary." /></label>
        <label style={{ display: "block", marginTop: 14 }}>Official website (optional)<input value={website} onChange={e => setWebsite(e.target.value)} style={field} placeholder="https://..." /></label>
        <label style={{ display: "block", marginTop: 14 }}>Evidence link (optional)<input value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)} style={field} placeholder="A public profile, article, organization page, etc." /></label>
        <div style={{ marginTop: 14, fontSize: 13, opacity: .7 }}>Convogram reviews authenticity, profile completeness, activity, account standing, public presence and impersonation risk. Meeting the criteria does not guarantee approval.</div>
        <button className="primary" disabled={sending} style={{ marginTop: 18 }}><Send size={17} /> {sending ? "Submitting…" : "Submit verification request"}</button>
      </form>}
      <div style={{ marginTop: 18, fontSize: 13, opacity: .65, display: "flex", gap: 6, alignItems: "center" }}><ExternalLink size={14} /> Verification decisions are made by Convogram, not automatically by follower count.</div>
    </div>
  </section>;
}
