const SWIPE_TRIGGER = 64;
const VERTICAL_TOLERANCE = 44;
const state = new WeakMap();

function bubbleFromTarget(target) {
  return target?.closest?.(".message-bubble") || null;
}

function cancel(bubble) {
  const current = state.get(bubble);
  if (!current) return;
  state.delete(bubble);
  bubble.style.transform = "";
}

function begin(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  const bubble = bubbleFromTarget(event.target);
  if (!bubble) return;
  state.set(bubble, {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    active: false,
    handled: false,
  });
}

function move(event) {
  const bubble = bubbleFromTarget(event.target);
  if (!bubble) return;
  const current = state.get(bubble);
  if (!current || current.pointerId !== event.pointerId || current.handled) return;

  const dx = event.clientX - current.startX;
  const dy = Math.abs(event.clientY - current.startY);
  if (dx <= 8 || dy > VERTICAL_TOLERANCE) return;

  current.active = true;
  const distance = Math.min(dx, SWIPE_TRIGGER);
  bubble.style.transform = `translateX(${distance}px)`;
  if (distance >= SWIPE_TRIGGER) {
    current.handled = true;
    bubble.style.transform = "translateX(0)";
    bubble.dispatchEvent(new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: event.clientX,
      clientY: event.clientY,
    }));
    requestAnimationFrame(() => {
      const replyButton = bubble.querySelector('.message-tools button[title="Reply"]');
      if (replyButton) replyButton.click();
      state.delete(bubble);
    });
  }
}

function end(event) {
  const bubble = bubbleFromTarget(event.target);
  if (!bubble) return;
  const current = state.get(bubble);
  if (!current || current.pointerId !== event.pointerId) return;
  if (!current.handled) cancel(bubble);
}

document.addEventListener("pointerdown", begin, { passive: true });
document.addEventListener("pointermove", move, { passive: true });
document.addEventListener("pointerup", end, { passive: true });
document.addEventListener("pointercancel", end, { passive: true });
document.addEventListener("pointerleave", end, { passive: true });
