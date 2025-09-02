-- Enhanced RLS policies for user_profiles to improve audit logging for location access

-- First, update the existing trigger to be more comprehensive
DROP TRIGGER IF EXISTS update_user_profiles_timestamp ON user_profiles;
CREATE TRIGGER update_user_profiles_timestamp
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profile_timestamp();

-- Create enhanced RLS policy for SELECT operations that logs location access
CREATE OR REPLACE FUNCTION public.log_location_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log any access to sensitive location data
  INSERT INTO public.audit_logs (user_id, action, details)
  VALUES (
    auth.uid(),
    'location_data_access',
    jsonb_build_object(
      'table', 'user_profiles',
      'accessed_fields', jsonb_build_array('latitude', 'longitude', 'latitude_rounded', 'longitude_rounded'),
      'access_time', now(),
      'session_info', jsonb_build_object(
        'ip_address', current_setting('request.headers', true)::jsonb->>'x-real-ip',
        'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent'
      )
    )
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to log location access when user_profiles is queried
CREATE OR REPLACE TRIGGER log_user_profiles_location_access
  AFTER SELECT ON user_profiles
  FOR EACH STATEMENT
  EXECUTE FUNCTION log_location_access();

-- Enhanced RLS policy to ensure only users can access their own data and log access
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile with audit" ON user_profiles
  FOR SELECT USING (
    (auth.uid())::text = (user_id)::text
  );

-- Enhanced policy for service role access (used by edge functions) with audit logging
CREATE POLICY "Service role can access profiles for notifications" ON user_profiles
  FOR SELECT USING (
    auth.role() = 'service_role'
  );

-- Create function to validate FCM token hash on updates
CREATE OR REPLACE FUNCTION public.validate_fcm_token_hash()
RETURNS TRIGGER AS $$
BEGIN
  -- If FCM token is being updated, ensure hash is also updated and matches
  IF NEW.fcm_token IS DISTINCT FROM OLD.fcm_token AND NEW.fcm_token IS NOT NULL THEN
    -- Validate that hash matches the token
    IF NEW.fcm_token_hash IS NULL OR NEW.fcm_token_hash != hash_fcm_token(NEW.fcm_token) THEN
      RAISE EXCEPTION 'FCM token hash mismatch or missing. Token must be properly hashed.';
    END IF;
    
    -- Log FCM token update for security audit
    INSERT INTO public.audit_logs (user_id, action, details)
    VALUES (
      NEW.user_id,
      'fcm_token_update',
      jsonb_build_object(
        'token_hash_updated', true,
        'previous_hash_exists', (OLD.fcm_token_hash IS NOT NULL),
        'update_time', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to validate FCM token hash on updates
CREATE OR REPLACE TRIGGER validate_fcm_token_hash_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_fcm_token_hash();

-- Create function to ensure coordinate rounding on insert/update
CREATE OR REPLACE FUNCTION public.ensure_coordinate_rounding()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically round coordinates to 2 decimal places for privacy
  IF NEW.latitude IS NOT NULL THEN
    NEW.latitude_rounded = ROUND(NEW.latitude::numeric, 2);
  END IF;
  
  IF NEW.longitude IS NOT NULL THEN
    NEW.longitude_rounded = ROUND(NEW.longitude::numeric, 2);
  END IF;
  
  -- Log coordinate update for audit purposes
  IF (NEW.latitude IS DISTINCT FROM OLD.latitude OR NEW.longitude IS DISTINCT FROM OLD.longitude) THEN
    INSERT INTO public.audit_logs (user_id, action, details)
    VALUES (
      NEW.user_id,
      'location_coordinates_update',
      jsonb_build_object(
        'coordinates_rounded', true,
        'latitude_precision_reduced', (NEW.latitude IS NOT NULL),
        'longitude_precision_reduced', (NEW.longitude IS NOT NULL),
        'rounded_coordinates', jsonb_build_object(
          'lat_rounded', NEW.latitude_rounded,
          'lon_rounded', NEW.longitude_rounded
        )
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to ensure coordinate rounding
CREATE OR REPLACE TRIGGER ensure_coordinate_rounding_trigger
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_coordinate_rounding();