import { supabase } from "./lib/supabase";

const STYLE_ID = "convogram-reply-quote-style";

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .message-bubble { position: relative; }
    .convogram-inline-reply { display:flex; align-items:stretch; gap:9px; margin:-2px -2px 8px; padding:7px 9px; border-radius:10px; background:rgba(7,20,38,.10); border:1px solid rgba(7,20,38,.10); text-align:left; overflow:hidden; cursor:pointer; }
    .message-row.theirs .convogram-inline-reply { background:rgba(255,255,255,.07); border-color:rgba(255,255,255,.09); }
    .convogram-inline-reply-accent { width:3px; flex:0 0 3px; border-radius:4px; background:#2d7ff9; }
    .convogram-inline-reply-body { min-width:0; display:flex; flex-direction:column; gap:2px; }
    .convogram-inline-reply-name { font-size:11px; line-height:15px; font-weight:750; color:#2d7ff9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .convogram-inline-reply-text { font-size:12px; line-height:16px; opacity:.78; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  `;
  document.head.appendChild(style);
}

function labelFor(message) {
  if (!message || message.is_deleted) return "Message deleted";
  if (message.message_type === "image") return "Photo";
  if (message.message_type === "video") return "Video";
  if (message.message_type === "audio") return "Voice message";
  return message.content || "Message";
}

async function refresh() {
  injectStyles();
  const panel = document.querySelector(".messages-panel.chat-open");
  if (!panel) return;
  const rows = [...panel.querySelectorAll(".message-stream .message-row")];
  if (!rows.length) return;

  try {
    const ids = rows.map(row => row.getAttribute("data-message-id")).filter(Boolean);
    if (!ids.length) return;
    const { data: messages } = await supabase.from("messages").select("id, reply_to_id").in("id", ids);
    const replied = (messages || []).filter(m => m.reply_to_id);
    if (!replied.length) return;
    const replyIds = [...new Set(replied.map(m => m.reply_to_id))];
    const { data: originals } = await supabase.from("messages").select("id, content, message_type, media_url, is_deleted, sender_id, profiles:sender_id(id, username, display_name, avatar_url)").in("id", replyIds);
    const originalById = new Map((originals || []).map(m => [m.id, m]));
    const replyById = new Map(replied.map(m => [m.id, m.reply_to_id]));
    rows.forEach(row => {
      if (row.querySelector(".convogram-inline-reply")) return;
      const id = row.getAttribute("data-message-id");
      const replyToId = replyById.get(id);
      const original = originalById.get(replyToId);
      if (!original) return;
      const bubble = row.querySelector(".message-bubble");
      if (!bubble) return;
      const quote = document.createElement("div");
      quote.className = "convogram-inline-reply";
      const name = original.profiles?.display_name || original.profiles?.username || "Message";
      quote.innerHTML = `<span class="convogram-inline-reply-accent"></span><span class="convogram-inline-reply-body"><strong class="convogram-inline-reply-name"></strong><span class="convogram-inline-reply-text"></span></span>`;
      quote.querySelector(".convogram-inline-reply-name").textContent = name;
      quote.querySelector(".convogram-inline-reply-text").textContent = labelFor(original);
      bubble.insertBefore(quote, bubble.firstChild);
    });
  } catch (_) {}
}

let timer;
const schedule = () => { clearTimeout(timer); timer = setTimeout(refresh, 120); };

if (typeof window !== "undefined") {
  const observer = new MutationObserver(schedule);
  const start = () => { injectStyles(); if (document.body) observer.observe(document.body, { childList:true, subtree:true }); schedule(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true }); else start();
}
