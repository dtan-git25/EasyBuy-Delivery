# 🚨 Fix Production Database - Menu Groups Missing

## Problem

Production database is missing `menu_groups` and `menu_group_items` tables, causing merchant dashboard to crash.

## Solution: Use db:push

The **ONLY** safe way to fix this is using Drizzle's push command:

```bash
# On production server
npm run db:push --force
```

This will:
- Create `menu_groups` table
- Create `menu_group_items` table
- Skip all existing tables
- Add proper foreign keys and constraints

Then restart your application:
```bash
npm run start
```

## Why Not Use Migrations?

The generated migration file (`migrations/0000_chunky_leo.sql`) tries to create ALL 19 tables. Since production already has 17 of them, it will fail with "relation already exists" errors and rollback everything, leaving menu_groups still missing.

## Verify the Fix

After running `db:push --force`:

```bash
# Check tables were created
psql $DATABASE_URL -c "\dt menu_groups"
psql $DATABASE_URL -c "\dt menu_group_items"
```

Both should now exist.

## That's It

- ✅ Run: `npm run db:push --force`
- ✅ Restart: `npm run start`
- ✅ Done: Merchant dashboard will work

No migrations needed. No manual SQL needed. This is the Drizzle-recommended approach for syncing an existing database.
