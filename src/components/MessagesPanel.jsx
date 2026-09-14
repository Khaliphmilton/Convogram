import { Component } from "react";
import { MessagesPanel as OriginalMessagesPanel } from "./MessagesPanelOriginal";
import "./MessagesPanel.shell.css";

class MessagesErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("Convogram Messages failed to render:", error);
  }

  retry = () => this.setState({ failed: false });

  render() {
    if (this.state.failed) {
      return (
        <section className="messages-fallback-shell" aria-live="polite">
          <div className="messages-fallback-card">
            <strong>Messages</strong>
            <p>The Messages screen could not render.</p>
            <button type="button" onClick={this.retry}>Try again</button>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}

// Keep the complete original chat implementation, but give the page a
// guaranteed visible container so a mobile rendering failure can never turn
// the entire Messages page into an empty screen.
export function MessagesPanel(props) {
  return (
    <div className="messages-page-shell">
      <div className="messages-page-fallback-content" aria-hidden="true">
        <div className="messages-page-fallback-title">Messages</div>
      </div>
      <MessagesErrorBoundary>
        <OriginalMessagesPanel {...props} />
      </MessagesErrorBoundary>
    </div>
  );
}

export default MessagesPanel;
