-- Convogram Platform Schema for Supabase PostgreSQL
-- Complete backend foundation for social/communication platform
-- Combines Instagram, WhatsApp, TikTok, and Telegram-style features

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  bio TEXT,
  avatar_url TEXT,
  website VARCHAR(512),
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT username_min_length CHECK (LENGTH(TRIM(username)) >= 3),
  CONSTRAINT username_max_length CHECK (LENGTH(username) <= 255),
  CONSTRAINT website_format CHECK (website IS NULL OR website ~ '^https?://')
);

CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);

-- ============================================================================
-- POSTS TABLE
-- ============================================================================
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  caption TEXT,
  media_url TEXT,
  media_type VARCHAR(50) DEFAULT 'image',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT media_type_check CHECK (media_type IN ('image', 'video', 'carousel', 'text'))
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC);

-- ============================================================================
-- MOMENTS TABLE (24-hour photo/video updates)
-- ============================================================================
CREATE TABLE moments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type VARCHAR(50) NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  CONSTRAINT media_type_check CHECK (media_type IN ('image', 'video'))
);

CREATE INDEX idx_moments_user_id ON moments(user_id);
CREATE INDEX idx_moments_expires_at ON moments(expires_at);
CREATE INDEX idx_moments_user_expires ON moments(user_id, expires_at DESC);
CREATE INDEX idx_moments_created_at ON moments(created_at DESC);

-- Automatically clean up expired moments (can be run periodically)
-- DELETE FROM moments WHERE expires_at < NOW();

-- ============================================================================
-- LIKES TABLE
-- ============================================================================
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_like UNIQUE(user_id, post_id)
);

CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_created_at ON likes(created_at DESC);

-- ============================================================================
-- COMMENTS TABLE
-- ============================================================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX idx_comments_post_created ON comments(post_id, created_at DESC);

-- ============================================================================
-- FOLLOWS TABLE
-- ============================================================================
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_follow UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_follows_created_at ON follows(created_at DESC);

-- ============================================================================
-- CONVERSATIONS TABLE (Direct and Group messaging)
-- ============================================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL DEFAULT 'direct',
  name VARCHAR(255),
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT conversation_type_check CHECK (type IN ('direct', 'group'))
);

CREATE INDEX idx_conversations_created_by ON conversations(created_by);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX idx_conversations_type ON conversations(type);

-- ============================================================================
-- CONVERSATION_MEMBERS TABLE
-- ============================================================================
CREATE TABLE conversation_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_membership UNIQUE(conversation_id, user_id),
  CONSTRAINT role_check CHECK (role IN ('owner', 'admin', 'member'))
);

CREATE INDEX idx_conversation_members_conversation_id ON conversation_members(conversation_id);
CREATE INDEX idx_conversation_members_user_id ON conversation_members(user_id);
CREATE INDEX idx_conversation_members_joined_at ON conversation_members(joined_at DESC);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  message_type VARCHAR(50) DEFAULT 'text',
  media_url TEXT,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT message_type_check CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file', 'location')),
  CONSTRAINT content_or_media_check CHECK (
    (message_type = 'text' AND content IS NOT NULL AND content != '') OR
    (message_type IN ('image', 'video', 'audio', 'file', 'location') AND media_url IS NOT NULL)
  )
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_reply_to_id ON messages(reply_to_id);

-- ============================================================================
-- COMMUNITIES TABLE
-- ============================================================================
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT community_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE INDEX idx_communities_owner_id ON communities(owner_id);
CREATE INDEX idx_communities_created_at ON communities(created_at DESC);
CREATE INDEX idx_communities_name ON communities(name);

-- ============================================================================
-- COMMUNITY_MEMBERS TABLE
-- ============================================================================
CREATE TABLE community_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_community_membership UNIQUE(community_id, user_id),
  CONSTRAINT community_role_check CHECK (role IN ('owner', 'admin', 'moderator', 'member'))
);

