-- This migration creates the Door Access Control tables that were missing from the schema

-- CreateEnum for Door Access types (if not exists)
DO $$ BEGIN
 CREATE TYPE "DoorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ERROR');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "AccessRuleType" AS ENUM ('MEMBERSHIP', 'ROLE', 'USER_SPECIFIC', 'TIME_BASED', 'CREDENTIAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "ScheduleType" AS ENUM ('WEEKLY_RECURRING', 'DATE_RANGE', 'HOLIDAY', 'OVERRIDE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "AccessResult" AS ENUM ('GRANTED', 'DENIED_NO_CREDENTIAL', 'DENIED_EXPIRED', 'DENIED_INACTIVE', 'DENIED_SUSPENDED', 'DENIED_TIME', 'DENIED_BLACKLISTED', 'DENIED_NO_PERMISSION', 'ERROR', 'FORCED_OPEN', 'HELD_OPEN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "IntegrationType" AS ENUM ('SALTO', 'ASSA_ABLOY', 'AXIS', 'PAXTON', 'GENERIC_WIEGAND', 'REST_API', 'MQTT', 'WEBHOOK', 'MANUAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "CredentialType" AS ENUM ('RFID_CARD', 'PIN_CODE', 'QR_CODE', 'MOBILE_KEY', 'BIOMETRIC', 'BARCODE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "CredentialStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'LOST', 'STOLEN', 'SUSPENDED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateTable doors (if not exists)
CREATE TABLE IF NOT EXISTS "doors" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "status" "DoorStatus" NOT NULL DEFAULT 'ACTIVE',
    "integrationId" TEXT,
    "hardwareId" TEXT,
    "ipAddress" TEXT,
    "requiresCredential" BOOLEAN NOT NULL DEFAULT true,
    "allowManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "alarmEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "isLocked" BOOLEAN NOT NULL DEFAULT true,
    "lastOnline" TIMESTAMP(3),
    "batteryLevel" INTEGER,
    "unlockDuration" INTEGER NOT NULL DEFAULT 5,
    "openTooLongAlert" INTEGER NOT NULL DEFAULT 30,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doors_pkey" PRIMARY KEY ("id")
);

-- CreateTable door_access_rules (if not exists)
CREATE TABLE IF NOT EXISTS "door_access_rules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "doorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "AccessRuleType" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB,
    "allowedRoles" TEXT[],
    "allowedUserIds" TEXT[],
    "allowedMembershipStatuses" TEXT[],
    "scheduleId" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "door_access_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable door_schedules (if not exists)
CREATE TABLE IF NOT EXISTS "door_schedules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ScheduleType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "daysOfWeek" "DayOfWeek"[],
    "startTime" TEXT,
    "endTime" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "isOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "doorId" TEXT,

    CONSTRAINT "door_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable door_access_logs (if not exists)
CREATE TABLE IF NOT EXISTS "door_access_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "doorId" TEXT NOT NULL,
    "userId" TEXT,
    "membershipId" TEXT,
    "result" "AccessResult" NOT NULL,
    "accessMethod" TEXT,
    "credentialId" TEXT,
    "denialReason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "door_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable door_integration_configs (if not exists)
CREATE TABLE IF NOT EXISTS "door_integration_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "doorId" TEXT,
    "type" "IntegrationType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "endpoint" TEXT,
    "username" TEXT,
    "password" TEXT,
    "apiKey" TEXT,
    "clientId" TEXT,
    "clientSecret" TEXT,
    "protocol" TEXT,
    "port" INTEGER,
    "useSsl" BOOLEAN NOT NULL DEFAULT true,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "syncInterval" INTEGER NOT NULL DEFAULT 60,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncError" TEXT,
    "fieldMapping" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "door_integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable door_credentials (if not exists)
