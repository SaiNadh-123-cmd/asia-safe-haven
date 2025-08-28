-- Fix security issues: Update functions with proper search_path

-- Drop and recreate function with proper search_path
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

-- Drop and recreate function with proper search_path
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