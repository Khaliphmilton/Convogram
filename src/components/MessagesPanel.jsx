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
    let startX = 0;
    let startY = 0;

    const clearTimer = () => {
      if (timer) window.clearTimeout(timer);
      timer = null;
    };

    const onTouchStart = (event) => {
      const row = event.target?.closest?.(".message-row");
      if (!row || !host.contains(row)) return;
      clearTimer();
      longPressed = false;
      const point = event.touches?.[0];
      startX = point?.clientX || 0;
      startY = point?.clientY || 0;
      timer = window.setTimeout(() => {
        longPressed = true;
      }, 650);
    };

    const onTouchMove = (event) => {
      if (longPressed || !timer) return;
      const point = event.touches?.[0];
      if (!point) return;
      const dx = point.clientX - startX;
      const dy = point.clientY - startY;
      if (Math.hypot(dx, dy) > 18) clearTimer();
    };

    const onTouchEnd = () => {
      if (longPressed) {
        // Keep this guard alive long enough to block Android's synthetic click.
        window.setTimeout(() => {
          longPressed = false;
        }, 600);
        return;
      }
      clearTimer();
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
