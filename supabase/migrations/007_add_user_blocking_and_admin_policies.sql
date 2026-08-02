-- Add blocking columns to profiles
ALTER TABLE profiles ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN blocked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN blocked_permanently BOOLEAN DEFAULT FALSE;

-- Admin can update any profile
CREATE POLICY "Admin can update any profile" ON profiles
  FOR UPDATE USING (
    auth.uid() = (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
  );

-- Admin can delete any profile
CREATE POLICY "Admin can delete any profile" ON profiles
  FOR DELETE USING (
    auth.uid() = (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
  );

-- Admin can view all profiles (already covered by public select, but being explicit)
CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (true);

-- Admin can update any conflict
CREATE POLICY "Admin can update any conflict" ON conflicts
  FOR UPDATE USING (
    auth.uid() = (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
  );

-- Admin can delete any conflict
CREATE POLICY "Admin can delete any conflict" ON conflicts
  FOR DELETE USING (
    auth.uid() = (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
  );

-- Function to auto-unblock users whose block period has expired
CREATE OR REPLACE FUNCTION auto_unblock_users()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET is_blocked = FALSE, blocked_until = NULL
  WHERE is_blocked = TRUE
    AND blocked_permanently = FALSE
    AND blocked_until IS NOT NULL
    AND blocked_until <= NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check for expired blocks on login (via auth.users)
CREATE OR REPLACE FUNCTION handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET is_blocked = FALSE, blocked_until = NULL
  WHERE id = NEW.id
    AND is_blocked = TRUE
    AND blocked_permanently = FALSE
    AND blocked_until IS NOT NULL
    AND blocked_until <= NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
