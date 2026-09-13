const SWIPE_TRIGGER = 72;
const MAX_SWIPE = 88;
const VERTICAL_TOLERANCE = 34;
const state = new WeakMap();

function bubbleFromTarget(target) {
  return target?.closest?.(".message-bubble") || null;
}

function ensureIndicator(bubble) {
  let indicator = bubble.querySelector(".convogram-swipe-reply-indicator");
  if (indicator) return indicator;
  indicator = document.createElement("div");
  indicator.className = "convogram-swipe-reply-indicator";
  indicator.setAttribute("aria-label", "Reply");
  indicator.setAttribute("role", "img");
  indicator.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 11H8.8l3.6-3.6L11 6l-6 6 6 6 1.4-1.4L8.8 13H19v-2Z" fill="currentColor"/></svg>';
  Object.assign(indicator.style, {
    position: "absolute", left: "-52px", top: "50%", width: "40px", height: "40px",
    borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(7,20,38,.96)", border: "1px solid rgba(75,151,235,.35)",
    color: "#4b97eb", opacity: "0", pointerEvents: "none", zIndex: "4", boxSizing: "border-box",
    transform: "translateY(-50%) scale(.65)", transition: "opacity .12s ease, transform .12s ease"
  });
  const svg = indicator.querySelector("svg");
  if (svg) Object.assign(svg.style, { width: "21px", height: "21px", display: "block" });
  if (getComputedStyle(bubble).position === "static") bubble.style.position = "relative";
  bubble.appendChild(indicator);
  return indicator;
}

function reset(bubble) {
  const indicator = bubble.querySelector(".convogram-swipe-reply-indicator");
  bubble.style.transition = "transform .18s cubic-bezier(.2,.8,.2,1)";
  bubble.style.transform = "translate3d(0,0,0)";
  if (indicator) {
    indicator.style.transition = "opacity .16s ease, transform .16s ease";
    indicator.style.opacity = "0";
    indicator.style.transform = "translateY(-50%) scale(.65)";
  }
}

function finish(bubble, shouldReply) {
  const current = state.get(bubble);
  if (!current) return;
  current.handled = true;
  reset(bubble);
  if (shouldReply) {
    requestAnimationFrame(() => {
      const replyButton = bubble.querySelector('.message-tools button[title="Reply"]');
      if (replyButton) replyButton.click();
      state.delete(bubble);
    });
  } else {
    window.setTimeout(() => state.delete(bubble), 190);
  }
}

function begin(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  const bubble = bubbleFromTarget(event.target);
  if (!bubble) return;
  state.set(bubble, { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, active: false, handled: false, indicator: ensureIndicator(bubble) });
}

function move(event) {
  const bubble = bubbleFromTarget(event.target);
  if (!bubble) return;
  const current = state.get(bubble);
  if (!current || current.pointerId !== event.pointerId || current.handled) return;
  const dx = event.clientX - current.startX;
  const dy = Math.abs(event.clientY - current.startY);
  if (!current.active) {
    if (dy > VERTICAL_TOLERANCE || Math.abs(dx) < 8 || dx < 0) return;
    current.active = true;
    bubble.setPointerCapture?.(event.pointerId);
    bubble.style.transition = "none";
  }
  if (dx < 0) return;
  const distance = Math.min(MAX_SWIPE, dx * 0.82);
  const progress = Math.min(1, distance / SWIPE_TRIGGER);
  bubble.style.transform = `translate3d(${distance}px,0,0)`;
  current.indicator.style.opacity = String(Math.min(1, progress * 1.15));
  current.indicator.style.transform = `translateY(-50%) scale(${0.65 + progress * 0.35})`;
}

function end(event) {
  const bubble = bubbleFromTarget(event.target) || [...document.querySelectorAll(".message-bubble")].find((item) => state.get(item)?.pointerId === event.pointerId);
  if (!bubble) return;
  const current = state.get(bubble);
  if (!current || current.pointerId !== event.pointerId) return;
  const distance = Math.max(0, event.clientX - current.startX);
  const shouldReply = current.active && distance >= SWIPE_TRIGGER;
  bubble.releasePointerCapture?.(event.pointerId);
  finish(bubble, shouldReply);
}

document.addEventListener("pointerdown", begin, { passive: true });
document.addEventListener("pointermove", move, { passive: true });
document.addEventListener("pointerup", end, { passive: true });
document.addEventListener("pointercancel", end, { passive: true });
