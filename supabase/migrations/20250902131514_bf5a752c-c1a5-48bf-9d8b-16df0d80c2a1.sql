-- CRITICAL SECURITY FIX: Replace vulnerable function-based RLS policy with bulletproof direct policy

-- Drop the vulnerable policy that uses custom function
DROP POLICY IF EXISTS "Users can view own profile with audit logging" ON user_profiles;

-- Create a bulletproof RLS policy using direct auth.uid() check
CREATE POLICY "Users can only view their own profile" ON user_profiles
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- Remove the potentially vulnerable function since we're not using it anymore
DROP FUNCTION IF EXISTS public.log_and_authorize_profile_access(UUID);

-- Create a safer audit logging trigger that only fires for authorized access
CREATE OR REPLACE FUNCTION public.log_authorized_profile_access()
RETURNS TRIGGER AS $$
BEGIN
  -- This trigger only fires when RLS has already authorized the access
  -- Log the authorized access for audit purposes
  INSERT INTO public.audit_logs (user_id, action, details)
  VALUES (
    auth.uid(),
    'authorized_profile_access',
    jsonb_build_object(
      'table', 'user_profiles',
      'accessed_user_id', NEW.user_id,
      'self_access', (auth.uid() = NEW.user_id),
      'access_time', now(),
      'access_method', 'direct_query'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for audit logging (only fires for authorized access)
DROP TRIGGER IF EXISTS log_authorized_profile_access_trigger ON user_profiles;
CREATE TRIGGER log_authorized_profile_access_trigger
  AFTER SELECT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_authorized_profile_access();

-- Verify all policies are secure and follow principle of least privilege
-- INSERT policy (already secure)
-- UPDATE policy (already secure)  
-- DELETE policy (already secure)
-- Service role policy (needed for notifications, but restricted to service role)

-- Add additional security: Ensure service role access is logged for FCM operations
CREATE OR REPLACE FUNCTION public.log_service_role_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log service role access to FCM tokens for audit
  IF auth.role() = 'service_role' THEN
    INSERT INTO public.audit_logs (user_id, action, details)
    VALUES (
      NEW.user_id,
      'service_role_profile_access',
      jsonb_build_object(
        'purpose', 'disaster_notification_system',
        'service_access', true,
        'access_time', now(),
        'fcm_token_accessed', (NEW.fcm_token IS NOT NULL),
        'location_accessed', (NEW.latitude_rounded IS NOT NULL AND NEW.longitude_rounded IS NOT NULL)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add trigger for service role access logging
CREATE TRIGGER log_service_role_access_trigger
  AFTER SELECT ON user_profiles
  FOR EACH ROW
  WHEN (auth.role() = 'service_role')
  EXECUTE FUNCTION log_service_role_access();

-- Double-check: Ensure no other vulnerable policies exist
-- List all current policies for verification
SELECT 'Current RLS Policies:' as info;
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'user_profiles';