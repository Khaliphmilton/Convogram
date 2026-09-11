import { useEffect, useState } from "react";
import { getShortsForDiscover } from "../lib/shorts";

export function useShorts() {
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    loadShorts();
  }, [offset]);

  async function loadShorts() {
    try {
      setLoading(true);
      const data = await getShortsForDiscover(30, offset);
      if (offset === 0) {
        setShorts(data || []);
      } else {
        setShorts((prev) => [...prev, ...(data || [])]);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function loadMore() {
    setOffset((prev) => prev + 30);
  }

  return { shorts, loading, error, refetch: loadShorts, loadMore };
}