CREATE INDEX idx_community_members_community_id ON community_members(community_id);
CREATE INDEX idx_community_members_user_id ON community_members(user_id);
CREATE INDEX idx_community_members_role ON community_members(role);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT notification_type_check CHECK (type IN ('like', 'comment', 'follow', 'mention', 'message', 'moment_view'))
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_actor_id ON notifications(actor_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for posts.updated_at
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for comments.updated_at
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for messages.updated_at
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for conversations.updated_at
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for communities.updated_at
CREATE TRIGGER update_communities_updated_at
  BEFORE UPDATE ON communities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for profiles.updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AUTO-PROFILE CREATION TRIGGER
-- Creates a profile when a new auth user signs up
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    'user_' || SUBSTR(NEW.id::text, 1, 8),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- SECURITY DEFINER HELPER FUNCTIONS FOR RLS CHECKS
-- ============================================================================

-- Safe helper to check if user is a conversation member
CREATE OR REPLACE FUNCTION is_conversation_member(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Safe helper to check if user is conversation admin
CREATE OR REPLACE FUNCTION is_conversation_admin(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Safe helper to check if user is community admin
CREATE OR REPLACE FUNCTION is_community_admin(p_community_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = p_community_id
    AND user_id = p_user_id
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all user-facing tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Users can view public profiles and their own profile
CREATE POLICY "Public profiles are viewable"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id
    OR NOT is_private
    OR EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id = auth.uid() AND following_id = profiles.id
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (for manual creation if needed)
CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- POSTS POLICIES
-- ============================================================================

-- Anyone can view posts from non-private accounts or posts they own
CREATE POLICY "View posts from public accounts"
  ON posts FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = posts.user_id AND NOT profiles.is_private
    )
    OR EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id = auth.uid() AND following_id = posts.user_id
    )
  );

-- Users can only insert their own posts
CREATE POLICY "Users can create own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own posts
CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own posts
CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- MOMENTS POLICIES
-- ============================================================================

-- Users can view moments from accounts they follow, non-private accounts, and non-expired moments
CREATE POLICY "View moments from public accounts and follows"
  ON moments FOR SELECT
  USING (
    moments.expires_at > NOW()
    AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = moments.user_id AND NOT profiles.is_private
      )
      OR EXISTS (
        SELECT 1 FROM follows
        WHERE follower_id = auth.uid() AND following_id = moments.user_id
      )
    )
  );

-- Users can only create their own moments
CREATE POLICY "Users can create own moments"
  ON moments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own moments
CREATE POLICY "Users can delete own moments"
  ON moments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- LIKES POLICIES
-- ============================================================================

-- Anyone can view likes on public posts or likes they created
CREATE POLICY "View likes"
  ON likes FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM posts
      INNER JOIN profiles ON profiles.id = posts.user_id
      WHERE posts.id = likes.post_id AND NOT profiles.is_private
    )
  );

-- Users can only create likes on posts they can see
CREATE POLICY "Users can like posts"
  ON likes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_id
      AND (
        posts.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = posts.user_id AND NOT profiles.is_private
        )
        OR EXISTS (
          SELECT 1 FROM follows
          WHERE follower_id = auth.uid() AND following_id = posts.user_id
        )
      )
    )
  );

-- Users can only delete their own likes
CREATE POLICY "Users can delete own likes"
  ON likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS POLICIES
-- ============================================================================

-- Anyone can view comments on posts they can see
CREATE POLICY "View comments"
  ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      INNER JOIN profiles ON profiles.id = posts.user_id
      WHERE posts.id = comments.post_id
      AND (
        posts.user_id = auth.uid()
        OR NOT profiles.is_private
        OR EXISTS (
          SELECT 1 FROM follows
          WHERE follower_id = auth.uid() AND following_id = posts.user_id
        )
      )
    )
  );

-- Users can comment on posts they can see
CREATE POLICY "Users can comment on posts"
  ON comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM posts
      INNER JOIN profiles ON profiles.id = posts.user_id
      WHERE posts.id = post_id
      AND (
        posts.user_id = auth.uid()
        OR NOT profiles.is_private
        OR EXISTS (
          SELECT 1 FROM follows
          WHERE follower_id = auth.uid() AND following_id = posts.user_id
        )
      )
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FOLLOWS POLICIES
-- ============================================================================

-- Anyone can view follows
CREATE POLICY "View follows"
  ON follows FOR SELECT
  USING (TRUE);

