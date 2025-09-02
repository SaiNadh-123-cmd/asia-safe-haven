-- CRITICAL SECURITY FIX: Replace vulnerable function-based RLS policy with bulletproof direct policy

-- Drop the vulnerable policy that uses custom function
DROP POLICY IF EXISTS "Users can view own profile with audit logging" ON user_profiles;

-- Create a bulletproof RLS policy using direct auth.uid() check
-- This ensures users can ONLY access their own profile data
CREATE POLICY "Users can only view their own profile" ON user_profiles
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- Remove the potentially vulnerable function since we're not using it anymore
DROP FUNCTION IF EXISTS public.log_and_authorize_profile_access(UUID);

-- Verify current security policies
SELECT 'SECURITY VERIFICATION - Current RLS Policies for user_profiles:' as verification;
SELECT 
  policyname, 
  cmd, 
  qual as "using_condition",
  with_check as "with_check_condition"
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY cmd, policyname;