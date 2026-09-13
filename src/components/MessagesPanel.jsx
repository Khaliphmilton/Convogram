import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { addMessageReaction, deleteMessage } from "../lib/messages";
import { MessagesPanel as OriginalMessagesPanel } from "./MessagesPanelOriginal";
import "./MessagesPanel.interaction-fix.css";
import "./MessagesMediaViewer.css";
import "./MessageLongPressMenu.css";

const REACTIONS = ["❤️", "😊", "😂", "💪", "👍"];

export function MessagesPanel(props) {
  const hostRef = useRef(null);
  const [menu, setMenu] = useState(null);
  const [busy, setBusy] = useState(false);
  const pressRef = useRef({ timer: null, row: null, triggered: false, x: 0, y: 0 });

  const clearPress = () => {
    if (pressRef.current.timer) window.clearTimeout(pressRef.current.timer);
    pressRef.current.timer = null;
    pressRef.current.row = null;
    pressRef.current.triggered = false;
  };

  const getMessage = (row) => {
    try { return row?.__convogramMessage || JSON.parse(row?.dataset?.message || "null"); } catch (_) { return null; }
  };

  const openMenu = (row) => {
    const message = getMessage(row);
    if (!message?.id) return;
    const rect = row.getBoundingClientRect();
    const menuWidth = 230;
    const left = Math.max(10, Math.min(window.innerWidth - menuWidth - 10, rect.left + rect.width / 2 - menuWidth / 2));
    const top = Math.max(10, Math.min(window.innerHeight - 430, rect.top - 8));
    setMenu({ message, left, top });
  };

  const beginPress = (event) => {
    const row = event.target?.closest?.(".message-row");
    if (!row || !hostRef.current?.contains(row)) return;
    clearPress();
    const point = event.touches?.[0];
    pressRef.current.row = row;
    pressRef.current.x = point?.clientX ?? event.clientX ?? 0;
    pressRef.current.y = point?.clientY ?? event.clientY ?? 0;
    pressRef.current.timer = window.setTimeout(() => {
      pressRef.current.triggered = true;
      openMenu(row);
    }, 620);
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
      const row = event.target?.closest?.(".message-row");
      if (!row || !host.contains(row)) return;
      event.preventDefault();
      event.stopPropagation();
      openMenu(row);
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
    host.addEventListener("mouseleave", clearPress, true);
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
      host.removeEventListener("mouseleave", clearPress, true);
      host.removeEventListener("contextmenu", onContext, true);
      host.removeEventListener("click", onClick, true);
      host.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [menu]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const rows = host.querySelectorAll(".message-row");
    rows.forEach((row) => {
      const bubble = row.querySelector(".message-bubble");
      const text = bubble?.querySelector(".message-text")?.textContent || "";
      const media = bubble?.querySelector("img, video, audio");
      const message = {
        id: row.getAttribute("data-message-id"),
        sender_id: row.classList.contains("mine") ? props.userId : "other",
        content: text,
        message_type: media?.tagName?.toLowerCase() === "video" ? "video" : media?.tagName?.toLowerCase() === "img" ? "image" : "text",
        media_url: media?.currentSrc || media?.src || null,
        is_deleted: Boolean(bubble?.querySelector(".message-deleted"))
      };
      row.__convogramMessage = message;
    });
  });

  const close = () => setMenu(null);

  const copyMessage = async () => {
    if (!menu?.message) return;
    const value = menu.message.content || (menu.message.message_type === "image" ? "Photo" : menu.message.message_type === "video" ? "Video" : "Attachment");
    try { await navigator.clipboard.writeText(value); close(); } catch (_) { setBusy(false); }
  };

  const replyMessage = () => {
    const row = [...(hostRef.current?.querySelectorAll(".message-row") || [])].find(r => r.__convogramMessage?.id === menu?.message?.id);
    if (!row) return;
    const x = row.getBoundingClientRect().left + 10;
    try {
      row.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [{ clientX: x, clientY: 100 }] }));
      row.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [{ clientX: x + 90, clientY: 100 }] }));
    } catch (_) {
      row.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
    close();
  };

  const reactMessage = async (reaction) => {
    if (!menu?.message?.id || !props.userId) return;
    try {
      setBusy(true);
      await addMessageReaction(menu.message.id, props.userId, reaction);
      close();
    } catch (e) {
      console.warn("Convogram reaction failed", e);
      setBusy(false);
    }
  };

  const deleteMsg = async () => {
    if (!menu?.message?.id || menu.message.sender_id !== props.userId) return;
    try {
      setBusy(true);
      await deleteMessage(menu.message.id);
      close();
    } catch (e) {
      console.warn("Convogram delete failed", e);
      setBusy(false);
    }
  };

  const editMessage = () => {
    const row = [...(hostRef.current?.querySelectorAll(".message-row") || [])].find(r => r.__convogramMessage?.id === menu?.message?.id);
    const button = row?.querySelector('button[aria-label="Edit message"]');
    if (button) button.click();
    else {
      row?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
      window.setTimeout(() => row?.querySelector('button[aria-label="Edit message"]')?.click(), 0);
    }
    close();
  };

  const forwardMessage = async () => {
    if (!menu?.message) return;
    const value = menu.message.content || (menu.message.media_url || "Attachment");
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
      if (existing) await supabase.from("message_pins").delete().eq("message_id", menu.message.id).eq("pinned_by", props.userId);
      else await supabase.from("message_pins").insert({ message_id: menu.message.id, pinned_by: props.userId });
      close();
    } catch (e) {
      console.warn("Convogram pin failed", e);
      setBusy(false);
    }
  };

  const reportMessage = async () => {
    if (!menu?.message?.id || !props.userId || menu.message.sender_id === props.userId) return;
    try {
      setBusy(true);
      await supabase.from("message_reports").insert({ message_id: menu.message.id, reporter_id: props.userId, reason: "other" });
      close();
    } catch (e) {
      console.warn("Convogram report failed", e);
      setBusy(false);
    }
  };

  return <div ref={hostRef} style={{ display: "contents" }}>
    <OriginalMessagesPanel {...props} />
    {menu && <div className="convogram-longpress-menu" style={{ left: menu.left, top: menu.top }} role="menu" onClick={(e) => e.stopPropagation()}>
      <div className="convogram-longpress-reactions">{REACTIONS.map(r => <button key={r} type="button" disabled={busy} onClick={() => reactMessage(r)}>{r}</button>)}</div>
      <button type="button" onClick={replyMessage}>↩ <span>Reply</span></button>
      <button type="button" onClick={copyMessage}>▣ <span>Copy</span></button>
      <button type="button" onClick={forwardMessage}>↗ <span>Forward</span></button>
      <button type="button" onClick={togglePin} disabled={busy}>📌 <span>Pin / Unpin</span></button>
      {menu.message.sender_id === props.userId && !menu.message.is_deleted && <button type="button" onClick={editMessage}>✎ <span>Edit</span></button>}
      {menu.message.sender_id === props.userId && !menu.message.is_deleted && <button type="button" className="danger" onClick={deleteMsg} disabled={busy}>⌫ <span>Delete</span></button>}
      {menu.message.sender_id !== props.userId && <button type="button" className="danger" onClick={reportMessage} disabled={busy}>⚑ <span>Report</span></button>}
    </div>}
  </div>;
}

export default MessagesPanel;
