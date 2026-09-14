/* Android owns system-bar geometry. The WebView is already inside the native
   safe viewport, so chat uses normal flex flow and never guesses device pixels. */
const style = document.createElement("style");
style.id = "convogram-chat-status-bar-fix";
style.textContent = `
@media (max-width: 760px) {
  .messages-panel.chat-open > .chat-window > .chat-head {
    position: relative !important;
    inset: auto !important;
    margin: 0 !important;
    padding-top: 0 !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    box-sizing: border-box !important;
    align-items: center !important;
    flex: 0 0 auto !important;
  }

  .messages-panel.chat-open > .chat-window .message-composer {
    position: relative !important;
    inset: auto !important;
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    margin: 0 !important;
    box-sizing: border-box !important;
    flex: 0 0 auto !important;
    padding-bottom: env(safe-area-inset-bottom, 0px) !important;
    z-index: 20 !important;
  }

  .messages-panel.chat-open > .chat-window .message-stream {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    padding-bottom: 0 !important;
    overflow-y: auto !important;
  }

  .messages-panel.chat-open > .chat-window .reply-banner {
    position: relative !important;
    inset: auto !important;
  }

  .messages-panel.chat-open > .chat-window .convogram-emoji-panel {
    bottom: calc(100% + 8px) !important;
  }
}
`;
document.head.appendChild(style);
