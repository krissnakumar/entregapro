# Database Configuration Guide for EntregaPRO

To get the backend running, you need to set up **Postgres (with PostGIS)** and **Redis**.

## Option 1: Using Docker (Recommended)
This is the easiest way to ensure all extensions (like PostGIS) and dependencies (Redis) are correctly configured.

1. **Install Docker**: If not already installed, follow the instructions for your OS.
2. **Start Services**: From the root of the project (`/home/luara/Documents/EntregaPRO`), run:
   ```bash
   docker compose up -d db redis
   ```
   *Note: This will start the database with the credentials `postgres:postgrespassword` on port `5432`.*

---

## Option 1.5: Supabase (Production-Ready)
Use this when you want your backend and Prisma schema connected to Supabase Postgres.

### 1. Get Supabase connection values
From Supabase project settings (Database -> Connection string), collect:
- `PROJECT_REF`
- `DB_PASSWORD`
- Pooler host (port `6543`)
- Direct host `db.<PROJECT_REF>.supabase.co` (port `5432`)

### 2. Configure API env for Supabase
Copy the template and update values:
```bash
cp apps/api/.env.supabase.example apps/api/.env
```

Set:
- `DATABASE_URL` to pooled URL (runtime connections)
- `DIRECT_URL` to direct URL (Prisma migrations)

### 3. Apply Prisma schema to Supabase
From `apps/api`:
```bash
npm run prisma:generate
npm run prisma:migrate:deploy
```

If you are initializing a fresh Supabase DB and only want to sync current schema quickly:
```bash
npm run prisma:db:push
```

### 4. Verify
```bash
npm run build
npm run start:dev
```

If the app starts and API requests succeed, Supabase + schema are connected.

---

## Option 2: Manual Setup (Native Postgres)
If you prefer to run Postgres directly on your Linux system, follow these steps:

### 1. Create User and Database
Open your terminal and enter the Postgres prompt:
```bash
sudo -u postgres psql
```

Then run the following SQL commands:
```sql
-- Set the password for the postgres user
ALTER USER postgres WITH PASSWORD 'postgrespassword';

-- Create the EntregaPRO database
CREATE DATABASE entregapro;

-- Connect to the new database
\c entregapro

-- Enable the PostGIS extension (Required for tracking/zones)
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 2. Configure Environment Variables
Before running the API, ensure your `DATABASE_URL` matches the credentials above:
```bash
export DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/entregapro?schema=public"
```

---

## Final Verification
Once the database is set up and the `DATABASE_URL` is exported, run the backend:
```bash
# Generate the client
npx pnpm --filter api exec prisma generate

# Run the dev server
npx pnpm --filter api run start:dev
```
