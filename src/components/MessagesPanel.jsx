import { Component } from "react";
import { MessagesPanel as OriginalMessagesPanel } from "./MessagesPanelOriginal";

class MessagesErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { failed: true, error };
  }

  componentDidCatch(error) {
    console.error("Convogram Messages failed to render:", error);
  }

  retry = () => {
    this.setState({ failed: false, error: null });
  };

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <section
        aria-live="polite"
        style={{
          minHeight: "min(720px, calc(100vh - 132px))",
          height: "calc(100vh - 132px)",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          boxSizing: "border-box",
          background: "#080808",
          color: "#f5f5f5",
          border: "1px solid #202020",
          borderRadius: "16px",
          textAlign: "center",
        }}
      >
        <div>
          <strong style={{ display: "block", fontSize: "18px", marginBottom: "8px" }}>
            Messages could not open
          </strong>
          <p style={{ color: "#8f8f8f", margin: "0 0 16px", maxWidth: 320 }}>
            The Messages screen hit an error. Your chats are not deleted.
          </p>
          <button
            type="button"
            onClick={this.retry}
            style={{
              border: 0,
              borderRadius: "999px",
              padding: "10px 18px",
              background: "#fff",
              color: "#080808",
              fontWeight: 700,
            }}
          >
            Try again
          </button>
          {import.meta.env?.DEV && this.state.error?.message ? (
            <small style={{ display: "block", color: "#666", marginTop: "12px", maxWidth: 320 }}>
              {this.state.error.message}
            </small>
          ) : null}
        </div>
      </section>
    );
  }
}

// Keep the original Messages implementation intact, but prevent a render-time
// exception from turning the entire Messages page into a blank screen.
export function MessagesPanel(props) {
  return (
    <MessagesErrorBoundary>
      <OriginalMessagesPanel {...props} />
    </MessagesErrorBoundary>
  );
}

export default MessagesPanel;
