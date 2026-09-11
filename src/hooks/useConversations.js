import { useEffect, useState } from "react";
import { getConversations } from "../lib/messages";

export function useConversations(userId) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    loadConversations();
  }, [userId]);

  async function loadConversations() {
    try {
      setLoading(true);
      const data = await getConversations(userId);
      setConversations(data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return { conversations, loading, error, refetch: loadConversations };
}
