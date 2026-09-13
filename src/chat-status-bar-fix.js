/* Final Android-only chat header safe-area fix.
   Keep the chat header itself below the system status bar without moving
   the message stream or composer outside the chat viewport. */
const style = document.createElement("style");
style.id = "convogram-chat-status-bar-fix";
style.textContent = `
@media (max-width: 760px) {
  .messages-panel.chat-open > .chat-window > .chat-head {
    margin-top: max(env(safe-area-inset-top, 0px), 24px) !important;
    padding-top: 0 !important;
    height: 66px !important;
    min-height: 66px !important;
    max-height: 66px !important;
    box-sizing: border-box !important;
  }
}
`;
document.head.appendChild(style);
