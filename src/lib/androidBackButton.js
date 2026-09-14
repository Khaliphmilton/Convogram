import { App } from '@capacitor/app';

let listenerHandle = null;

export function setupAndroidBackButton(getState) {
  if (listenerHandle) return () => {};

  const handler = async () => {
    const state = getState?.() || {};

    // Nested screens always close first instead of exiting the app.
    if (state.closeNestedScreen) {
      const handled = await state.closeNestedScreen();
      if (handled !== false) return;
    }

    // If the app exposes a browser-style history stack, go back in it.
    if (window.history.length > 1 && state.allowHistoryBack !== false) {
      window.history.back();
      return;
    }

    // No in-app screen remains: let Android perform its normal exit behavior.
    await App.exitApp();
  };

  App.addListener('backButton', handler).then((handle) => {
    listenerHandle = handle;
  });

  return () => {
    const handle = listenerHandle;
    listenerHandle = null;
    handle?.remove?.();
  };
}
