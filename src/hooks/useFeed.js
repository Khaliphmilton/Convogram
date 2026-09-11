import { useEffect, useState } from "react";
import { getFeed } from "../lib/posts";

export function useFeed(limit = 20) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFeed();
  }, []);

  async function loadFeed() {
    try {
      setLoading(true);
      const data = await getFeed(limit);
      setPosts(data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function addPost(post) {
    setPosts([post, ...posts]);
  }

  function removePost(postId) {
    setPosts(posts.filter((p) => p.id !== postId));
  }

  return { posts, loading, error, refetch: loadFeed, addPost, removePost };
}
