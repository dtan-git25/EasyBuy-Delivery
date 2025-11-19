# 🚀 Production Database Fix

## Current Issue

Production is missing `menu_groups` and `menu_group_items` tables.

## Fix Now

```bash
# 1. SSH into production server

# 2. Pull latest code
git pull origin main

# 3. Sync database schema
npm run db:push --force

# 4. Restart application
npm run start
```

## That's It

The merchant dashboard will now work. The `db:push` command created the missing tables while leaving existing tables untouched.

## For Future Schema Changes

See `DEPLOYMENT_GUIDE.md` for the full workflow on how to handle future database schema changes using Drizzle's migration system.

The migration system (`drizzle-kit generate` / `drizzle-kit migrate`) is for new deployments or incremental changes **after** a baseline is established. For this immediate fix, `db:push` is the correct tool.
