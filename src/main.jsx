import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  return (
    <div>
      <h1>Welcome to Convogram</h1>
      <p>Connect. Chat. Share. Discover.</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
