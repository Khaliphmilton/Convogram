import { useEffect, useState } from "react";
import { getMomentsForFeed } from "../lib/moments";

export function useMoments(userId) {
  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMoments();
  }, [userId]);

  async function loadMoments() {
    try {
      setLoading(true);
      const data = await getMomentsForFeed(userId);
      setMoments(data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return { moments, loading, error, refetch: loadMoments };
}
