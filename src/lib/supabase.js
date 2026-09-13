import { createClient } from "@supabase/supabase-js";

// Build-time environment variables are preferred for deployments.
// The publishable key is safe for browser use; never put a service-role/secret key here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://cckobknolduqnsimwvdu.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_dnyPhxVf2nVqHE1UOR96Fg_HpqE4M32";

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY."
  );
}

// Keep the Supabase session persistent on this device so a user stays logged in
// after closing/reopening Convogram. Supabase manages the session tokens in its
// auth storage; Convogram never stores the user's password.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Safety override for the mobile chat view. The previous full-viewport fixed
// layer could cover the application with a black surface while a conversation
// was still loading. Keep the chat inside the app content so loading/errors
// remain visible and the rest of Convogram cannot be accidentally obscured.
if (typeof document !== "undefined" && !document.getElementById("convogram-chat-layout-fix")) {
  const style = document.createElement("style");
  style.id = "convogram-chat-layout-fix";
  style.textContent = `
    .messages-panel.chat-open {
      position: relative !important;
      inset: auto !important;
      width: 100% !important;
      height: min(720px, calc(100vh - 132px)) !important;
      min-height: 0 !important;
      z-index: 1 !important;
      display: grid !important;
      background: #080808 !important;
      border-radius: 16px !important;
    }
    .messages-panel.chat-open .chat-window {
      width: 100% !important;
      height: 100% !important;
      min-height: 0 !important;
      display: flex !important;
    }
    .messages-panel.chat-open .chat-loading {
      flex: 1 !important;
      min-height: 220px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      color: #aaa !important;
      font-size: 13px !important;
      background: #080808 !important;
    }
    @media (max-width: 760px) {
      .messages-panel.chat-open {
        height: calc(100vh - 90px) !important;
        min-height: 0 !important;
        border-radius: 10px !important;
      }
    }
  `;
  document.head.appendChild(style);
}
