-- Fix Supabase security issues (targeted migration)

-- Add user_id column to weather_cache for better privacy if it doesn't exist
ALTER TABLE public.weather_cache ADD COLUMN IF NOT EXISTS user_id UUID;

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_weather_cache_user_location ON public.weather_cache(user_id, latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_weather_cache_expires ON public.weather_cache(expires_at);

-- Drop existing weather_cache policies that need updating
DROP POLICY IF EXISTS "weather_cache_user_profile_location_select" ON public.weather_cache;
DROP POLICY IF EXISTS "weather_cache_service_insert" ON public.weather_cache;
DROP POLICY IF EXISTS "weather_cache_service_update" ON public.weather_cache;

-- New weather_cache policies for better security
CREATE POLICY "Users can view their own weather cache" ON public.weather_cache
FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can manage weather cache" ON public.weather_cache
FOR ALL USING (auth.role() = 'service_role');

-- Create function to validate weather data before caching
CREATE OR REPLACE FUNCTION public.validate_weather_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Round coordinates for privacy
  NEW.latitude = ROUND(NEW.latitude::numeric, 2);
  NEW.longitude = ROUND(NEW.longitude::numeric, 2);
  
  -- Ensure expires_at is not too far in future (max 1 hour)
  IF NEW.expires_at > (now() + interval '1 hour') THEN
    NEW.expires_at = now() + interval '15 minutes';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for weather data validation
DROP TRIGGER IF EXISTS validate_weather_data_trigger ON public.weather_cache;
CREATE TRIGGER validate_weather_data_trigger
  BEFORE INSERT OR UPDATE ON public.weather_cache
  FOR EACH ROW EXECUTE FUNCTION public.validate_weather_data();

-- Create function to log location access 
CREATE OR REPLACE FUNCTION public.log_location_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log location access for security audit
  INSERT INTO public.audit_logs (user_id, action, details)
  VALUES (
    NEW.user_id,
    'location_access',
    jsonb_build_object(
      'latitude_rounded', NEW.latitude_rounded,
      'longitude_rounded', NEW.longitude_rounded,
      'city', NEW.city,
      'access_time', now()
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for location access logging
DROP TRIGGER IF EXISTS log_location_access_trigger ON public.user_profiles;
CREATE TRIGGER log_location_access_trigger
  AFTER UPDATE OF latitude, longitude ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_location_access();