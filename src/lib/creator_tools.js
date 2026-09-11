import { supabase } from "./supabase";

export async function getCreatorEarnings(userId) {
  const { data, error } = await supabase.from("creator_earnings").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return data || [];
}

export async function recordCreatorEarning(userId, amountCents, source = "tip", currency = "USD", reference = null) {
  const { data, error } = await supabase.from("creator_earnings").insert([{ user_id: userId, amount_cents: Math.max(0, Math.round(amountCents)), source, currency, reference }]).select().single();
  if (error) throw error;
  return data;
}

export async function getCreatorSummary(userId) {
  const [dashboard, earnings] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("creator_earnings").select("amount_cents, status").eq("user_id", userId)
  ]);
  if (dashboard.error) throw dashboard.error;
  if (earnings.error) throw earnings.error;
  const rows = earnings.data || [];
  return {
    postsCount: dashboard.count || 0,
    totalCents: rows.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0),
    availableCents: rows.filter((row) => row.status === "available").reduce((sum, row) => sum + Number(row.amount_cents || 0), 0)
  };
}
