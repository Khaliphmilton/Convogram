import { useEffect, useRef } from "react";
import { MessagesPanel as OriginalMessagesPanel } from "./MessagesPanelOriginal";
import "./MessagesPanel.interaction-fix.css";
import "./MessagesMediaViewer.css";

export function MessagesPanel(props) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let timer = null;
    let longPressed = false;
    let startX = 0;
    let startY = 0;
    let mediaPickerOpen = false;
    let mediaInput = null;

    const clearTimer = () => {
      if (timer) window.clearTimeout(timer);
      timer = null;
    };

    const stopMediaGuard = () => {
      mediaPickerOpen = false;
      window.__convogramMessageMediaPickerOpen = false;
      if (mediaInput) mediaInput.removeEventListener("change", onMediaChange, true);
      mediaInput = null;
    };

    const armMediaGuard = () => {
      mediaPickerOpen = true;
      window.__convogramMessageMediaPickerOpen = true;
      mediaInput = host.querySelector('.message-composer input[type="file"]');
      if (mediaInput) mediaInput.addEventListener("change", onMediaChange, true);
      window.clearTimeout(armMediaGuard.timeout);
      armMediaGuard.timeout = window.setTimeout(() => stopMediaGuard(), 20000);
    };

    const onMediaChange = () => {
      window.setTimeout(() => stopMediaGuard(), 2500);
    };

    const onFocus = () => {
      if (!mediaPickerOpen) return;
      window.setTimeout(() => {
        const input = host.querySelector('.message-composer input[type="file"]');
        if (!input?.files?.length) stopMediaGuard();
      }, 1500);
    };

    const onWindowPopCapture = (event) => {
      if (!mediaPickerOpen) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    };

    const dispatchNativePhotoToComposer = async (input) => {
      try {
        const [{ Camera, CameraResultType, CameraSource }, { Capacitor }] = await Promise.all([
          import("@capacitor/camera"),
          import("@capacitor/core"),
        ]);
        if (!Capacitor.isNativePlatform()) return false;

        armMediaGuard();
        const photo = await Camera.getPhoto({
          source: CameraSource.Photos,
          resultType: CameraResultType.DataUrl,
          quality: 90,
          width: 2048,
          height: 2048,
          correctOrientation: true,
        });

        if (!photo?.dataUrl) {
          stopMediaGuard();
          return true;
        }

        const response = await fetch(photo.dataUrl);
        const blob = await response.blob();
        const mime = blob.type || "image/jpeg";
        const extension = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
        const file = new File([blob], `convogram-${Date.now()}.${extension}`, { type: mime });
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      } catch (error) {
        console.warn("Native Convogram photo picker failed; using the browser picker instead.", error);
        stopMediaGuard();
        return false;
      }
    };

    const saveMediaToGallery = async (event) => {
      const button = event.target?.closest?.('button[aria-label="Save to gallery"]');
      if (!button || !host.contains(button)) return;

      const viewer = button.closest(".convogram-media-viewer");
      const media = viewer?.querySelector("img.convogram-media-viewer-media, video.convogram-media-viewer-media");
      if (!media?.src) return;

      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        button.disabled = true;
        button.setAttribute("aria-busy", "true");

        const { Media } = await import("@capacitor-community/media");
        let { albums } = await Media.getAlbums();
        let album = albums?.find((item) => item.name === "Convogram");
        if (!album) {
          await Media.createAlbum({ name: "Convogram" });
          ({ albums } = await Media.getAlbums());
          album = albums?.find((item) => item.name === "Convogram");
        }
        if (!album?.identifier) throw new Error("Convogram gallery album could not be created.");

        const isVideo = media.tagName.toLowerCase() === "video";
        const fileName = `Convogram-${Date.now()}`;
        const options = { path: media.src, albumIdentifier: album.identifier, fileName };
        if (isVideo) await Media.saveVideo(options);
        else await Media.savePhoto(options);

        button.setAttribute("data-save-complete", "true");
        button.title = "Saved to gallery";
        button.setAttribute("aria-label", "Saved to gallery");
        const label = button.querySelector(".media-save-label");
        if (label) label.textContent = "Saved";
      } catch (error) {
        console.warn("Convogram gallery save failed.", error);
        window.dispatchEvent(new CustomEvent("convogram-media-save-error", { detail: error?.message || "Could not save media." }));
      } finally {
        button.disabled = false;
        button.removeAttribute("aria-busy");
      }
    };

    const onMediaSaveError = (event) => {
      const viewer = host.querySelector(".convogram-media-viewer");
      const errorBox = viewer?.querySelector(".convogram-media-viewer-error");
      if (!errorBox) return;
      errorBox.textContent = event.detail || "Could not save media.";
    };

    const onAttachCapture = async (event) => {
      const button = event.target?.closest?.('.message-composer button[title="Attach media"]');
      if (!button || !host.contains(button)) return;

      event.preventDefault();
      event.stopPropagation();

      mediaInput = host.querySelector('.message-composer input[type="file"]');
      if (!mediaInput) return;

      const handledNatively = await dispatchNativePhotoToComposer(mediaInput);
      if (!handledNatively) {
        armMediaGuard();
        mediaInput?.click();
      }
    };

    const onFileClickCapture = (event) => {
      const input = event.target?.closest?.('.message-composer input[type="file"]');
      if (!input || !host.contains(input)) return;
      event.stopPropagation();
    };

    const onTouchStart = (event) => {
      const row = event.target?.closest?.(".message-row");
      if (!row || !host.contains(row)) return;
      clearTimer();
      longPressed = false;
      const point = event.touches?.[0];
      startX = point?.clientX || 0;
      startY = point?.clientY || 0;
      timer = window.setTimeout(() => {
        longPressed = true;
      }, 650);
    };

    const onTouchMove = (event) => {
      if (longPressed || !timer) return;
      const point = event.touches?.[0];
      if (!point) return;
      const dx = point.clientX - startX;
      const dy = point.clientY - startY;
      if (Math.hypot(dx, dy) > 18) clearTimer();
    };

    const onTouchEnd = () => {
      if (longPressed) {
        window.setTimeout(() => {
          longPressed = false;
        }, 600);
        return;
      }
      clearTimer();
    };

    const onClickCapture = (event) => {
      if (!longPressed) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    };

    host.addEventListener("touchstart", onTouchStart, { passive: true, capture: true });
    host.addEventListener("touchmove", onTouchMove, { passive: true, capture: true });
    host.addEventListener("touchend", onTouchEnd, { passive: false, capture: true });
    host.addEventListener("click", onClickCapture, { capture: true });
    host.addEventListener("click", saveMediaToGallery, { capture: true });
    host.addEventListener("click", onAttachCapture, { capture: true });
    host.addEventListener("click", onFileClickCapture, { capture: true });
    window.addEventListener("popstate", onWindowPopCapture, { capture: true });
    window.addEventListener("focus", onFocus);
    window.addEventListener("convogram-media-save-error", onMediaSaveError);

    return () => {
      clearTimer();
      stopMediaGuard();
      window.clearTimeout(armMediaGuard.timeout);
      host.removeEventListener("touchstart", onTouchStart, true);
      host.removeEventListener("touchmove", onTouchMove, true);
      host.removeEventListener("touchend", onTouchEnd, true);
      host.removeEventListener("click", onClickCapture, true);
      host.removeEventListener("click", saveMediaToGallery, true);
      host.removeEventListener("click", onAttachCapture, true);
      host.removeEventListener("click", onFileClickCapture, true);
      window.removeEventListener("popstate", onWindowPopCapture, true);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("convogram-media-save-error", onMediaSaveError);
    };
  }, []);

  return <div ref={hostRef} style={{ display: "contents" }}><OriginalMessagesPanel {...props} /></div>;
}

export default MessagesPanel;
