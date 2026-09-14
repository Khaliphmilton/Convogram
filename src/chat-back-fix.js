import { App as CapacitorApp } from "@capacitor/app";

const findChatBackButton = () =>
  document.querySelector(".convogram-stable-chat-back, .chat-back-button");

const findGroupChatBackButton = () => document.querySelector(".group-chat-back");

const findEmojiPanel = () => document.querySelector(".convogram-emoji-panel");

const closeEmojiPicker = () => {
  const panel = findEmojiPanel();
  if (!panel) return false;

  const toggle = document.querySelector(
    '.convogram-stable-composer-wrap .convogram-stable-icon[aria-label="Emoji"]'
  );
  if (!toggle) return false;

  toggle.click();
  return true;
};

const closeOpenNestedScreen = () => {
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
  const handled = closeOpenNestedScreen();
  if (!handled) return false;

  event?.preventDefault?.();
  event?.stopPropagation?.();
  event?.stopImmediatePropagation?.();
  return true;
};

let nativeBackListener = null;

CapacitorApp.addListener("backButton", async () => {
  // 1. Picker is the top-most layer: close only the picker.
  if (closeEmojiPicker()) return;

  // 2. An open conversation: go back to the Messages conversation list,
  //    not to the Home page.
  const chatButton = findChatBackButton();
  if (chatButton) {
    chatButton.click();
    return;
  }

  // 3. Group-chat fallback.
  const groupButton = findGroupChatBackButton();
  if (groupButton) {
    groupButton.click();
    return;
  }

  // 4. Normal page/history navigation.
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
  });
}
