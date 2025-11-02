-- Create SUPER_ADMIN user: sa@otico.no
-- Password: SuperAdmin123!
-- This SQL can be run directly in Railway's PostgreSQL console

-- First, get the first tenant ID
DO $$
DECLARE
  v_tenant_id UUID;
  v_existing_user_id UUID;
BEGIN
  -- Get first tenant
  SELECT id INTO v_tenant_id FROM tenants LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant found. Please create a tenant first.';
  END IF;

  -- Check if user exists
  SELECT id INTO v_existing_user_id FROM users WHERE email = 'sa@otico.no';

  IF v_existing_user_id IS NOT NULL THEN
    -- Update existing user to SUPER_ADMIN
    UPDATE users
    SET role = 'SUPER_ADMIN', active = true
    WHERE id = v_existing_user_id;

    RAISE NOTICE 'User sa@otico.no updated to SUPER_ADMIN';
  ELSE
    -- Create new user
    -- Password hash for: SuperAdmin123!
    INSERT INTO users (
      id,
      "tenantId",
      email,
      password,
      "firstName",
      "lastName",
      username,
      role,
      active,
      "emailVerified",
      "createdAt",
      "updatedAt"
    ) VALUES (
      gen_random_uuid(),
      v_tenant_id,
      'sa@otico.no',
      '$2a$10$VQz8YfG5pH.MtKHnxzUo5OJ5r7qF3FkB8vXhNjKx9mZQPxK5YFzTi',
      'Super',
      'Admin',
      'superadmin',
      'SUPER_ADMIN',
      true,
      true,
      NOW(),
      NOW()
    );

    RAISE NOTICE 'User sa@otico.no created as SUPER_ADMIN';
  END IF;
END $$;

-- Verify the user was created/updated
SELECT
  id,
  email,
  role,
  active,
  "firstName",
  "lastName",
  username
FROM users
WHERE email = 'sa@otico.no';
