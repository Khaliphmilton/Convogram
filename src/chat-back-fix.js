import { App as CapacitorApp } from "@capacitor/app";

const findChatBackButton = () => document.querySelector(".chat-back-button");
const findGroupChatBackButton = () => document.querySelector(".group-chat-back");
const closeEmojiPicker = () => {
  const panel = document.querySelector(".convogram-emoji-panel");
  if (!panel) return false;
  const toggle = document.querySelector(".convogram-emoji-toggle");
  if (!toggle) return false;
  toggle.click();
  return true;
};

const closeOpenNestedScreen = () => {
  // The emoji picker is an in-chat overlay, so Android Back closes it first
  // without leaving the conversation or clearing the message draft.
  if (closeEmojiPicker()) return true;

  const chatButton = findChatBackButton();
  if (chatButton) {
    chatButton.click();
    return true;
  }
  const groupButton = findGroupChatBackButton();
  if (groupButton) {
    groupButton.click();
    return true;
  }
  return false;
};

window.__convogramChatBack = (event) => {
  if (!closeOpenNestedScreen()) return false;
  event?.preventDefault?.();
  return true;
};

let nativeBackListener = null;
CapacitorApp.addListener("backButton", async () => {
  // Nested screens and in-chat overlays always get first priority.
  if (closeOpenNestedScreen()) return;

  // Notifications and other in-app pages are represented by browser history.
  const state = window.history.state;
  if (state?.overlay || state?.page) {
    window.history.back();
    return;
  }

  // At Convogram's root page, let Android perform its normal app-exit action.
  try {
    await CapacitorApp.exitApp();
  } catch (_) {
    window.history.back();
  }
}).then((listener) => {
  nativeBackListener = listener;
}).catch(() => {});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    try { nativeBackListener?.remove?.(); } catch (_) {}
    if (window.__convogramChatBack) delete window.__convogramChatBack;
  });
}
