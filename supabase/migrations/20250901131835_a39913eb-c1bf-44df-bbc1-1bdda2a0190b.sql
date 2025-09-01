-- Fix weather_cache RLS policies to be more restrictive
DROP POLICY IF EXISTS "weather_cache_system_insert" ON public.weather_cache;
DROP POLICY IF EXISTS "weather_cache_system_update" ON public.weather_cache;

-- Create service-role only policies for weather_cache
CREATE POLICY "weather_cache_service_insert" 
ON public.weather_cache 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "weather_cache_service_update" 
ON public.weather_cache 
FOR UPDATE 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Add missing DELETE policy for user_profiles
CREATE POLICY "Users can delete their own profile" 
ON public.user_profiles 
FOR DELETE 
USING (auth.uid()::text = user_id::text);