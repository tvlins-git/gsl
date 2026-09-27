-- One Expo push token → one user. When a member registers a token that was
-- previously attached to another account (shared TestFlight / account switch),
-- drop the stale rows so send-push does not dual-register the same device.

CREATE OR REPLACE FUNCTION public.claim_device_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.device_tokens
  WHERE expo_push_token = NEW.expo_push_token
    AND user_id IS DISTINCT FROM NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS device_tokens_claim_token ON public.device_tokens;
CREATE TRIGGER device_tokens_claim_token
  AFTER INSERT OR UPDATE OF expo_push_token, user_id
  ON public.device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.claim_device_token();
