import { supabase } from "./lib/supabase";

const STYLE_ID = "convogram-read-receipt-style";
let currentUserId = null;
let refreshTimer = null;
let busy = false;
let receiptChannel = null;

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .convogram-read-status{display:inline-flex!important;align-items:center;gap:3px;margin-left:5px;font-size:11px!important;line-height:12px!important;font-weight:700!important;vertical-align:middle;white-space:nowrap}
    .convogram-read-status.sent{color:#888!important}
    .convogram-read-status.seen{color:#2188ff!important}
    .convogram-read-status .ticks{letter-spacing:-3px;font-size:11px;display:inline-block;min-width:14px}
    .convogram-read-status .seen-label{font-size:9px;font-weight:650;letter-spacing:.01em}
  `;
  document.head.appendChild(style);
}

function chatRows() {
  return [...document.querySelectorAll(".messages-panel.chat-open .message-row[data-message-id]")];
}

function setStatus(row, seen) {
  const bubble = row.querySelector(".message-bubble");
  if (!bubble || !row.classList.contains("mine")) return;
  let status = bubble.querySelector(".convogram-read-status");
  if (!status) {
    status = document.createElement("span");
    status.className = "convogram-read-status sent";
    status.setAttribute("aria-label", "Sent");
    const time = bubble.querySelector("small");
    if (time) time.appendChild(status);
    else bubble.appendChild(status);
  }
  status.classList.toggle("seen", seen);
  status.classList.toggle("sent", !seen);
  status.innerHTML = seen ? '<span class="ticks">✓✓</span><span class="seen-label">Seen</span>' : '<span class="ticks">✓</span>';
  status.setAttribute("aria-label", seen ? "Seen" : "Sent");
}

async function markIncomingAsRead(rows) {
  if (!currentUserId) return;
  const ids = rows
    .filter(row => row.classList.contains("theirs"))
    .map(row => row.dataset.messageId)
    .filter(Boolean);
  if (!ids.length) return;
  for (const messageId of ids) {
    try {
      const { error } = await supabase.from("read_receipts").insert([{ message_id: messageId, user_id: currentUserId }]);
      if (error && error.code !== "23505") break;
    } catch (_) {}
  }
}

async function paint() {
  if (busy || !currentUserId) return;
  const rows = chatRows();
  if (!rows.length) return;
  busy = true;
  try {
    const outgoing = rows.filter(row => row.classList.contains("mine"));
    const ids = outgoing.map(row => row.dataset.messageId).filter(Boolean);
    if (ids.length) {
      const { data: receipts } = await supabase
        .from("read_receipts")
        .select("message_id,user_id")
        .in("message_id", ids)
        .neq("user_id", currentUserId);
      const seenIds = new Set((receipts || []).map(receipt => receipt.message_id));
      outgoing.forEach(row => setStatus(row, seenIds.has(row.dataset.messageId)));
    }
    await markIncomingAsRead(rows);
  } catch (_) {
    outgoingFallback(rows);
  } finally {
    busy = false;
  }
}

function outgoingFallback(rows) {
  rows.filter(row => row.classList.contains("mine")).forEach(row => setStatus(row, false));
}

function watchReceipts() {
  try {
    receiptChannel = supabase
      .channel("convogram-read-receipts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "read_receipts" }, () => paint())
      .subscribe();
  } catch (_) {}
}

async function start() {
  if (!supabase) return;
  installStyle();
  try {
    const { data } = await supabase.auth.getUser();
    currentUserId = data?.user?.id || null;
  } catch (_) {}
  paint();
  watchReceipts();
  refreshTimer = setInterval(paint, 1500);
  new MutationObserver(() => paint()).observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
