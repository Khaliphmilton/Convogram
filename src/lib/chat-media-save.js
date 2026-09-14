import { Capacitor } from "@capacitor/core";
import { Media } from "@capacitor-community/media";

const SAVE_ATTR = "data-convogram-save-media";
const ALBUM_NAME = "Convogram";
const activeSaves = new Set();
let observer = null;

function isNative() {
  try { return Capacitor.isNativePlatform(); } catch (_) { return false; }
}

async function ensureAlbum() {
  const result = await Media.getAlbums();
  let albums = result?.albums || [];
  if (Capacitor.getPlatform() === "android") {
    const base = (await Media.getAlbumsPath())?.path || "";
    let album = albums.find((item) => item.name === ALBUM_NAME && (!base || item.identifier?.startsWith(base)));
    if (!album) {
      await Media.createAlbum({ name: ALBUM_NAME });
      albums = (await Media.getAlbums())?.albums || [];
      album = albums.find((item) => item.name === ALBUM_NAME && (!base || item.identifier?.startsWith(base)));
    }
    return album?.identifier || null;
  }
  let album = albums.find((item) => item.name === ALBUM_NAME);
  if (!album) {
    await Media.createAlbum({ name: ALBUM_NAME });
    albums = (await Media.getAlbums())?.albums || [];
    album = albums.find((item) => item.name === ALBUM_NAME);
  }
  return album?.identifier || null;
}

function extensionFor(url, type) {
  const clean = String(url || "").split("?")[0].split("#")[0];
  const match = clean.match(/\.([a-z0-9]{2,5})$/i);
  if (match) return match[1].toLowerCase();
  return type === "video" ? "mp4" : "jpg";
}

async function saveOnWeb(url, type) {
  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) throw new Error("Could not download this media.");
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = `Convogram_${Date.now()}.${extensionFor(url, type)}`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

async function saveMedia(url, type) {
  if (!url) throw new Error("Media is unavailable.");
  if (!isNative()) {
    await saveOnWeb(url, type);
    return;
  }
  const albumIdentifier = await ensureAlbum();
  if (!albumIdentifier) throw new Error("Could not open the Convogram album.");
  const fileName = `Convogram_${Date.now()}`;
  const options = { path: url, albumIdentifier, fileName };
  if (type === "video") await Media.saveVideo(options);
  else await Media.savePhoto(options);
}

function addSaveButton(media) {
  if (!(media instanceof HTMLImageElement || media instanceof HTMLVideoElement)) return;
  if (media.dataset.convogramSaveAttached === "true") return;
  if (!media.src) return;
  media.dataset.convogramSaveAttached = "true";
  const parent = media.parentElement;
  if (!parent) return;
  parent.style.position = parent.style.position || "relative";
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute(SAVE_ATTR, "true");
  button.setAttribute("aria-label", "Save media to device");
  button.textContent = "Save";
  Object.assign(button.style, {
    position: "absolute",
    right: "8px",
    bottom: "8px",
    zIndex: "6",
    border: "1px solid rgba(255,255,255,.22)",
    borderRadius: "999px",
    padding: "7px 11px",
    background: "rgba(0,0,0,.72)",
    color: "#fff",
    font: "700 12px/1 system-ui,sans-serif",
    cursor: "pointer",
    backdropFilter: "blur(8px)",
  });
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const key = media.src;
    if (activeSaves.has(key)) return;
    activeSaves.add(key);
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Saving…";
    try {
      await saveMedia(media.currentSrc || media.src, media instanceof HTMLVideoElement ? "video" : "image");
      button.textContent = "Saved ✓";
    } catch (error) {
      console.warn("Convogram media save failed", error);
      button.textContent = "Try again";
    } finally {
      activeSaves.delete(key);
      setTimeout(() => {
        button.disabled = false;
        button.textContent = original;
      }, 1600);
    }
  });
  parent.appendChild(button);
}

function scan() {
  document.querySelectorAll(".convogram-chat-image, .convogram-chat-video").forEach(addSaveButton);
}

function start() {
  if (observer) return;
  scan();
  observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
