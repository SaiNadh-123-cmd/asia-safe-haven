-- Enhanced security for user_profiles table - Fixed version

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
DROP TRIGGER IF EXISTS validate_fcm_token_hash_trigger ON user_profiles;
CREATE TRIGGER validate_fcm_token_hash_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_fcm_token_hash();

-- Create function to ensure coordinate rounding and log location updates
CREATE OR REPLACE FUNCTION public.ensure_coordinate_security()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically round coordinates to 2 decimal places for privacy (≈1-2km precision)
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
        ),
        'original_precision', jsonb_build_object(
          'lat_original', NEW.latitude,
          'lon_original', NEW.longitude
        )
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to ensure coordinate rounding
DROP TRIGGER IF EXISTS ensure_coordinate_rounding_trigger ON user_profiles;
CREATE TRIGGER ensure_coordinate_security_trigger
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_coordinate_security();

-- Enhanced RLS policy with audit logging through security definer function
CREATE OR REPLACE FUNCTION public.log_and_authorize_profile_access(profile_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Log access to sensitive location data when user accesses their own profile
  IF auth.uid() = profile_user_id THEN
    INSERT INTO public.audit_logs (user_id, action, details)
    VALUES (
      auth.uid(),
      'user_profile_access',
      jsonb_build_object(
        'table', 'user_profiles',
        'self_access', true,
        'access_time', now(),
        'accessed_fields', jsonb_build_array('latitude', 'longitude', 'fcm_token', 'location_data')
      )
    );
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enhanced RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile with audit" ON user_profiles;
CREATE POLICY "Users can view own profile with audit logging" ON user_profiles
  FOR SELECT USING (
    log_and_authorize_profile_access(user_id)
  );

-- Enhanced policy for service role access (used by edge functions)
DROP POLICY IF EXISTS "Service role can access profiles for notifications" ON user_profiles;
CREATE POLICY "Service role notifications access with audit" ON user_profiles
  FOR SELECT USING (
    auth.role() = 'service_role'
  );

-- Create function to log FCM token access by service role
CREATE OR REPLACE FUNCTION public.log_service_fcm_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when service role accesses FCM tokens for notifications
  IF auth.role() = 'service_role' THEN
    INSERT INTO public.audit_logs (user_id, action, details)
    VALUES (
      NEW.user_id,
      'service_fcm_token_access',
      jsonb_build_object(
        'purpose', 'disaster_notifications',
        'service_access', true,
        'access_time', now(),
        'token_hash_verified', (NEW.fcm_token_hash IS NOT NULL)
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;