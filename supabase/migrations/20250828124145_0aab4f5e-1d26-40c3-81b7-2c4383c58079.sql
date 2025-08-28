-- Create user profiles table for storing location data
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE,
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  city_id INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user profiles
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (auth.uid()::text = user_id::text);

-- Create weather cache table
CREATE TABLE IF NOT EXISTS public.weather_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  latitude NUMERIC(10,8) NOT NULL,
  longitude NUMERIC(11,8) NOT NULL,
  city TEXT NOT NULL,
  temperature NUMERIC(5,2),
  feels_like NUMERIC(5,2),
  humidity INTEGER,
  wind_speed NUMERIC(5,2),
  wind_direction INTEGER,
  weather_condition TEXT,
  uv_index NUMERIC(4,2),
  precipitation NUMERIC(6,2),
  temp_min NUMERIC(5,2),
  temp_max NUMERIC(5,2),
  forecast_data JSONB,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '15 minutes')
);

-- Enable RLS
ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;

-- Create policy for weather cache (public read for all users)
CREATE POLICY "Weather cache is readable by everyone" 
ON public.weather_cache 
FOR SELECT 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_weather_cache_location ON public.weather_cache(latitude, longitude);
CREATE INDEX idx_weather_cache_expires ON public.weather_cache(expires_at);

-- Create function to clean expired weather cache
CREATE OR REPLACE FUNCTION clean_expired_weather_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.weather_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Create function to update user profile timestamps
CREATE OR REPLACE FUNCTION update_user_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user profiles
CREATE TRIGGER update_user_profiles_timestamp
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profile_timestamp();