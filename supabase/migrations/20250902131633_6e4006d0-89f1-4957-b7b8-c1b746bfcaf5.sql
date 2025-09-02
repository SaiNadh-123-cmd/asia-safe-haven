-- CRITICAL SECURITY FIX: Replace vulnerable function-based RLS policy

-- Drop the vulnerable policy that uses custom function
DROP POLICY IF EXISTS "Users can view own profile with audit logging" ON user_profiles;

-- Create a bulletproof RLS policy using direct auth.uid() check
CREATE POLICY "Users can only access their own profile" ON user_profiles
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- Remove the potentially vulnerable function since we're not using it
DROP FUNCTION IF EXISTS public.log_and_authorize_profile_access(UUID);

-- Verify all current policies are secure
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'user_profiles' 
ORDER BY policyname;