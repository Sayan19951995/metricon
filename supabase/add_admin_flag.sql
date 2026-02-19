-- Add is_admin flag to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Set specific user as admin (update the email to your admin email)
-- UPDATE users SET is_admin = true WHERE email = 'your-admin@email.com';
