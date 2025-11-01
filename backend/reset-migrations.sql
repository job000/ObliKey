-- Reset all Prisma migrations and start fresh
-- This is safe since the database is new

-- Delete all migration records
DELETE FROM "_prisma_migrations";

-- Alternatively, just delete the problematic one:
-- DELETE FROM "_prisma_migrations" WHERE migration_name = '20251028200841_add_door_is_locked_field';
