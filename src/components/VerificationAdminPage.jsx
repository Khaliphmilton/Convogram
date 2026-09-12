import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, Check, X, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";

const ADMIN_EMAILS = ["khaliphindustries@gmail.com"];

export function VerificationAdminPage({ email, onBack }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(null);
  const [message, setMessage] = useState("");

  const allowed = ADMIN_EMAILS.includes((email || "").toLowerCase());

  async function load() {
    if (!allowed || !supabase) return;
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase
      .from("verification_requests")
      .select("id,user_id,verification_type,identity_name,reason,website,evidence_url,status,admin_notes,created_at,profiles:user_id(username,display_name,avatar_url,is_verified)")
      .order("created_at", { ascending: false });
    if (error) setMessage(error.message);
    else setRequests(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [allowed]);

  async function review(request, decision) {
    setWorking(request.id);
    setMessage("");
    const notes = window.prompt(decision === "approve" ? "Optional approval note" : "Reason for rejection (optional)", request.admin_notes || "");
    if (notes === null) { setWorking(null); return; }
    const { error } = await supabase.rpc("review_verification_request", {
      p_request_id: request.id,
      p_decision: decision,
      p_notes: notes.trim() || null,
    });
    if (error) setMessage(error.message);
    else { setMessage(decision === "approve" ? "Verification approved and badge granted." : "Verification request rejected."); await load(); }
    setWorking(null);
  }

  if (!allowed) return <section className="settings-page"><div className="settings-page-head"><button onClick={onBack} aria-label="Back"><ArrowLeft size={21}/></button><div><small>CONVOGRAM</small><h1>Admin</h1><p>You do not have permission to review verification requests.</p></div></div></section>;

  return <section className="settings-page">
    <div className="settings-page-head"><button onClick={onBack} aria-label="Back"><ArrowLeft size={21}/></button><div><small>CONVOGRAM ADMIN</small><h1>Verification requests</h1><p>Review accounts before granting the blue verified badge.</p></div><button onClick={load} aria-label="Refresh"><RefreshCw size={19}/></button></div>
    {message && <div className="alert" role="status">{message}</div>}
    <div className="settings-card" style={{ padding: 16 }}>
      {loading ? <div className="empty">Loading requests…</div> : !requests.length ? <div className="empty">No verification requests yet.</div> : requests.map((request) => {
        const profile = Array.isArray(request.profiles) ? request.profiles[0] : request.profiles;
        const pending = request.status === "pending";
        return <article key={request.id} style={{ padding: 16, border: "1px solid rgba(120,140,180,.18)", borderRadius: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div><strong>{profile?.display_name || request.identity_name || "Unknown account"}</strong><div style={{ opacity: .65 }}>@{profile?.username || "unknown"} · {request.verification_type}</div></div>
            {profile?.is_verified && <BadgeCheck size={21} color="#1d9bf0" fill="#1d9bf0" stroke="white" />}
          </div>
          <p style={{ whiteSpace: "pre-wrap" }}>{request.reason}</p>
          {request.identity_name && <div><b>Identity:</b> {request.identity_name}</div>}
          {request.website && <div><b>Website:</b> <a href={request.website} target="_blank" rel="noreferrer">{request.website}</a></div>}
          {request.evidence_url && <div><b>Evidence:</b> <a href={request.evidence_url} target="_blank" rel="noreferrer">{request.evidence_url}</a></div>}
          <div style={{ marginTop: 8, opacity: .6 }}>Status: {request.status} · {new Date(request.created_at).toLocaleString()}</div>
          {pending && <div style={{ display: "flex", gap: 10, marginTop: 14 }}><button className="primary" disabled={working === request.id} onClick={() => review(request, "approve")}><Check size={17}/> Approve</button><button className="secondary" disabled={working === request.id} onClick={() => review(request, "reject")}><X size={17}/> Reject</button></div>}
          {request.admin_notes && <div style={{ marginTop: 10, opacity: .72 }}><b>Admin note:</b> {request.admin_notes}</div>}
        </article>;
      })}
    </div>
  </section>;
}