-- Users can only create follows for themselves
CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users can only delete their own follows
CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================================================
-- CONVERSATIONS POLICIES
-- ============================================================================

-- Users can only view conversations they are members of
CREATE POLICY "View own conversations"
  ON conversations FOR SELECT
  USING (
    is_conversation_member(id, auth.uid())
  );

-- Users can create conversations
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Users can update conversations they own or admin
CREATE POLICY "Update own conversations"
  ON conversations FOR UPDATE
  USING (
    auth.uid() = created_by
    OR is_conversation_admin(id, auth.uid())
  )
  WITH CHECK (
    auth.uid() = created_by
    OR is_conversation_admin(id, auth.uid())
  );

-- ============================================================================
-- CONVERSATION_MEMBERS POLICIES
-- ============================================================================

-- Users can view membership of conversations they belong to
CREATE POLICY "View conversation members"
  ON conversation_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_conversation_member(conversation_id, auth.uid())
  );

-- Users can only add members to conversations they own or admin
CREATE POLICY "Add conversation members"
  ON conversation_members FOR INSERT
  WITH CHECK (
    is_conversation_admin(conversation_id, auth.uid())
  );

-- Users can manage members in conversations they own or admin
CREATE POLICY "Update conversation members"
  ON conversation_members FOR UPDATE
  USING (
    is_conversation_admin(conversation_id, auth.uid())
  )
  WITH CHECK (
    is_conversation_admin(conversation_id, auth.uid())
  );

-- Users can remove themselves from conversations
CREATE POLICY "Remove self from conversation"
  ON conversation_members FOR DELETE
  USING (user_id = auth.uid());

-- Admins/owners can remove members from conversations
CREATE POLICY "Admins can remove conversation members"
  ON conversation_members FOR DELETE
  USING (
    user_id != auth.uid()
    AND is_conversation_admin(conversation_id, auth.uid())
  );

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================

-- Users can view messages in conversations they belong to
CREATE POLICY "View messages"
  ON messages FOR SELECT
  USING (
    is_conversation_member(conversation_id, auth.uid())
  );

-- Users can send messages to conversations they belong to
CREATE POLICY "Send messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND is_conversation_member(conversation_id, auth.uid())
  );

-- Users can update their own messages
CREATE POLICY "Update own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Users can delete their own messages
CREATE POLICY "Delete own messages"
  ON messages FOR DELETE
  USING (auth.uid() = sender_id);

-- ============================================================================
-- COMMUNITIES POLICIES
-- ============================================================================

-- Anyone can view public communities
CREATE POLICY "View communities"
  ON communities FOR SELECT
  USING (TRUE);

-- Users can create communities
CREATE POLICY "Users can create communities"
  ON communities FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Users can update their own communities
CREATE POLICY "Update own communities"
  ON communities FOR UPDATE
  USING (
    auth.uid() = owner_id
    OR is_community_admin(id, auth.uid())
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR is_community_admin(id, auth.uid())
  );

-- ============================================================================
-- COMMUNITY_MEMBERS POLICIES
-- ============================================================================

-- Anyone can view community members
CREATE POLICY "View community members"
  ON community_members FOR SELECT
  USING (TRUE);

-- Users can join communities
CREATE POLICY "Users can join communities"
  ON community_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own membership
CREATE POLICY "Update own community membership"
  ON community_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can manage community members
CREATE POLICY "Admins can manage community members"
  ON community_members FOR UPDATE
  USING (
    is_community_admin(community_id, auth.uid())
  )
  WITH CHECK (
    is_community_admin(community_id, auth.uid())
  );

-- Users can leave communities
CREATE POLICY "Leave community"
  ON community_members FOR DELETE
  USING (user_id = auth.uid());

-- Admins can remove community members
CREATE POLICY "Admins can remove community members"
  ON community_members FOR DELETE
  USING (
    user_id != auth.uid()
    AND is_community_admin(community_id, auth.uid())
  );

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

-- Users can only view their own notifications
CREATE POLICY "View own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert notifications (disabled by default for direct insert)
-- Notifications should be created via application logic or database functions
-- Enabling this requires trusted application control only
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (FALSE);

-- Users can mark their notifications as read
CREATE POLICY "Update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
