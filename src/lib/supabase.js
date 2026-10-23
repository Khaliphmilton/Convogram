import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://cckobknolduqnsimwvdu.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_dnyPhxVf2nVqHE1UOR96Fg_HpqE4M32";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
}

const DEFAULT_TIMEOUT_MS = 8000;
const timedFetch = (input, init = {}) => {
  const controller = new AbortController();
  const externalSignal = init.signal;
  const onAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort(externalSignal.reason);
    else externalSignal.addEventListener("abort", onAbort, { once: true });
  }
  const timeoutId = setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), DEFAULT_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", onAbort);
  });
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  global: { fetch: timedFetch },
});

if (typeof window !== "undefined" && !window.__convogramPushAuthListener) {
  window.__convogramPushAuthListener = true;
  const register = id => import("./push-notifications").then(m => m.initializePushNotifications(id)).catch(e => console.warn("Push setup failed", e));
  supabase.auth.getSession().then(({ data }) => { if (data?.session?.user?.id) register(data.session.user.id); }).catch(console.warn);
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user?.id) setTimeout(() => register(session.user.id), 0);
    else import("./push-notifications").then(m => m.resetPushNotificationUser());
  });
}

if (typeof document !== "undefined" && !document.getElementById("convogram-chat-layout-fix")) {
  const style = document.createElement("style");
  style.id = "convogram-chat-layout-fix";
  style.textContent = `
    .messages-panel.chat-open { position: relative !important; inset: auto !important; width: 100% !important; height: min(720px, calc(100vh - 132px)) !important; min-height: 0 !important; z-index: 1 !important; display: grid !important; background: #080808 !important; border-radius: 16px !important; }
    .messages-panel.chat-open .chat-window { width: 100% !important; height: 100% !important; min-height: 0 !important; display: flex !important; }
    .messages-panel.chat-open .chat-loading { flex: 1 !important; min-height: 220px !important; display: flex !important; align-items: center !important; justify-content: center !important; color: #aaa !important; font-size: 13px !important; background: #080808 !important; }
    @media (max-width: 760px) { .messages-panel.chat-open { height: calc(100vh - 90px) !important; min-height: 0 !important; border-radius: 10px !important; } }
  `;
  document.head.appendChild(style);
}
