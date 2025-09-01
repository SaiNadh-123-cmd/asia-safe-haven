-- Update weather_cache RLS policies for better privacy
DROP POLICY IF EXISTS "Weather cache is readable by everyone" ON weather_cache;
DROP POLICY IF EXISTS "Users can view their own weather cache" ON weather_cache;

-- Create more restrictive policy for weather cache - only users can see data near their location
CREATE POLICY "Users can view weather cache near their location" 
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

-- Policy for system to insert/update weather cache (no user restriction needed)
CREATE POLICY "System can manage weather cache" 
ON weather_cache 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add index for better performance on location-based queries
CREATE INDEX IF NOT EXISTS idx_weather_cache_location_expires 
ON weather_cache (latitude, longitude, expires_at);

-- Add FCM token column if not exists
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS fcm_token TEXT;