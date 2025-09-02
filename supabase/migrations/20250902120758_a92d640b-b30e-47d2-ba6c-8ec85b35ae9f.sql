-- Create audit_logs table for access logging
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit_logs
CREATE POLICY "Users can view their own audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Create function to log user profile updates
CREATE OR REPLACE FUNCTION public.log_user_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to sensitive location data and FCM tokens on updates
  INSERT INTO public.audit_logs (user_id, action, details)
  VALUES (
    NEW.user_id,
    'profile_data_update',
    jsonb_build_object(
      'updated_fields', CASE 
        WHEN OLD.latitude IS DISTINCT FROM NEW.latitude OR 
             OLD.longitude IS DISTINCT FROM NEW.longitude OR
             OLD.city IS DISTINCT FROM NEW.city OR
             OLD.state IS DISTINCT FROM NEW.state OR
             OLD.country IS DISTINCT FROM NEW.country OR
             OLD.fcm_token IS DISTINCT FROM NEW.fcm_token
        THEN jsonb_build_array('location_data', 'fcm_token')
        ELSE jsonb_build_array()
      END,
      'old_values', jsonb_build_object(
        'latitude', OLD.latitude,
        'longitude', OLD.longitude,
        'city', OLD.city,
        'state', OLD.state,
        'country', OLD.country
      ),
      'new_values', jsonb_build_object(
        'latitude', NEW.latitude,
        'longitude', NEW.longitude,
        'city', NEW.city,
        'state', NEW.state,
        'country', NEW.country
      )
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for logging updates to user_profiles
CREATE TRIGGER log_user_profile_update_trigger
  AFTER UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_user_profile_update();

-- Add function to hash FCM tokens
CREATE OR REPLACE FUNCTION public.hash_fcm_token(token TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Use SHA-256 to hash the FCM token
  RETURN encode(digest(token, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- Anonymize coordinates by rounding to 2 decimal places
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS latitude_rounded NUMERIC GENERATED ALWAYS AS (ROUND(latitude::numeric, 2)) STORED,
ADD COLUMN IF NOT EXISTS longitude_rounded NUMERIC GENERATED ALWAYS AS (ROUND(longitude::numeric, 2)) STORED;

-- Add column for hashed FCM token
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS fcm_token_hash TEXT;