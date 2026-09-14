/* Final Android chat safe-area boundaries.
   The chat header is the top barrier below Android's status bar.
   The composer is the bottom barrier above Android's navigation/gesture area.
   The message stream fills only the space between those two boundaries. */
const style = document.createElement("style");
style.id = "convogram-chat-status-bar-fix";
style.textContent = 
`@media (max-width: 760px) {
  :root {
    --convogram-chat-safe-top: max(env(safe-area-inset-top, 0px), 24px);
    --convogram-chat-safe-bottom: max(env(safe-area-inset-bottom, 0px), 24px);
  }

  /* TOP BARRIER: the visible chat header starts below Android's status bar. */
  .messages-panel.chat-open > .chat-window > .chat-head {
    margin-top: 0 !important;
    padding-top: var(--convogram-chat-safe-top) !important;
    height: calc(66px + var(--convogram-chat-safe-top)) !important;
    min-height: calc(66px + var(--convogram-chat-safe-top)) !important;
    max-height: calc(66px + var(--convogram-chat-safe-top)) !important;
    box-sizing: border-box !important;
    align-items: center !important;
    flex: 0 0 calc(66px + var(--convogram-chat-safe-top)) !important;
  }

  /* BOTTOM BARRIER: the typing bar itself sits directly above Android's
     navigation/gesture area and never occupies the system-bar space. */
  .messages-panel.chat-open > .chat-window .message-composer {
    position: absolute !important;
    left: 0 !important;
    right: 0 !important;
    bottom: var(--convogram-chat-safe-bottom) !important;
    height: 58px !important;
    min-height: 58px !important;
    max-height: 58px !important;
    margin: 0 !important;
    box-sizing: border-box !important;
    z-index: 20 !important;
  }

  /* Keep the last message and scrolling surface clear of the typing bar
     and the Android navigation area. */
  .messages-panel.chat-open > .chat-window .message-stream {
    padding-bottom: calc(58px + var(--convogram-chat-safe-bottom)) !important;
    min-height: 0 !important;
  }

  /* Reply/emoji surfaces also stop above the typing bar. */
  .messages-panel.chat-open > .chat-window .reply-banner {
    bottom: calc(58px + var(--convogram-chat-safe-bottom)) !important;
  }

  .messages-panel.chat-open > .chat-window .convogram-emoji-panel {
    bottom: calc(58px + var(--convogram-chat-safe-bottom)) !important;
  }
}
`;
document.head.appendChild(style);
