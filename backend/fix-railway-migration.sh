#!/bin/bash

# Script to resolve failed migration in Railway database

echo "🔧 Resolving failed migration in Railway database..."
echo ""

# Get Railway database URL
echo "Step 1: Getting DATABASE_URL from Railway..."
echo "Run this command to mark the failed migration as resolved:"
echo ""
echo "railway run npx prisma migrate resolve --applied 20251028200841_add_door_is_locked_field"
echo ""
echo "This will tell Prisma that the migration has been handled manually."
echo ""
echo "Then Railway should automatically redeploy and run the new migrations."
