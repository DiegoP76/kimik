-- Fix admin RLS policies: remove LIMIT 1 so ALL admins can act
DROP POLICY IF EXISTS "Admin can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admin can delete any profile" ON profiles;
DROP POLICY IF EXISTS "Admin can update any conflict" ON conflicts;
DROP POLICY IF EXISTS "Admin can delete any conflict" ON conflicts;

-- Admin can update any profile (all admins, not just first)
CREATE POLICY "Admin can update any profile" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can delete any profile
CREATE POLICY "Admin can delete any profile" ON profiles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can update any conflict
CREATE POLICY "Admin can update any conflict" ON conflicts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can delete any conflict
CREATE POLICY "Admin can delete any conflict" ON conflicts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Add missing DELETE policies for admin operations
-- Admin can delete votes (for user deletion cascade)
CREATE POLICY "Admin can delete votes" ON votes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can delete professional opinions (for conflict deletion cascade)
CREATE POLICY "Admin can delete professional opinions" ON professional_opinions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can delete professional profiles
CREATE POLICY "Admin can delete professional profiles" ON professional_profiles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can delete their own votes (optional, for unvoting)
CREATE POLICY "Users can delete own votes" ON votes
  FOR DELETE USING (
    auth.uid() = user_id
  );
