/* Final Android-only chat header safe-area fix.
   Keep the chat header itself below the system status bar without adding
   margin outside the flex layout. This prevents the chat viewport from
   becoming taller than the physical screen. */
const style = document.createElement("style");
style.id = "convogram-chat-status-bar-fix";
style.textContent = `
@media (max-width: 760px) {
  .messages-panel.chat-open > .chat-window > .chat-head {
    margin-top: 0 !important;
    padding-top: max(env(safe-area-inset-top, 0px), 24px) !important;
    height: calc(66px + max(env(safe-area-inset-top, 0px), 24px)) !important;
    min-height: calc(66px + max(env(safe-area-inset-top, 0px), 24px)) !important;
    max-height: calc(66px + max(env(safe-area-inset-top, 0px), 24px)) !important;
    box-sizing: border-box !important;
    align-items: center !important;
  }
}
`;
document.head.appendChild(style);
