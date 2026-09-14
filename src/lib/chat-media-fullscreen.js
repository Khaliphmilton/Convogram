const OVERLAY_ID = "convogram-media-fullscreen";

function closeViewer() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) return;
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  overlay.remove();
  document.body.style.overflow = "";
}

function openViewer(media) {
  if (!media?.src || document.getElementById(OVERLAY_ID)) return;
  const isVideo = media instanceof HTMLVideoElement;
  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.innerHTML = `
    <button type="button" data-convogram-media-close aria-label="Close full screen">×</button>
    <div class="convogram-media-fullscreen-stage"></div>
  `;
  const stage = overlay.querySelector(".convogram-media-fullscreen-stage");
  const close = overlay.querySelector("[data-convogram-media-close]");
  const clone = media.cloneNode(true);
  clone.removeAttribute("loading");
  clone.controls = isVideo;
  clone.autoplay = isVideo;
  clone.playsInline = true;
  clone.style.cssText = "max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;border-radius:0;display:block;";
  stage.appendChild(clone);
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
  close.addEventListener("click", closeViewer);
  overlay.addEventListener("click", event => { if (event.target === overlay) closeViewer(); });
  document.addEventListener("keydown", onKeyDown, true);
  overlay.addEventListener("fullscreenchange", () => {}, { once: true });
  overlay.requestFullscreen?.().catch(() => {});
  if (isVideo) clone.play?.().catch(() => {});
}

function onKeyDown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeViewer();
    document.removeEventListener("keydown", onKeyDown, true);
  }
}

function attach(media) {
  if (!(media instanceof HTMLImageElement || media instanceof HTMLVideoElement)) return;
  if (media.dataset.convogramFullscreenAttached === "true") return;
  media.dataset.convogramFullscreenAttached = "true";
  media.style.cursor = "zoom-in";
  media.addEventListener("click", event => {
    if (event.target.closest?.("[data-convogram-save-media]")) return;
    openViewer(media);
  });
}

function scan() {
  document.querySelectorAll(".convogram-chat-image, .convogram-chat-video").forEach(attach);
}

function start() {
  scan();
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
