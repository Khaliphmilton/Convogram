-- Convogram notification automation
-- Creates server-side notifications for core social and messaging events.

CREATE OR REPLACE FUNCTION public.create_convogram_notification(
  p_user_id UUID,
  p_actor_id UUID,
  p_type VARCHAR(50),
  p_post_id UUID DEFAULT NULL,
  p_message_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  IF p_user_id IS NULL OR p_actor_id IS NULL OR p_user_id = p_actor_id THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (user_id, actor_id, type, post_id, message_id)
  VALUES (p_user_id, p_actor_id, p_type, p_post_id, p_message_id)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_convogram_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id UUID;
BEGIN
  SELECT user_id INTO owner_id FROM public.posts WHERE id = NEW.post_id;
  PERFORM public.create_convogram_notification(owner_id, NEW.user_id, 'like', NEW.post_id, NULL);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_convogram_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id UUID;
BEGIN
  SELECT user_id INTO owner_id FROM public.posts WHERE id = NEW.post_id;
  PERFORM public.create_convogram_notification(owner_id, NEW.user_id, 'comment', NEW.post_id, NULL);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_convogram_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_convogram_notification(NEW.following_id, NEW.follower_id, 'follow', NULL, NULL);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_convogram_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member RECORD;
BEGIN
  FOR member IN
    SELECT user_id
    FROM public.conversation_members
    WHERE conversation_id = NEW.conversation_id
      AND user_id <> NEW.sender_id
  LOOP
    PERFORM public.create_convogram_notification(member.user_id, NEW.sender_id, 'message', NULL, NEW.id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_convogram_notify_post_like ON public.likes;
CREATE TRIGGER trg_convogram_notify_post_like
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.notify_convogram_post_like();

DROP TRIGGER IF EXISTS trg_convogram_notify_post_comment ON public.comments;
CREATE TRIGGER trg_convogram_notify_post_comment
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_convogram_post_comment();

DROP TRIGGER IF EXISTS trg_convogram_notify_follow ON public.follows;
CREATE TRIGGER trg_convogram_notify_follow
AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.notify_convogram_follow();

DROP TRIGGER IF EXISTS trg_convogram_notify_message ON public.messages;
CREATE TRIGGER trg_convogram_notify_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_convogram_message();

REVOKE ALL ON FUNCTION public.create_convogram_notification(UUID, UUID, VARCHAR, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_convogram_post_like() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_convogram_post_comment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_convogram_follow() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_convogram_message() FROM PUBLIC;
