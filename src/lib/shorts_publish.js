import { createShort } from "./shorts";
import { uploadShortVideo } from "./storage";

export async function publishShort(userId, file, caption = "", soundName = null) {
  if (!file) throw new Error("Choose a video for your Short.");
  const uploaded = await uploadShortVideo(file, userId);
  return createShort(userId, uploaded.url, caption.trim(), soundName?.trim() || null);
}
