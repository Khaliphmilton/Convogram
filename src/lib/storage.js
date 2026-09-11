import { supabase } from "./supabase";

const BUCKET_NAME = "post-media";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export async function uploadPostMedia(file, userId) {
  // Validate file
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    throw new Error("File type not supported. Please upload an image or video.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File is too large. Maximum size is 50MB.");
  }

  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}${getFileExtension(file.name)}`;
  const mediaType = isImage ? "image" : "video";

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file);

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

  return {
    url: publicUrl,
    path: data.path,
    mediaType,
  };
}

export async function uploadMomentMedia(file, userId) {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    throw new Error("File type not supported. Please upload an image or video.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File is too large. Maximum size is 50MB.");
  }

  const fileName = `moments/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}${getFileExtension(file.name)}`;
  const mediaType = isImage ? "image" : "video";

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file);

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

  return {
    url: publicUrl,
    path: data.path,
    mediaType,
  };
}

export async function uploadShortVideo(file, userId) {
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isVideo) {
    throw new Error("File must be a video.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File is too large. Maximum size is 50MB.");
  }

  const fileName = `shorts/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}${getFileExtension(file.name)}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file);

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

  return {
    url: publicUrl,
    path: data.path,
  };
}

export async function uploadProfileAvatar(file, userId) {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);

  if (!isImage) {
    throw new Error("File must be an image.");
  }

  if (file.size > 5 * 1024 * 1024) {
    // 5MB for avatars
    throw new Error("Avatar file is too large. Maximum size is 5MB.");
  }

  const fileName = `avatars/${userId}/avatar${getFileExtension(file.name)}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, { upsert: true });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

  return publicUrl;
}

function getFileExtension(fileName) {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return "";
  return fileName.substring(lastDot);
}
