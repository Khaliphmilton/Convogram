import { supabase } from "./supabase";
import "./chat-media-save";
import "./chat-media-fullscreen";

const BADGE_ATTR = "data-convogram-message-badge";
let refreshTimer = null;
let channel = null;
let observer = null;

function messageButtons() {
  return [...document.querySelectorAll("button")].filter((button) => {
    const label = button.querySelector("span")?.textContent?.trim() || "";
    return label === "Messages" || button.getAttribute("aria-label") === "Messages";
  });
}

function paintBadge(count) {
  const safeCount = Math.max(0, Number(count) || 0);
  for (const button of messageButtons()) {
    button.style.position = button.style.position || "relative";
    let badge = button.querySelector(`[${BADGE_ATTR}]`);
    if (safeCount <= 0) {
      badge?.remove();
      continue;
    }
    if (!badge) {
      badge = document.createElement("b");
      badge.setAttribute(BADGE_ATTR, "true");
      badge.setAttribute("aria-label", `${safeCount} unread message${safeCount === 1 ? "" : "s"}`);
      Object.assign(badge.style, {
        position: "absolute", top: "4px", right: "8px", minWidth: "18px", height: "18px",
        padding: "0 5px", borderRadius: "999px", display: "grid", placeItems: "center",
        boxSizing: "border-box", background: "#e53935", color: "#fff",
        font: "700 10px/18px system-ui, sans-serif", zIndex: "20", pointerEvents: "none",
      });
      button.appendChild(badge);
    }
    badge.textContent = safeCount > 99 ? "99+" : String(safeCount);
  }
}

async function getUnreadMessageCount(userId) {
  if (!userId) return 0;
  const { data: memberships, error: membershipError } = await supabase
    .from("conversation_members").select("conversation_id,last_read_at").eq("user_id", userId).is("hidden_at", null);
  if (membershipError) throw membershipError;
  const rows = memberships || [];
  if (!rows.length) return 0;
  const ids = rows.map((row) => row.conversation_id).filter(Boolean);
  const { data: messages, error: messageError } = await supabase
    .from("messages").select("conversation_id,sender_id,created_at,is_deleted").in("conversation_id", ids)
    .neq("sender_id", userId).eq("is_deleted", false).order("created_at", { ascending: false }).limit(1000);
  if (messageError) throw messageError;
  const lastRead = new Map(rows.map((row) => [row.conversation_id, row.last_read_at ? new Date(row.last_read_at).getTime() : 0]));
  return (messages || []).reduce((total, message) => total + (new Date(message.created_at).getTime() > (lastRead.get(message.conversation_id) || 0) ? 1 : 0), 0);
}

async function refresh() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    paintBadge(user ? await getUnreadMessageCount(user.id) : 0);
  } catch (error) { console.warn("Convogram unread message badge refresh failed", error); }
}

function scheduleRefresh() { clearTimeout(refreshTimer); refreshTimer = setTimeout(refresh, 100); }

async function start() {
  await refresh();
  if (!channel) {
    channel = supabase.channel("convogram-message-unread-badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, scheduleRefresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversation_members" }, scheduleRefresh)
      .subscribe();
  }
  if (!observer) {
    observer = new MutationObserver(scheduleRefresh);
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

supabase.auth.onAuthStateChange(() => { scheduleRefresh(); start(); });
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
