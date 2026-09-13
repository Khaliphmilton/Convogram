import { useEffect, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { supabase } from "../lib/supabase";
import { addMessageReaction, deleteMessage } from "../lib/messages";
import { MessagesPanel as OriginalMessagesPanel } from "./MessagesPanelOriginal";
import "./MessagesPanel.interaction-fix.css";
import "./MessagesMediaViewer.css";
import "./MessageLongPressMenu.css";

const REACTIONS = ["❤️", "😊", "😂", "💪", "👍"];

function looksLikeMessage(value) {
  return Boolean(value && typeof value === "object" && typeof value.id === "string" && typeof value.sender_id === "string" && ("content" in value || "message_type" in value || "media_url" in value));
}

function findMessage(value, depth = 0, seen = new Set()) {
  if (!value || depth > 7 || (typeof value === "object" && seen.has(value))) return null;
  if (typeof value === "object") seen.add(value);
  if (looksLikeMessage(value)) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findMessage(item, depth + 1, seen);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  const preferred = ["message", "item", "msg", "currentMessage", "data", "value", "memoizedState"];
  for (const key of preferred) {
    const found = findMessage(value[key], depth + 1, seen);
    if (found) return found;
  }
  if (depth < 4) {
    for (const key of Object.keys(value)) {
      if (preferred.includes(key)) continue;
      const found = findMessage(value[key], depth + 1, seen);
      if (found) return found;
    }
  }
  return null;
}

function findMessageWithId(value, id, depth = 0, seen = new Set()) {
  if (!value || depth > 10 || (typeof value === "object" && seen.has(value))) return null;
  if (typeof value === "object") seen.add(value);
  if (looksLikeMessage(value) && value.id === id) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findMessageWithId(item, id, depth + 1, seen);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  for (const key of Object.keys(value)) {
    const found = findMessageWithId(value[key], id, depth + 1, seen);
    if (found) return found;
  }
  return null;
}

function getFiber(element) {
  const key = Object.keys(element || {}).find((k) => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"));
  return key ? element[key] : null;
}

function findMessageTarget(target, host) {
  let element = target instanceof Element ? target : target?.parentElement;
  while (element && element !== host) {
    const fiber = getFiber(element);
    if (fiber) {
      const direct = findMessage(fiber.memoizedProps) || findMessage(fiber.pendingProps);
      if (direct?.id) return { element, message: direct };

      const fiberKey = typeof fiber.key === "string" ? fiber.key : null;
      if (fiberKey) {
        let cursor = fiber;
        for (let level = 0; cursor && level < 14; level += 1, cursor = cursor.return) {
          const candidates = [cursor.memoizedProps, cursor.pendingProps, cursor.memoizedState];
          for (const candidate of candidates) {
            const keyed = findMessageWithId(candidate, fiberKey);
            if (keyed) return { element, message: keyed };
          }
        }
      }
    }
    element = element.parentElement;
  }
  return null;
}

function findChatBackButton(root) {
  return root?.querySelector?.(".chat-back-button") || null;
}

export function MessagesPanel(props) {
  const hostRef = useRef(null);
  const [menu, setMenu] = useState(null);
  const [busy, setBusy] = useState(false);
  const pressRef = useRef({ timer: null, element: null, message: null, triggered: false, x: 0, y: 0 });

  const clearPress = () => {
    if (pressRef.current.timer) window.clearTimeout(pressRef.current.timer);
    pressRef.current = { timer: null, element: null, message: null, triggered: false, x: 0, y: 0 };
  };

  const openMenu = (element, message) => {
    if (!message?.id) return;
    const rect = element.getBoundingClientRect();
    const menuWidth = 230;
    const menuHeight = Math.min(440, window.innerHeight - 20);
    const left = Math.max(10, Math.min(window.innerWidth - menuWidth - 10, rect.left + rect.width / 2 - menuWidth / 2));
    let top = rect.top - menuHeight - 8;
    if (top < 10) top = Math.min(window.innerHeight - menuHeight - 10, rect.bottom + 8);
    setMenu({ message, element, left, top });
  };

  const beginPress = (event) => {
    const host = hostRef.current;
    if (!host || event.target?.closest?.(".convogram-longpress-menu")) return;
    const found = findMessageTarget(event.target, host);
    if (!found?.message?.id) return;
    clearPress();
    const point = event.touches?.[0];
    pressRef.current.element = found.element;
    pressRef.current.message = found.message;
    pressRef.current.x = point?.clientX ?? event.clientX ?? 0;
    pressRef.current.y = point?.clientY ?? event.clientY ?? 0;
    pressRef.current.timer = window.setTimeout(() => {
      pressRef.current.triggered = true;
      try { navigator.vibrate?.(18); } catch (_) {}
      openMenu(found.element, found.message);
    }, 600);
  };

  const movePress = (event) => {
    if (!pressRef.current.timer || pressRef.current.triggered) return;
    const point = event.touches?.[0];
    if (!point) return;
    if (Math.hypot(point.clientX - pressRef.current.x, point.clientY - pressRef.current.y) > 18) clearPress();
  };

  const endPress = (event) => {
    if (pressRef.current.triggered) {
      event.preventDefault?.();
      event.stopPropagation?.();
      clearPress();
      return;
    }
    clearPress();
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const onContext = (event) => {
      const found = findMessageTarget(event.target, host);
      if (!found?.message?.id) return;
      event.preventDefault();
      event.stopPropagation();
      openMenu(found.element, found.message);
    };
    const onClick = (event) => {
      if (menu && !event.target.closest?.(".convogram-longpress-menu")) setMenu(null);
      if (pressRef.current.triggered) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const onScroll = () => setMenu(null);
    host.addEventListener("touchstart", beginPress, { capture: true, passive: true });
    host.addEventListener("touchmove", movePress, { capture: true, passive: true });
    host.addEventListener("touchend", endPress, { capture: true, passive: false });
    host.addEventListener("touchcancel", clearPress, { capture: true, passive: true });
    host.addEventListener("mousedown", beginPress, true);
    host.addEventListener("mouseup", endPress, true);
    host.addEventListener("contextmenu", onContext, true);
    host.addEventListener("click", onClick, true);
    host.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      clearPress();
      host.removeEventListener("touchstart", beginPress, true);
      host.removeEventListener("touchmove", movePress, true);
      host.removeEventListener("touchend", endPress, true);
      host.removeEventListener("touchcancel", clearPress, true);
      host.removeEventListener("mousedown", beginPress, true);
      host.removeEventListener("mouseup", endPress, true);
      host.removeEventListener("contextmenu", onContext, true);
      host.removeEventListener("click", onClick, true);
      host.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [menu]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const closeOpenChat = () => {
      const backButton = findChatBackButton(host);
      if (!backButton) return false;
      backButton.click();
      return true;
    };

    const onPopState = (event) => {
      if (!findChatBackButton(host)) return;
      event.stopImmediatePropagation?.();
      closeOpenChat();
    };

    const backButtonListener = CapacitorApp.addListener("backButton", () => {
      closeOpenChat();
    });

    window.addEventListener("popstate", onPopState, true);
    return () => {
      backButtonListener.then?.((listener) => listener.remove()).catch?.(() => {});
      window.removeEventListener("popstate", onPopState, true);
    };
  }, []);

  const close = () => { setMenu(null); setBusy(false); };
  const messageText = (message) => message.content || (message.message_type === "image" ? "Photo" : message.message_type === "video" ? "Video" : message.message_type === "audio" ? "Voice message" : "Attachment");

  const copyMessage = async () => {
    if (!menu?.message) return;
    try { await navigator.clipboard.writeText(messageText(menu.message)); close(); } catch (_) { setBusy(false); }
  };

  const replyMessage = () => {
    if (!menu?.message) return;
    try { window.dispatchEvent(new CustomEvent("convogram_reply_requested", { detail: menu.message })); } catch (_) {}
    close();
  };

  const reactMessage = async (reaction) => {
    if (!menu?.message?.id || !props.userId) return;
    try { setBusy(true); await addMessageReaction(menu.message.id, props.userId, reaction); close(); }
    catch (e) { console.warn("Convogram reaction failed", e); setBusy(false); }
  };

  const deleteMsg = async () => {
    if (!menu?.message?.id || menu.message.sender_id !== props.userId) return;
    try { setBusy(true); await deleteMessage(menu.message.id); close(); }
    catch (e) { console.warn("Convogram delete failed", e); setBusy(false); }
  };

  const editMessage = () => {
    if (menu?.message?.sender_id !== props.userId || !menu?.element) return;
    menu.element.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    window.setTimeout(() => document.querySelector('button[aria-label="Edit message"]')?.click(), 50);
    close();
  };

  const forwardMessage = async () => {
    if (!menu?.message) return;
    const value = messageText(menu.message);
    try {
      if (navigator.share) await navigator.share({ title: "Convogram message", text: value });
      else await navigator.clipboard.writeText(value);
    } catch (_) {}
    close();
  };

  const togglePin = async () => {
    if (!menu?.message?.id || !props.userId) return;
    try {
      setBusy(true);
      const { data: existing } = await supabase.from("message_pins").select("message_id").eq("message_id", menu.message.id).eq("pinned_by", props.userId).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("message_pins").delete().eq("message_id", menu.message.id).eq("pinned_by", props.userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("message_pins").insert({ message_id: menu.message.id, pinned_by: props.userId });
        if (error) throw error;
      }
      close();
    } catch (e) { console.warn("Convogram pin failed", e); setBusy(false); }
  };

  const reportMessage = async () => {
    if (!menu?.message?.id || !props.userId || menu.message.sender_id === props.userId) return;
    try {
      setBusy(true);
      const { error } = await supabase.from("message_reports").insert({ message_id: menu.message.id, reporter_id: props.userId, reason: "other" });
      if (error) throw error;
      close();
    } catch (e) { console.warn("Convogram report failed", e); setBusy(false); }
  };

  return <div ref={hostRef} style={{ display: "contents" }}>
    <OriginalMessagesPanel {...props} onBack={() => {}} />
    {menu && <div className="convogram-longpress-menu" style={{ left: menu.left, top: menu.top }} role="menu" onClick={(e) => e.stopPropagation()}>
      <div className="convogram-longpress-reactions">
        {REACTIONS.map((r) => <button key={r} type="button" disabled={busy} onClick={() => reactMessage(r)} aria-label={`React ${r}`}>{r}</button>)}
      </div>
      <button type="button" onClick={replyMessage}><span>↩</span><span>Reply</span></button>
      <button type="button" onClick={copyMessage}><span>▣</span><span>Copy</span></button>
      <button type="button" onClick={forwardMessage}><span>↗</span><span>Forward</span></button>
      <button type="button" onClick={togglePin} disabled={busy}><span>📌</span><span>Pin / Unpin</span></button>
      {menu.message.sender_id === props.userId && !menu.message.is_deleted && <button type="button" onClick={editMessage}><span>✎</span><span>Edit</span></button>}
      {menu.message.sender_id === props.userId && !menu.message.is_deleted && <button type="button" className="danger" onClick={deleteMsg} disabled={busy}><span>⌫</span><span>Delete</span></button>}
      {menu.message.sender_id !== props.userId && <button type="button" className="danger" onClick={reportMessage} disabled={busy}><span>⚑</span><span>Report</span></button>}
    </div>}
  </div>;
}

export default MessagesPanel;