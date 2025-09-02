-- Fix security definer function search paths to prevent mutable search path issues

-- Update update_user_profile_timestamp function
CREATE OR REPLACE FUNCTION public.update_user_profile_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$function$;

-- Update cleanup_expired_weather_cache function
CREATE OR REPLACE FUNCTION public.cleanup_expired_weather_cache()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  DELETE FROM public.weather_cache 
  WHERE expires_at < NOW();
END;
$function$;

-- Update clean_expired_weather_cache function
CREATE OR REPLACE FUNCTION public.clean_expired_weather_cache()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  DELETE FROM public.weather_cache WHERE expires_at < now();
END;
$function$;

-- Update log_user_profile_update function
CREATE OR REPLACE FUNCTION public.log_user_profile_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

-- Update hash_fcm_token function
CREATE OR REPLACE FUNCTION public.hash_fcm_token(token text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE STRICT
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Use SHA-256 to hash the FCM token
  RETURN encode(digest(token, 'sha256'), 'hex');
END;
$function$;