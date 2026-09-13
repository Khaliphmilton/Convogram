import { supabase } from "./lib/supabase";

const STYLE_ID = "convogram-reply-quote-style";
const PROCESSED = "data-convogram-reply-quote";

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .message-bubble { position: relative; }
    .convogram-inline-reply {
      display: flex;
      align-items: stretch;
      gap: 9px;
      margin: -2px -2px 8px;
      padding: 7px 9px;
      border-radius: 10px;
      background: rgba(7,20,38,.10);
      border: 1px solid rgba(7,20,38,.10);
      text-align: left;
      overflow: hidden;
      cursor: pointer;
    }
    .message-row.theirs .convogram-inline-reply { background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.09); }
    .convogram-inline-reply-accent { width: 3px; flex: 0 0 3px; border-radius: 4px; background: #2d7ff9; }
    .convogram-inline-reply-body { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .convogram-inline-reply-name { font-size: 11px; line-height: 15px; font-weight: 750; color: #2d7ff9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .convogram-inline-reply-text { font-size: 12px; line-height: 16px; opacity: .78; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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

function rowText(row) {
  const bubble = row.querySelector(".message-bubble");
  if (!bubble) return "";
  const clone = bubble.cloneNode(true);
  clone.querySelectorAll(".convogram-inline-reply, img, video, audio, button, svg").forEach(node => node.remove());
  return clone.textContent?.replace(/\s+/g, " ").trim() || "";
}

async function refresh() {
  injectStyles();
  const panel = document.querySelector(".messages-panel.chat-open");
  if (!panel) return;
  const rows = [...panel.querySelectorAll(".message-stream .message-row")];
  if (!rows.length) return;

  const texts = rows.map(rowText).filter(Boolean);
  if (!texts.length) return;

  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return;

    const { data: memberships } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", userId)
      .is("hidden_at", null);
    const ids = (memberships || []).map(x => x.conversation_id).filter(Boolean);
    if (!ids.length) return;

    const { data: candidates } = await supabase
      .from("messages")
      .select("id, conversation_id, content, message_type, media_url, is_deleted, sender_id, created_at, reply_to_id")
      .in("conversation_id", ids)
      .not("reply_to_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(300);
    if (!candidates?.length) return;

    const byText = new Map();
    for (const message of candidates) {
      const key = labelFor(message);
      if (!byText.has(key)) byText.set(key, message);
    }

    const replyIds = [...new Set(candidates.map(m => m.reply_to_id).filter(Boolean))];
    if (!replyIds.length) return;
    const { data: originals } = await supabase
      .from("messages")
      .select("id, content, message_type, media_url, is_deleted, sender_id, profiles:sender_id(id, username, display_name, avatar_url)")
      .in("id", replyIds);
    const originalById = new Map((originals || []).map(m => [m.id, m]));

    rows.forEach(row => {
      if (row.querySelector(`.${PROCESSED}`)) return;
      const text = rowText(row);
      const sent = byText.get(text);
      if (!sent?.reply_to_id) return;
      const original = originalById.get(sent.reply_to_id);
      if (!original) return;

      const bubble = row.querySelector(".message-bubble");
      if (!bubble) return;
      const quote = document.createElement("div");
      quote.className = `convogram-inline-reply ${PROCESSED}`;
      const name = original.profiles?.display_name || original.profiles?.username || "Message";
      quote.innerHTML = `<span class="convogram-inline-reply-accent"></span><span class="convogram-inline-reply-body"><strong class="convogram-inline-reply-name"></strong><span class="convogram-inline-reply-text"></span></span>`;
      quote.querySelector(".convogram-inline-reply-name").textContent = name;
      quote.querySelector(".convogram-inline-reply-text").textContent = labelFor(original);
      quote.title = "Replying to this message";
      bubble.insertBefore(quote, bubble.firstChild);
    });
  } catch (_) {}
}

let timer = null;
const schedule = () => { clearTimeout(timer); timer = setTimeout(refresh, 120); };

if (typeof window !== "undefined") {
  const observer = new MutationObserver(schedule);
  const start = () => {
    injectStyles();
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    schedule();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
