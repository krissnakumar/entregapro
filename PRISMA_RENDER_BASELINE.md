# Prisma Render Baseline

Use this when Render fails with:

```text
Error: P3005
The database schema is not empty.
```

or when Prisma says `DATABASE_URL` resolved to an empty string.

## Why this happens

- Render deploys now use Prisma migrations with the direct database connection.
- Your production Supabase database already has tables.
- Prisma needs a one-time baseline so it knows those old migrations were already applied.

## 1. Make sure you have the direct database URL

Check whether `DIRECT_URL` exists in your shell:

```bash
echo "$DIRECT_URL"
```

If it prints nothing, set it first:

```bash
export DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require"
```

Important:

- `DIRECT_URL` must be the Supabase direct connection string
- not the pooled connection string

## 2. Go to the API folder

```bash
cd /home/luara/Documents/EntregaPRO/apps/api
```

## 3. Mark the existing migrations as already applied

Run these one time:

```bash
DATABASE_URL="$DIRECT_URL" pnpm exec prisma migrate resolve --applied 20260511021542_rbac_upgrade
DATABASE_URL="$DIRECT_URL" pnpm exec prisma migrate resolve --applied 20260511031554_add_phone_and_upgrade
DATABASE_URL="$DIRECT_URL" pnpm exec prisma migrate resolve --applied 20260511041347_add_missing_columns
DATABASE_URL="$DIRECT_URL" pnpm exec prisma migrate resolve --applied 20260511221629_add_invoices
DATABASE_URL="$DIRECT_URL" pnpm exec prisma migrate resolve --applied 20260511232257_enterprise_upgrade_v1
DATABASE_URL="$DIRECT_URL" pnpm exec prisma migrate resolve --applied 20260523025125_add_customer_email
DATABASE_URL="$DIRECT_URL" pnpm exec prisma migrate resolve --applied 20260528000100_add_system_settings
DATABASE_URL="$DIRECT_URL" pnpm exec prisma migrate resolve --applied 20260528000200_add_user_avatar
DATABASE_URL="$DIRECT_URL" pnpm exec prisma migrate resolve --applied 20260601191800_sync_schema_changes
DATABASE_URL="$DIRECT_URL" pnpm exec prisma migrate resolve --applied 20260604000000_add_delivery_workflow_models
```

## 4. Verify migration status

```bash
DATABASE_URL="$DIRECT_URL" pnpm exec prisma migrate status
```

If this succeeds, Prisma now recognizes the production database history.

## 5. Redeploy Render

After the baseline succeeds, trigger a new Render deploy.

The repo is already configured to use the safer deploy path:

- [render.yaml](/home/luara/Documents/EntregaPRO/render.yaml:1)
- [package.json](/home/luara/Documents/EntregaPRO/package.json:1)

## Render env vars

In Render, make sure these are set:

- `DATABASE_URL` = Supabase pooled connection string
- `DIRECT_URL` = Supabase direct connection string

## Notes

- The `@prisma/client postinstall` warning about schema location is harmless in this monorepo.
- `pnpm exec prisma ...` is required if `prisma` is not globally installed.
- This baseline step is usually needed only once per existing production database.
