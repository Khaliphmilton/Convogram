import { useEffect, useState } from "react";
import { getCurrentProfile } from "../lib/auth";

export function useProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadProfile();
  }, [userId]);

  async function loadProfile() {
    try {
      setLoading(true);
      const data = await getCurrentProfile(userId);
      setProfile(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return { profile, loading, error, refetch: loadProfile };
}
