import React from 'react';
import { Heart, MessageCircle, Share2, MoreVertical, Loader } from 'lucide-react';
import { formatDistanceToNow } from '../lib/utils';
import './PostCard.css';

export function PostCard({
  post,
  currentUserId,
  isLiked,
  onLike,
  onUnlike,
  onComment,
  onDelete,
  onFollowAuthor,
  isFollowing,
  likeCount = 0,
  commentCount = 0,
}) {
  const [showComments, setShowComments] = React.useState(false);
  const [comment, setComment] = React.useState('');
  const [submittingComment, setSubmittingComment] = React.useState(false);
  const [liking, setLiking] = React.useState(false);
  const isOwnPost = post.user_id === currentUserId;
  const author = post.profiles;

  const handleLikeClick = async () => {
    setLiking(true);
    try {
      if (isLiked) {
        await onUnlike();
      } else {
        await onLike();
      }
    } finally {
      setLiking(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmittingComment(true);
    try {
      await onComment(comment.trim());
      setComment('');
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <article className="post-card">
      <div className="post-header">
        <img
          src={author?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${author?.username}`}
          alt={author?.display_name}
          className="post-avatar"
        />
        <div className="post-author-info">
          <div className="author-name">{author?.display_name}</div>
          <div className="author-username">@{author?.username}</div>
        </div>
        {!isOwnPost && (
          <button
            className={`follow-button ${isFollowing ? 'following' : ''}`}
            onClick={() => onFollowAuthor()}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        )}
        {isOwnPost && (
          <button
            className="more-button"
            onClick={() => {
              if (window.confirm('Delete this post?')) {
                onDelete();
              }
            }}
            title="Delete post"
          >
            <MoreVertical size={20} />
          </button>
        )}
      </div>

      {post.media_url && post.media_type !== 'text' && (
        <div className="post-media">
          {post.media_type === 'image' ? (
            <img src={post.media_url} alt="Post" />
          ) : post.media_type === 'video' ? (
            <video controls>
              <source src={post.media_url} />
            </video>
          ) : null}
        </div>
      )}

      {post.caption && <div className="post-caption">{post.caption}</div>}

      <div className="post-timestamp">
        {formatDistanceToNow(new Date(post.created_at))} ago
      </div>

      <div className="post-actions">
        <button
          className={`action-button ${isLiked ? 'liked' : ''}`}
          onClick={handleLikeClick}
          disabled={liking}
        >
          {liking ? (
            <Loader size={18} className="spinning" />
          ) : (
            <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
          )}
          <span>{likeCount}</span>
        </button>
        <button
          className="action-button"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle size={18} />
          <span>{commentCount}</span>
        </button>
        <button className="action-button">
          <Share2 size={18} />
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          <form onSubmit={handleCommentSubmit} className="comment-form">
            <input
              type="text"
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={submittingComment}
            />
            <button type="submit" disabled={submittingComment || !comment.trim()}>
              {submittingComment ? <Loader size={16} className="spinning" /> : 'Post'}
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
