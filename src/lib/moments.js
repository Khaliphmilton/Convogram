import { supabase } from "./supabase";

export async function getMomentsForFeed(userId, limit = 50) {
  const { data, error } = await supabase
    .from("moments")
    .select(
      `
      *,
      profiles:user_id(id, username, display_name, avatar_url, is_private),
      moment_views(count)
    `
    )
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getUserMoments(userId) {
  const { data, error } = await supabase
    .from("moments")
    .select(
      `
      *,
      profiles:user_id(id, username, display_name, avatar_url),
      moment_views(count)
    `
    )
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createMoment(userId, mediaUrl, mediaType, caption = null) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const { data, error } = await supabase
    .from("moments")
    .insert([
      {
        user_id: userId,
        media_url: mediaUrl,
        media_type: mediaType,
        caption: caption || null,
        expires_at: expiresAt.toISOString(),
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function recordMomentView(momentId, viewerId) {
  try {
    const { data, error } = await supabase
      .from("moment_views")
      .insert([{ moment_id: momentId, viewer_id: viewerId }])
      .select()
      .single();
    if (error && error.code !== "23505") throw error; // Ignore duplicate key error
    return data;
  } catch (e) {
    // Silently fail on duplicate views
  }
}

export async function getMomentViewers(momentId) {
  const { data, error } = await supabase
    .from("moment_views")
    .select(
      `
      *,
      profiles:viewer_id(id, username, display_name, avatar_url)
    `
    )
    .eq("moment_id", momentId)
    .order("viewed_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function deleteMoment(momentId) {
  const { error } = await supabase.from("moments").delete().eq("id", momentId);
  if (error) throw error;
}
