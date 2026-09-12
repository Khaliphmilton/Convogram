import { supabase } from "./supabase";

const BUCKET_NAME = "post-media";
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_AUDIO_SIZE = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_AUDIO_TYPES = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "audio/x-wav"];

function validateMedia(file, videoOnly = false) {
  if (!file) throw new Error("Choose a photo or video first.");
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
  if (videoOnly ? !isVideo : (!isImage && !isVideo)) throw new Error(videoOnly ? "File must be a video." : "File type not supported.");
  if (file.size > MAX_FILE_SIZE) throw new Error("File is too large. Maximum size is 50MB.");
  return isImage ? "image" : "video";
}

function validateAudio(file) {
  if (!file) throw new Error("Choose an audio file first.");
  if (!ALLOWED_AUDIO_TYPES.includes(file.type)) throw new Error("Audio format not supported.");
  if (file.size > MAX_AUDIO_SIZE) throw new Error("Voice note is too large. Maximum size is 20MB.");
  return "audio";
}

async function upload(file, path, mediaType) {
  const contentType = file.type || (mediaType === "image" ? "image/jpeg" : mediaType === "video" ? "video/mp4" : "application/octet-stream");
  const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(path, file, {
    upsert: false,
    contentType,
    cacheControl: "3600",
  });
  if (error) throw new Error(`Media upload failed: ${error.message}`);
  if (!data?.path) throw new Error("Media upload completed without a storage path.");
  const { data: publicData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);
  if (!publicData?.publicUrl) throw new Error("Could not create a public URL for the uploaded media.");
  return { url: publicData.publicUrl, path: data.path, mediaType };
}

export async function uploadPostMedia(file, userId) { return upload(file, `${userId}/posts/${Date.now()}-${Math.random().toString(36).slice(2)}${getFileExtension(file.name)}`, validateMedia(file)); }
export async function uploadMomentMedia(file, userId) { return upload(file, `moments/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}${getFileExtension(file.name)}`, validateMedia(file)); }
export async function uploadMessageMedia(file, userId) { return upload(file, `messages/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}${getFileExtension(file.name)}`, validateMedia(file)); }
export async function uploadVoiceMessage(file, userId) { return upload(file, `messages/${userId}/voice-${Date.now()}-${Math.random().toString(36).slice(2)}${getFileExtension(file.name) || ".webm"}`, validateAudio(file)); }
export async function uploadShortVideo(file, userId) { return upload(file, `shorts/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}${getFileExtension(file.name)}`, validateMedia(file, true)); }
export async function uploadProfileAvatar(file, userId) { if (!file || !ALLOWED_IMAGE_TYPES.includes(file.type)) throw new Error("File must be an image."); if (file.size > 5 * 1024 * 1024) throw new Error("Avatar file is too large. Maximum size is 5MB."); return (await upload(file, `avatars/${userId}/avatar${getFileExtension(file.name)}`, "image")).url; }
function getFileExtension(fileName) { const i = fileName.lastIndexOf("."); return i === -1 ? "" : fileName.substring(i).toLowerCase(); }
