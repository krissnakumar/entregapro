# EntregaPRO Project Credentials & Access Info

This file contains all the user, database, and system credentials discovered in the EntregaPRO monorepo.

---

## 👤 Test User Accounts

These accounts are seeded in the database (`apps/api/prisma/seed.ts`) and can be used to log in to the web and mobile applications (Driver, Dispatcher, Admin).

### **Organization 1: Construtora Modelo LTDA** *(Slug: `construtora-modelo`)*
* **Administrator**: 
  * **Email**: `admin@construtoramodelo.com.br`
  * **Password**: `admin123`
* **Dispatcher (Logistics Operator)**:
  * **Email**: `despachante@construtoramodelo.com.br`
  * **Password**: `admin123`
* **Driver (João Caminhoneiro)**:
  * **Email**: `joao@cm.com.br`
  * **Password**: `driver123`

### **Organization 2: Materiais de Construção ABC** *(Slug: `materiais-abc`)*
* **Administrator**: 
  * **Email**: `admin@materiaisabc.com.br`
  * **Password**: `admin123`
* **Dispatcher (Logistics Operator)**:
  * **Email**: `despachante@materiaisabc.com.br`
  * **Password**: `admin123`
* **Driver (Marcos Rápido)**:
  * **Email**: `marcos@abc.com.br`
  * **Password**: `driver123`

### **Global System Administrator**
* **Email**: `admin@entregapro.com`
* **Password**: `admin123`

---

## 🗄️ Database & Cloud Infrastructure Credentials

These connection credentials link the NestJS API server to the hosted Supabase PostgreSQL instance.

* **Database Connection Pooler URL** (`DATABASE_URL`):
  ```text
  postgresql://postgres.fafnvclhkbknzsbmmhvg:Lalilaloo!123@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10&schema=public&sslmode=require
  ```
* **Database Direct Connection URL** (`DIRECT_URL`):
  ```text
  postgresql://postgres.fafnvclhkbknzsbmmhvg:Lalilaloo!123@aws-1-us-east-2.pooler.supabase.com:5432/postgres?schema=public&sslmode=require
  ```
* **Supabase Project URL**:
  ```text
  https://fafnvclhkbknzsbmmhvg.supabase.co
  ```
* **Supabase Anon Public API Key**:
  ```text
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhZm52Y2xoa2JrbnpzYm1taHZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MTQ4ODEsImV4cCI6MjA5Mzk5MDg4MX0.92eP0m3zVuVBwPBUqkgEgkQjJGey-1PJllj-FcATAo4
  ```

---

## 🔑 Security Secrets
* **JWT Secret (Development)**: `super-secret-key-for-development`
* **JWT Refresh Secret (Development)**: `another-super-secret-key-for-refresh`
* **JWT Secret (Production)**: `super-secret-key-for-production`
