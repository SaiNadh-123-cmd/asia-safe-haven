-- Fix weather_cache security vulnerability
-- Current policy allows users to see weather data if within 0.1 degrees of ANY user
-- This could expose approximate locations of other users
-- New policy only allows access to weather data near user's own profile location

-- Drop the vulnerable policy
DROP POLICY IF EXISTS "weather_cache_user_location_select" ON weather_cache;

-- Create secure policy that only allows access to weather data near user's profile location
CREATE POLICY "weather_cache_user_profile_location_select" ON weather_cache
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid() 
    AND abs(user_profiles.latitude - weather_cache.latitude) < 0.1 
    AND abs(user_profiles.longitude - weather_cache.longitude) < 0.1
  )
);

-- Add comment explaining the security improvement
COMMENT ON POLICY "weather_cache_user_profile_location_select" ON weather_cache IS 
'Secure policy: Users can only view weather cache data near their own stored profile location, preventing location data leakage between users';