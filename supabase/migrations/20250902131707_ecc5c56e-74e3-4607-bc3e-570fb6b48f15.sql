-- Clean up duplicate SELECT policies to avoid confusion

-- Remove any duplicate or old SELECT policies 
DROP POLICY IF EXISTS "Users can only view their own profile" ON user_profiles;

-- Verify the final secure policy set
SELECT 'FINAL SECURE RLS POLICIES:' as status;
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'user_profiles' 
ORDER BY cmd, policyname;