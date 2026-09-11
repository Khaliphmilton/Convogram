import { supabase } from "./supabase";

export async function getCreatorDashboard(userId) {
  const [posts, shorts, followers] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("shorts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
  ]);
  const error = posts.error || shorts.error || followers.error;
  if (error) throw error;
  return { posts: posts.count || 0, shorts: shorts.count || 0, followers: followers.count || 0 };
}

export async function getCreatorEngagement(userId) {
  const { data: ownedPosts, error } = await supabase.from("posts").select("id").eq("user_id", userId);
  if (error) throw error;
  const postIds = (ownedPosts || []).map((post) => post.id);
  if (!postIds.length) return { likes: 0, comments: 0 };
  const [likes, comments] = await Promise.all([
    supabase.from("likes").select("id", { count: "exact", head: true }).in("post_id", postIds),
    supabase.from("comments").select("id", { count: "exact", head: true }).in("post_id", postIds),
  ]);
  if (likes.error) throw likes.error;
  if (comments.error) throw comments.error;
  return { likes: likes.count || 0, comments: comments.count || 0 };
}
