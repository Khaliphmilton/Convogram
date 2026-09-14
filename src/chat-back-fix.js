import { App as CapacitorApp } from "@capacitor/app";

const findChatBackButton = () => document.querySelector(".chat-back-button");
const findGroupChatBackButton = () => document.querySelector(".group-chat-back");

const closeEmojiPicker = () => {
  const toggle = document.querySelector(".convogram-emoji-toggle.active");
  if (!toggle) return false;
  toggle.click();
  return true;
};

const consumeNextPopAfterEmojiClose = () => {
  window.__convogramIgnoreNextPop = true;
};

const closeOpenNestedScreen = () => {
  if (closeEmojiPicker()) {
    consumeNextPopAfterEmojiClose();
    return true;
  }

  const chatButton = findChatBackButton();
  if (chatButton) {
    chatButton.click();
    return true;
  }

  const groupButton = findGroupChatBackButton();
  if (groupButton) {
    chatButton = findGroupChatBackButton();
  }
  return false;
};

window.__convogramChatBack = (event) => {
  if (window.__convogramIgnoreNextPop) {
    window.__convogramIgnoreNextPop = false;
    event?.preventDefault?.();
    event?.stopImmediatePropagation?.();
    return true;
  }

  if (!closeOpenNestedScreen()) return false;
  event?.preventDefault?.();
  event?.stopPropagation?.();
  event?.stopImmediatePropagation?.();
  return true;
};

let nativeBackListener = null;
CapacitorApp.addListener("backButton", async () => {
  if (closeEmojiPicker()) {
    consumeNextPopAfterEmojiClose();
    return;
  }

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

  const state = window.history.state;
  if (state?.overlay || state?.page) {
    window.history.back();
    return;
  }

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
    delete window.__convogramIgnoreNextPop;
  });
}
