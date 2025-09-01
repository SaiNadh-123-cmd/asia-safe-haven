-- Fix security issues: Add RLS policies and FCM token field

-- Add FCM token field to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Add city_id field if not exists (for IMD compatibility)
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS city_id INTEGER;

-- Enable RLS on weather_cache table (currently missing)
ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;

-- Create weather_cache policies to make it private
CREATE POLICY "Users can view their own weather cache" 
ON public.weather_cache 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_profiles.user_id = auth.uid()
    AND ABS(user_profiles.latitude - weather_cache.latitude) < 0.01
    AND ABS(user_profiles.longitude - weather_cache.longitude) < 0.01
  )
);

CREATE POLICY "System can insert weather cache" 
ON public.weather_cache 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update weather cache" 
ON public.weather_cache 
FOR UPDATE 
USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_weather_cache_location 
ON public.weather_cache (latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_user_profiles_location 
ON public.user_profiles (latitude, longitude);

-- Create function to clean expired cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_weather_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.weather_cache 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;