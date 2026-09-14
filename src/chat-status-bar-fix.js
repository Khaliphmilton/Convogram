/* Android system bars own their geometry. Capacitor keeps the WebView inside
   the available viewport; chat therefore uses normal flex flow and only the
   platform-provided safe-area insets. */
const style = document.createElement("style");
style.id = "convogram-chat-status-bar-fix";
style.textContent = `
@media (max-width: 760px) {
  .messages-panel.chat-open > .chat-window > .chat-head,
  .messages-panel.chat-open > .chat-window .message-composer,
  .messages-panel.chat-open > .chat-window .message-stream {
    position: relative !important;
    inset: auto !important;
    box-sizing: border-box !important;
  }

  .messages-panel.chat-open > .chat-window > .chat-head {
    margin: 0 !important;
    padding-top: env(safe-area-inset-top, 0px) !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    align-items: center !important;
    flex: 0 0 auto !important;
  }

  .messages-panel.chat-open > .chat-window .message-stream {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    overflow-y: auto !important;
  }

  .messages-panel.chat-open > .chat-window .message-composer {
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    margin: 0 !important;
    flex: 0 0 auto !important;
    padding-bottom: env(safe-area-inset-bottom, 0px) !important;
    z-index: 20 !important;
  }

  .messages-panel.chat-open > .chat-window .reply-banner {
    position: relative !important;
    inset: auto !important;
  }

  .messages-panel.chat-open > .chat-window .convogram-emoji-panel {
    bottom: calc(100% + 8px) !important;
  }

  .convogram-stable-chat {
    position: fixed !important;
    inset: 0 !important;
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    padding-top: env(safe-area-inset-top, 0px) !important;
    padding-bottom: env(safe-area-inset-bottom, 0px) !important;
    box-sizing: border-box !important;
  }
}
`;
document.head.appendChild(style);
