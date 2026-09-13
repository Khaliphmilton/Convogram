import { App as CapacitorApp } from "@capacitor/app";

const findChatBackButton = () => document.querySelector(".chat-back-button");

const closeOpenChat = () => {
  const button = findChatBackButton();
  if (!button) return false;
  button.click();
  return true;
};

// Used by index.html's capture-phase popstate guard. Chat navigation always
// gets first priority over the global page navigation stack.
window.__convogramChatBack = (event) => {
  if (!findChatBackButton()) return false;
  event?.preventDefault?.();
  closeOpenChat();
  return true;
};

// Native Android back from Capacitor must close an open chat before the app
// navigation stack can move from Messages to another page.
let nativeBackListener = null;
CapacitorApp.addListener("backButton", () => {
  closeOpenChat();
}).then((listener) => {
  nativeBackListener = listener;
}).catch(() => {});

// Keep the hook clean across hot reloads.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    try { nativeBackListener?.remove?.(); } catch (_) {}
    if (window.__convogramChatBack) delete window.__convogramChatBack;
  });
}
