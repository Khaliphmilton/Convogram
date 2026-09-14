import { supabase } from "./lib/supabase";
import { getConversations } from "./lib/messages";

const STATUS_CLASS = "convogram-live-status";
const TYPING_EVENT = "typing";

let current = { conversationId: null, channel: null, conversations: [], userId: null, timer: null, typingUntil: 0 };

function getChatTitle() {
  const node = document.querySelector(".chat-head-copy strong");
  return node?.textContent?.trim() || "";
}

function ensureStatusNode() {
  const copy = document.querySelector(".chat-head-copy");
  if (!copy) return null;
  let node = copy.querySelector(`.${STATUS_CLASS}`);
  if (!node) {
    node = document.createElement("span");
    node.className = `${STATUS_CLASS} chat-presence-status`;
    node.setAttribute("aria-live", "polite");
    copy.appendChild(node);
  }
  return node;
}

function conversationTitle(c, userId) {
  if (!c) return "";
  if (c.type === "group") return c.name || "Group conversation";
  const member = c.conversation_members?.find((m) => m.user_id !== userId);
  return member?.profiles?.display_name || member?.profiles?.username || c._direct_profile?.display_name || c._direct_profile?.username || c.name || "Direct conversation";
}

function findConversation() {
  const title = getChatTitle();
  if (!title || !current.userId) return null;
  return current.conversations.find((c) => conversationTitle(c, current.userId) === title) || null;
}

function setStatus(text, online = false, typing = false) {
  const node = ensureStatusNode();
  if (!node) return;
  node.classList.toggle("online", online);
  node.classList.toggle("typing", typing);
  if (typing) {
    node.innerHTML = '<span class="convogram-typing-dots"><i></i><i></i><i></i></span> typing…';
  } else {
    node.innerHTML = `<i></i><span>${text}</span>`;
  }
}

function stopChannel() {
  if (current.timer) window.clearTimeout(current.timer);
  if (current.channel) {
    current.channel.untrack().catch(() => {});
    supabase.removeChannel(current.channel);
  }
  current.channel = null;
  current.conversationId = null;
  current.typingUntil = 0;
}

async function startChannel(conversation) {
  const id = conversation?.id;
  if (!id || id === current.conversationId || !current.userId) return;
  stopChannel();
  current.conversationId = id;
  const channel = supabase.channel(`convogram-live-${id}`, { config: { presence: { key: current.userId } } });
  current.channel = channel;

  const syncPresence = () => {
    const users = Object.values(channel.presenceState()).flat();
    const otherOnline = users.some((u) => u.userId && u.userId !== current.userId && u.online !== false);
    setStatus(otherOnline ? "online" : "offline", otherOnline, false);
  };

  channel
    .on("presence", { event: "sync" }, syncPresence)
    .on("presence", { event: "join" }, syncPresence)
    .on("presence", { event: "leave" }, syncPresence)
    .on("broadcast", { event: TYPING_EVENT }, ({ payload }) => {
      if (!payload || payload.userId === current.userId) return;
      if (payload.typing) {
        setStatus("online", true, true);
        window.clearTimeout(current.typingUntil);
        current.typingUntil = window.setTimeout(syncPresence, 1800);
      } else {
        syncPresence();
      }
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ userId: current.userId, online: true });
        syncPresence();
      }
    });
}

function bindTypingInput() {
  const input = document.querySelector(".message-composer input");
  if (!input || input.dataset.convogramTypingBound === "1") return;
  input.dataset.convogramTypingBound = "1";
  input.addEventListener("input", () => {
    if (!current.channel || !current.conversationId || !current.userId) return;
    current.channel.send({
      type: "broadcast",
      event: TYPING_EVENT,
      payload: { userId: current.userId, typing: Boolean(input.value.trim()) },
    }).catch(() => {});
    if (current.timer) window.clearTimeout(current.timer);
    if (input.value.trim()) {
      current.timer = window.setTimeout(() => {
        current.channel?.send({ type: "broadcast", event: TYPING_EVENT, payload: { userId: current.userId, typing: false } }).catch(() => {});
      }, 1400);
    }
  });
}

async function refresh() {
  const chatOpen = Boolean(document.querySelector(".chat-head-copy strong"));
  if (!chatOpen) {
    if (current.conversationId) stopChannel();
    return;
  }
  bindTypingInput();
  const conversation = findConversation();
  if (conversation) await startChannel(conversation);
}

async function boot() {
  try {
    const { data } = await supabase.auth.getUser();
    current.userId = data?.user?.id || null;
    if (!current.userId) return;
    current.conversations = await getConversations(current.userId);
    const observer = new MutationObserver(() => { refresh().catch(() => {}); });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setInterval(() => refresh().catch(() => {}), 1000);
    window.addEventListener("beforeunload", stopChannel);
    refresh().catch(() => {});
  } catch (error) {
    console.warn("Convogram presence/typing unavailable", error);
  }
}

boot();