CREATE TABLE IF NOT EXISTS "door_credentials" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CredentialType" NOT NULL,
    "status" "CredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "credentialData" TEXT NOT NULL,
    "facilityCode" TEXT,
    "name" TEXT,
    "description" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "externalId" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "reportedLostAt" TIMESTAMP(3),
    "reportedStolenAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspensionReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "door_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (if not exists)
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS "doors_tenantId_status_idx" ON "doors"("tenantId", "status");
    CREATE INDEX IF NOT EXISTS "doors_tenantId_name_idx" ON "doors"("tenantId", "name");
    CREATE INDEX IF NOT EXISTS "door_access_rules_tenantId_doorId_idx" ON "door_access_rules"("tenantId", "doorId");
    CREATE INDEX IF NOT EXISTS "door_access_rules_doorId_active_idx" ON "door_access_rules"("doorId", "active");
    CREATE INDEX IF NOT EXISTS "door_access_rules_type_idx" ON "door_access_rules"("type");
    CREATE INDEX IF NOT EXISTS "door_schedules_tenantId_active_idx" ON "door_schedules"("tenantId", "active");
    CREATE INDEX IF NOT EXISTS "door_schedules_type_idx" ON "door_schedules"("type");
    CREATE INDEX IF NOT EXISTS "door_access_logs_tenantId_timestamp_idx" ON "door_access_logs"("tenantId", "timestamp");
    CREATE INDEX IF NOT EXISTS "door_access_logs_doorId_timestamp_idx" ON "door_access_logs"("doorId", "timestamp");
    CREATE INDEX IF NOT EXISTS "door_access_logs_userId_timestamp_idx" ON "door_access_logs"("userId", "timestamp");
    CREATE INDEX IF NOT EXISTS "door_access_logs_membershipId_timestamp_idx" ON "door_access_logs"("membershipId", "timestamp");
    CREATE INDEX IF NOT EXISTS "door_access_logs_result_idx" ON "door_access_logs"("result");
    CREATE INDEX IF NOT EXISTS "door_access_logs_timestamp_idx" ON "door_access_logs"("timestamp");
    CREATE INDEX IF NOT EXISTS "door_integration_configs_tenantId_active_idx" ON "door_integration_configs"("tenantId", "active");
    CREATE INDEX IF NOT EXISTS "door_integration_configs_doorId_idx" ON "door_integration_configs"("doorId");
    CREATE INDEX IF NOT EXISTS "door_integration_configs_type_idx" ON "door_integration_configs"("type");
    CREATE INDEX IF NOT EXISTS "door_credentials_tenantId_userId_idx" ON "door_credentials"("tenantId", "userId");
    CREATE INDEX IF NOT EXISTS "door_credentials_userId_status_idx" ON "door_credentials"("userId", "status");
    CREATE INDEX IF NOT EXISTS "door_credentials_credentialData_idx" ON "door_credentials"("credentialData");
    CREATE INDEX IF NOT EXISTS "door_credentials_type_status_idx" ON "door_credentials"("type", "status");
    CREATE INDEX IF NOT EXISTS "door_credentials_status_idx" ON "door_credentials"("status");
END $$;

-- AddForeignKey (if not exists)
DO $$ BEGIN
    ALTER TABLE "doors" ADD CONSTRAINT "doors_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "door_access_rules" ADD CONSTRAINT "door_access_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "door_access_rules" ADD CONSTRAINT "door_access_rules_doorId_fkey" FOREIGN KEY ("doorId") REFERENCES "doors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "door_access_rules" ADD CONSTRAINT "door_access_rules_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "door_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "door_schedules" ADD CONSTRAINT "door_schedules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "door_schedules" ADD CONSTRAINT "door_schedules_doorId_fkey" FOREIGN KEY ("doorId") REFERENCES "doors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "door_access_logs" ADD CONSTRAINT "door_access_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "door_access_logs" ADD CONSTRAINT "door_access_logs_doorId_fkey" FOREIGN KEY ("doorId") REFERENCES "doors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "door_access_logs" ADD CONSTRAINT "door_access_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "door_access_logs" ADD CONSTRAINT "door_access_logs_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "door_access_logs" ADD CONSTRAINT "door_access_logs_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "door_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "door_integration_configs" ADD CONSTRAINT "door_integration_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "door_integration_configs" ADD CONSTRAINT "door_integration_configs_doorId_fkey" FOREIGN KEY ("doorId") REFERENCES "doors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "door_credentials" ADD CONSTRAINT "door_credentials_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "door_credentials" ADD CONSTRAINT "door_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
