-- Add city_id column to user_profiles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'city_id') THEN
        ALTER TABLE public.user_profiles ADD COLUMN city_id integer;
    END IF;
END $$;

-- Update the user profile update trigger to handle all profile changes
CREATE OR REPLACE FUNCTION public.update_user_profile_timestamp()
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

-- Add indexes for better performance on location queries  
CREATE INDEX IF NOT EXISTS idx_user_profiles_coordinates ON public.user_profiles (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_user_profiles_city_id ON public.user_profiles (city_id);
CREATE INDEX IF NOT EXISTS idx_weather_cache_coordinates ON public.weather_cache (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_weather_cache_expires ON public.weather_cache (expires_at);