import { MessagesPanel as OriginalMessagesPanel } from "./MessagesPanelOriginal";

// Keep the Messages screen mounted directly. The original panel owns the
// conversation list, chat view, Android back handling, safe-area layout,
// reactions, replies, media, calls and composer. The previous interaction
// wrapper could prevent the panel from rendering in some mobile builds.
export function MessagesPanel(props) {
  return <OriginalMessagesPanel {...props} />;
}

export default MessagesPanel;
