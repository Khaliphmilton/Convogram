const OVERLAY_ID = "convogram-media-fullscreen";
const STYLE_ID = "convogram-media-fullscreen-style";

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${OVERLAY_ID}{position:fixed;inset:0;z-index:100000;background:#000;display:flex;align-items:center;justify-content:center;width:100vw;height:100vh;touch-action:none}
    #${OVERLAY_ID} .convogram-media-fullscreen-stage{width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box}
    #${OVERLAY_ID} .convogram-media-fullscreen-stage img,#${OVERLAY_ID} .convogram-media-fullscreen-stage video{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block}
    #${OVERLAY_ID} [data-convogram-media-close]{position:absolute;top:calc(env(safe-area-inset-top,0px) + 10px);right:calc(env(safe-area-inset-right,0px) + 10px);z-index:3;width:44px;height:44px;border:1px solid rgba(255,255,255,.25);border-radius:50%;background:rgba(0,0,0,.65);color:#fff;font:400 32px/38px system-ui,sans-serif;padding:0;cursor:pointer}
  `;
  document.head.appendChild(style);
}

function onKeyDown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeViewer();
  }
}

function closeViewer() {
  const overlay = document.getElementById(OVERLAY_ID);
  document.removeEventListener("keydown", onKeyDown, true);
  if (!overlay) return;
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  overlay.remove();
  document.body.style.overflow = "";
}

function openViewer(media) {
  if (!media?.src || document.getElementById(OVERLAY_ID)) return;
  ensureStyles();
  const isVideo = media instanceof HTMLVideoElement;
  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.innerHTML = `<button type="button" data-convogram-media-close aria-label="Close full screen">×</button><div class="convogram-media-fullscreen-stage"></div>`;
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
  overlay.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && document.getElementById(OVERLAY_ID)) closeViewer();
  });
  overlay.requestFullscreen?.().catch(() => {});
  if (isVideo) clone.play?.().catch(() => {});
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
