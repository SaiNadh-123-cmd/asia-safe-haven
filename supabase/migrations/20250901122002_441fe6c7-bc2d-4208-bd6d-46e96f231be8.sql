-- Drop all existing policies on weather_cache
DROP POLICY IF EXISTS "Weather cache is readable by everyone" ON weather_cache;
DROP POLICY IF EXISTS "Users can view their own weather cache" ON weather_cache;
DROP POLICY IF EXISTS "System can insert weather cache" ON weather_cache;
DROP POLICY IF EXISTS "System can update weather cache" ON weather_cache;
DROP POLICY IF EXISTS "Users can view weather cache near their location" ON weather_cache;
DROP POLICY IF EXISTS "System can manage weather cache" ON weather_cache;

-- Create new restrictive policies for weather cache
CREATE POLICY "weather_cache_user_location_select" 
ON weather_cache 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid() 
    AND abs(user_profiles.latitude - weather_cache.latitude) < 0.1 
    AND abs(user_profiles.longitude - weather_cache.longitude) < 0.1
  )
);

-- System can insert weather data
CREATE POLICY "weather_cache_system_insert" 
ON weather_cache 
FOR INSERT 
WITH CHECK (true);

-- System can update weather data
CREATE POLICY "weather_cache_system_update" 
ON weather_cache 
FOR UPDATE 
USING (true) 
WITH CHECK (true);

-- Add index for better performance on location-based queries
CREATE INDEX IF NOT EXISTS idx_weather_cache_location_expires 
ON weather_cache (latitude, longitude, expires_at);

-- Add FCM token column if not exists
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS fcm_token TEXT;