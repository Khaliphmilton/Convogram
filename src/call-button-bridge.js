import { supabase } from "./lib/supabase";
import { getDirectConversation } from "./lib/messages";

if (typeof window !== "undefined" && supabase) {
  const resolveAndStart = async (button) => {
    const type = button.querySelector("svg")?.getAttribute("class")?.includes("video") ? "video" : (button.getAttribute("aria-label") || "").toLowerCase().includes("video") ? "video" : "voice";
    const panel = button.closest(".messages-panel.chat-open");
    const name = panel?.querySelector(".chat-head-copy strong")?.textContent?.trim();
    if (!name) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) return;
      const safe = name.replace(/,/g, "");
      const { data: profiles } = await supabase.from("profiles").select("id, username, display_name").or(`username.eq.${safe},display_name.eq.${safe}`).neq("id", userId).limit(1);
      const profile = profiles?.[0];
      if (!profile) return;
      const conversation = await getDirectConversation(userId, profile.id);
      if (!conversation?.id) return;
      window.dispatchEvent(new CustomEvent("convogram-start-call", { detail: { type, conversationId: conversation.id, remoteUserId: profile.id, remoteName: profile.display_name || profile.username || name } }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent("convogram-call-error", { detail: { message: error?.message || "Could not start the call." } }));
    }
  };

  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.(".chat-call-actions button");
    if (!button || button.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    resolveAndStart(button);
  }, true);
}
