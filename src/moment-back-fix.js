window.addEventListener("popstate", (event) => {
  const viewer = document.querySelector(".story-viewer");
  if (!viewer) return;

  const closeButton = viewer.querySelector('[aria-label="Close story"]');
  if (closeButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeButton.click();

    // Moments are a home-level experience. Leaving a Moment should always
    // return to the Home page instead of restoring another navigation state.
    window.setTimeout(() => {
      const homeButton = Array.from(document.querySelectorAll("button"))
        .find((button) => button.textContent?.trim() === "Home");
      if (homeButton) homeButton.click();
    }, 0);
  }
}, true);
