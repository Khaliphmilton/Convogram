import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";

const isAndroid = () => Capacitor.getPlatform() === "android";

export async function requestPostPermissions() {
  if (!isAndroid()) return true;
  try {
    const result = await Camera.requestPermissions({ permissions: ["camera", "photos"] });
    return result.camera === "granted" || result.photos === "granted";
  } catch (error) {
    console.warn("Convogram media permission request failed", error);
    return false;
  }
}

export async function requestCallPermissions(type = "voice") {
  if (!isAndroid()) return true;
  try {
    const constraints = type === "video"
      ? { audio: true, video: { facingMode: "user" } }
      : { audio: true };
    const stream = await navigator.mediaDevices?.getUserMedia?.(constraints);
    stream?.getTracks().forEach((track) => track.stop());
    return true;
  } catch (error) {
    console.warn("Convogram call permission request failed", error);
    return false;
  }
}

export function installPostPermissionPrompt() {
  if (!isAndroid() || typeof document === "undefined") return () => {};
  const handler = (event) => {
    const button = event.target?.closest?.("button");
    if (!button) return;
    const text = (button.textContent || "").trim().toLowerCase();
    if (text === "post" || text.includes("create post") || text.includes("add moment")) requestPostPermissions();
  };
  document.addEventListener("click", handler, true);
  return () => document.removeEventListener("click", handler, true);
}

export function installCallPermissionPrompt() {
  if (!isAndroid() || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return () => {};
  const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (constraints) => {
    const stream = await original(constraints);
    return stream;
  };
  return () => { navigator.mediaDevices.getUserMedia = original; };
}
