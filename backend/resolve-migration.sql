-- SQL script to mark the failed migration as applied
-- Run this against Railway database

UPDATE "_prisma_migrations"
SET finished_at = NOW(),
    applied_steps_count = 1,
    logs = 'Migration marked as resolved manually - table did not exist, fixed in later migration'
WHERE migration_name = '20251028200841_add_door_is_locked_field';
