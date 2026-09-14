import { App as CapacitorApp } from "@capacitor/app";

const findChatBackButton = () => document.querySelector(".chat-back-button");
const findGroupChatBackButton = () => document.querySelector(".group-chat-back");

const closeEmojiPicker = () => {
  // The toggle carries the authoritative open/closed state. Check it first
  // so Android Back cannot fall through to the chat back button.
  const toggle = document.querySelector(".convogram-emoji-toggle.active");
  if (!toggle) return false;
  toggle.click();
  return true;
};

const closeOpenNestedScreen = () => {
  // Emoji picker is an in-chat overlay. It must consume Android Back before
  // the conversation's Back button gets a chance to run.
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
  event?.stopPropagation?.();
  return true;
};

let nativeBackListener = null;
CapacitorApp.addListener("backButton", async () => {
  // Never leave an open chat while the emoji picker is active.
  if (closeEmojiPicker()) return;

  const chatButton = findChatBackButton();
  if (chatButton) {
    chatButton.click();
    return;
  }

  const groupButton = findGroupChatBackButton();
  if (groupButton) {
    groupButton.click();
    return;
  }

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
