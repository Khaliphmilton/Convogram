import { supabase } from "./lib/supabase";

const STYLE_ID = "convogram-conversation-preview-style";
let timer = null;
let busy = false;

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .conversation-item .conversation-copy{min-width:0!important;overflow:hidden!important;}
    .conversation-item .convogram-latest-preview{display:block!important;margin-top:3px!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;color:#8d8d8d!important;font-size:13px!important;font-weight:400!important;line-height:1.3!important;}
    .conversation-item .convogram-latest-preview.is-unread{color:inherit!important;font-weight:650!important;}
    .conversation-item .convogram-latest-time{margin-left:auto!important;align-self:flex-start!important;flex:0 0 auto!important;color:#8d8d8d!important;font-size:11px!important;white-space:nowrap!important;padding-left:8px!important;}
  `;
  document.head.appendChild(style);
}

function previewText(message, userId) {
  if (!message) return "";
  if (message.is_deleted) return "Message deleted";
  let text = "";
  if (message.message_type === "image") text = "Photo";
  else if (message.message_type === "video") text = "Video";
  else if (message.message_type === "audio") text = "Voice message";
  else text = message.content || "Attachment";
  return message.sender_id === userId ? `You: ${text}` : text;
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  const diff = now.getTime() - date.getTime();
  if (diff < 7 * 86400000) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

async function load() {
  if (busy || !supabase) return;
  busy = true;
  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return;
    const { data: memberships, error: memberError } = await supabase
      .from("conversation_members")
      .select("conversation_id, last_read_at, conversations(id, name, type, updated_at, created_at)")
      .eq("user_id", userId)
      .is("hidden_at", null)
      .limit(50);
    if (memberError) return;
    const rows = (memberships || []).filter(row => row.conversations?.id);
    const ids = rows.map(row => row.conversation_id);
    if (!ids.length) return;

    const { data: messages } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, message_type, is_deleted, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false })
      .limit(Math.max(200, ids.length * 8));

    const latest = new Map();
    for (const message of messages || []) {
      if (!latest.has(message.conversation_id)) latest.set(message.conversation_id, message);
    }

    const titleMap = new Map();
    for (const row of rows) {
      const c = row.conversations;
      const title = c.name || (c.type === "group" ? "Group conversation" : "Direct conversation");
      titleMap.set(`${title}::${c.id}`, { ...row, latest: latest.get(c.id) || null });
    }

    const conversationItems = [...document.querySelectorAll(".conversation-item")];
    for (const item of conversationItems) {
      const strong = item.querySelector(".conversation-copy strong");
      const copy = item.querySelector(".conversation-copy");
      if (!strong || !copy) continue;
      const title = strong.textContent?.trim() || "";
      const candidates = [...titleMap.values()].filter(row => {
        const c = row.conversations;
        return (c.name || (c.type === "group" ? "Group conversation" : "Direct conversation")) === title;
      });
      const row = candidates.sort((a, b) => new Date(b.latest?.created_at || b.conversations.updated_at || 0) - new Date(a.latest?.created_at || a.conversations.updated_at || 0))[0];
      const message = row?.latest || null;

      let preview = copy.querySelector(".convogram-latest-preview");
      if (!preview) { preview = document.createElement("span"); preview.className = "convogram-latest-preview"; copy.appendChild(preview); }
      preview.textContent = previewText(message, userId);
      preview.classList.toggle("is-unread", !!message && message.sender_id !== userId && new Date(message.created_at).getTime() > new Date(row?.last_read_at || 0).getTime());

      let time = item.querySelector(".convogram-latest-time");
      if (!time) { time = document.createElement("span"); time.className = "convogram-latest-time"; const header = copy.parentElement; header?.appendChild(time); }
      time.textContent = formatTime(message?.created_at || row?.conversations?.updated_at);
    }
  } catch (_) {
    // The existing Messages UI remains usable if previews cannot be loaded.
  } finally {
    busy = false;
  }
}

function start() {
  installStyle();
  load();
  clearInterval(timer);
  timer = setInterval(load, 2500);
  new MutationObserver(() => load()).observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
