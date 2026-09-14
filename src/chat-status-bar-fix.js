/* Android owns system-bar geometry. The WebView is padded once with the
   exact WindowInsets by MainActivity, so the chat must not add guessed pixels. */
const style = document.createElement("style");
style.id = "convogram-chat-status-bar-fix";
style.textContent = `
@media (max-width: 760px) {
  :root {
    --convogram-chat-safe-top: 0px;
    --convogram-chat-safe-bottom: 0px;
  }

  .messages-panel.chat-open > .chat-window > .chat-head {
    margin-top: 0 !important;
    padding-top: 0 !important;
    height: 66px !important;
    min-height: 66px !important;
    max-height: 66px !important;
    box-sizing: border-box !important;
    align-items: center !important;
    flex: 0 0 66px !important;
  }

  .messages-panel.chat-open > .chat-window .message-composer {
    position: relative !important;
    left: auto !important;
    right: auto !important;
    bottom: auto !important;
    height: 68px !important;
    min-height: 68px !important;
    max-height: 68px !important;
    margin: 0 !important;
    box-sizing: border-box !important;
    z-index: 20 !important;
  }

  .messages-panel.chat-open > .chat-window .message-stream {
    padding-bottom: 18px !important;
    min-height: 0 !important;
  }

  .messages-panel.chat-open > .chat-window .reply-banner {
    position: relative !important;
    bottom: auto !important;
  }

  .messages-panel.chat-open > .chat-window .convogram-emoji-panel {
    bottom: calc(100% + 8px) !important;
  }
}
`;
document.head.appendChild(style);
