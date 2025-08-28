-- Fix security issues: Drop trigger first, then recreate functions with proper search_path

-- Drop the trigger first
DROP TRIGGER IF EXISTS update_user_profiles_timestamp ON public.user_profiles;

-- Drop and recreate functions with proper search_path
DROP FUNCTION IF EXISTS update_user_profile_timestamp();
CREATE OR REPLACE FUNCTION update_user_profile_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS clean_expired_weather_cache();
CREATE OR REPLACE FUNCTION clean_expired_weather_cache()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.weather_cache WHERE expires_at < now();
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_user_profiles_timestamp
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profile_timestamp();