import { supabase } from "./lib/supabase";
import { getDirectConversation } from "./lib/messages";

const STYLE_ID = "convogram-typing-indicator-style";
let channel = null;
let channelConversationId = null;
let currentUserId = null;
let remoteTypingTimer = null;
let stopTypingTimer = null;
let resolveTimer = null;
let resolving = false;

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .convogram-typing-indicator{display:flex;align-items:center;gap:8px;align-self:flex-start;max-width:78%;margin:2px 0 2px 2px;padding:8px 11px;border:1px solid #252525;border-radius:16px 16px 16px 5px;background:#151515;color:#8f8f8f;font-size:12px;line-height:16px;opacity:0;transform:translateY(3px);pointer-events:none;transition:opacity .16s ease,transform .16s ease;}
    .convogram-typing-indicator.visible{opacity:1;transform:translateY(0)}
    .convogram-typing-dots{display:inline-flex;align-items:center;gap:3px;height:12px}
    .convogram-typing-dots i{width:4px;height:4px;border-radius:50%;background:#8f8f8f;animation:convogramTypingDot 1s infinite ease-in-out}
    .convogram-typing-dots i:nth-child(2){animation-delay:.14s}.convogram-typing-dots i:nth-child(3){animation-delay:.28s}
    @keyframes convogramTypingDot{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-3px);opacity:1}}
  `;
  document.head.appendChild(style);
}

function getChatElements() {
  const panel = document.querySelector(".messages-panel.chat-open");
  if (!panel) return null;
  const stream = panel.querySelector(".message-stream");
  const input = panel.querySelector(".message-composer input");
  const name = panel.querySelector(".chat-head-copy strong")?.textContent?.trim();
  return { panel, stream, input, name };
}

function ensureIndicator(stream) {
  if (!stream) return null;
  let indicator = stream.querySelector(".convogram-typing-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.className = "convogram-typing-indicator";
    indicator.setAttribute("aria-live", "polite");
    indicator.innerHTML = `<span>Typing</span><span class="convogram-typing-dots"><i></i><i></i><i></i></span>`;
    stream.appendChild(indicator);
  }
  return indicator;
}

function showTyping(stream, visible) {
  const indicator = ensureIndicator(stream);
  if (!indicator) return;
  indicator.classList.toggle("visible", visible);
  if (visible) {
    stream.scrollTop = stream.scrollHeight;
    clearTimeout(remoteTypingTimer);
    remoteTypingTimer = setTimeout(() => indicator.classList.remove("visible"), 2200);
  }
}

async function resolveConversation(name) {
  if (!currentUserId || !name || resolving) return null;
  resolving = true;
  try {
    const safe = name.replace(/,/g, "").trim();
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .or(`username.eq.${safe},display_name.eq.${safe}`)
      .neq("id", currentUserId)
      .limit(1);
    const profile = profiles?.[0];
    if (!profile) return null;
    return await getDirectConversation(currentUserId, profile.id);
  } catch (_) {
    return null;
  } finally {
    resolving = false;
  }
}

async function connectConversation(conversationId, stream) {
  if (!conversationId || conversationId === channelConversationId) return;
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
  channelConversationId = conversationId;
  channel = supabase.channel(`convogram-typing-${conversationId}`);
  channel.on("broadcast", { event: "typing" }, ({ payload }) => {
    if (payload?.userId && payload.userId !== currentUserId) showTyping(stream, payload.typing === true);
  });
  await channel.subscribe();
}

async function sendTyping(isTyping) {
  const chat = getChatElements();
  if (!chat?.input || !chat.name || !currentUserId) return;
  if (!channelConversationId) {
    const conversation = await resolveConversation(chat.name);
    if (!conversation?.id) return;
    await connectConversation(conversation.id, chat.stream);
  }
  if (!channel) return;
  try {
    await channel.send({ type: "broadcast", event: "typing", payload: { userId: currentUserId, typing: isTyping } });
  } catch (_) {}
}

function handleInput() {
  clearTimeout(stopTypingTimer);
  sendTyping(true);
  stopTypingTimer = setTimeout(() => sendTyping(false), 1200);
}

async function refresh() {
  const chat = getChatElements();
  if (!chat) {
    if (channel) supabase.removeChannel(channel);
    channel = null;
    channelConversationId = null;
    return;
  }
  ensureIndicator(chat.stream);
  if (!currentUserId || !chat.name) return;
  if (!channelConversationId) {
    clearTimeout(resolveTimer);
    resolveTimer = setTimeout(async () => {
      const conversation = await resolveConversation(chat.name);
      if (conversation?.id) await connectConversation(conversation.id, chat.stream);
    }, 100);
  }
  if (chat.input && chat.input.dataset.convogramTypingBound !== "1") {
    chat.input.dataset.convogramTypingBound = "1";
    chat.input.addEventListener("input", handleInput);
    chat.input.addEventListener("blur", () => { clearTimeout(stopTypingTimer); sendTyping(false); });
  }
}

async function start() {
  if (!supabase) return;
  installStyle();
  try {
    const { data } = await supabase.auth.getUser();
    currentUserId = data?.user?.id || null;
  } catch (_) {}
  refresh();
  new MutationObserver(refresh).observe(document.body, { childList: true, subtree: true });
  setInterval(refresh, 1500);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
