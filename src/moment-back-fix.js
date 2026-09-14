window.addEventListener("popstate", (event) => {
  const viewer = document.querySelector(".story-viewer");
  if (!viewer) return;

  const closeButton = viewer.querySelector('[aria-label="Close story"]');
  if (closeButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeButton.click();
  }
}, true);
