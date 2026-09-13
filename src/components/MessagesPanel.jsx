import { useEffect, useRef } from "react";
import { MessagesPanel as OriginalMessagesPanel } from "./MessagesPanelOriginal";
import "./MessagesPanel.interaction-fix.css";

export function MessagesPanel(props) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let timer = null;
    let longPressed = false;

    const clearTimer = () => {
      if (timer) window.clearTimeout(timer);
      timer = null;
    };

    const onTouchStart = (event) => {
      const row = event.target?.closest?.(".message-row");
      if (!row || !host.contains(row)) return;
      clearTimer();
      longPressed = false;
      timer = window.setTimeout(() => {
        longPressed = true;
      }, 650);
    };

    const onTouchMove = () => {
      if (!longPressed) clearTimer();
    };

    const onTouchEnd = () => {
      if (longPressed) {
        // The original chat component opens its long-press menu on this gesture.
        // Keep the synthetic follow-up click from immediately closing that menu.
        window.setTimeout(() => {
          longPressed = false;
        }, 0);
      } else {
        clearTimer();
      }
    };

    const onClickCapture = (event) => {
      if (!longPressed) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    };

    host.addEventListener("touchstart", onTouchStart, { passive: true, capture: true });
    host.addEventListener("touchmove", onTouchMove, { passive: true, capture: true });
    host.addEventListener("touchend", onTouchEnd, { passive: false, capture: true });
    host.addEventListener("click", onClickCapture, { capture: true });

    return () => {
      clearTimer();
      host.removeEventListener("touchstart", onTouchStart, true);
      host.removeEventListener("touchmove", onTouchMove, true);
      host.removeEventListener("touchend", onTouchEnd, true);
      host.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  return <div ref={hostRef} style={{ display: "contents" }}><OriginalMessagesPanel {...props} /></div>;
}

export default MessagesPanel;
