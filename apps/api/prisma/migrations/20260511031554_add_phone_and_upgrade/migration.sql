/*
  Warnings:

  - You are about to drop the column `proofImage` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Permission` table. All the data in the column will be lost.
  - The primary key for the `RolePermission` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `permissionId` on the `RolePermission` table. All the data in the column will be lost.
  - You are about to drop the column `roleId` on the `RolePermission` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `roleId` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[key]` on the table `Permission` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `key` to the `Permission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `permission_id` to the `RolePermission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_id` to the `RolePermission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password_hash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_roleId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_roleId_fkey";

-- DropIndex
DROP INDEX "Permission_name_key";

-- AlterTable
ALTER TABLE "Delivery" DROP COLUMN "proofImage",
ADD COLUMN     "assigned_at" TIMESTAMP(3),
ADD COLUMN     "cancelled_reason" TEXT,
ADD COLUMN     "current_latitude" DOUBLE PRECISION,
ADD COLUMN     "current_longitude" DOUBLE PRECISION,
ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "dispatcher_id" TEXT,
ADD COLUMN     "eta_minutes" INTEGER,
ADD COLUMN     "loading_started_at" TIMESTAMP(3),
ADD COLUMN     "proof_image_url" TEXT,
ADD COLUMN     "route_distance" DOUBLE PRECISION,
ADD COLUMN     "transit_started_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Permission" DROP COLUMN "name",
ADD COLUMN     "key" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_pkey",
DROP COLUMN "permissionId",
DROP COLUMN "roleId",
ADD COLUMN     "permission_id" TEXT NOT NULL,
ADD COLUMN     "role_id" TEXT NOT NULL,
ADD CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("role_id", "permission_id");

-- AlterTable
ALTER TABLE "User" DROP COLUMN "createdAt",
DROP COLUMN "password",
DROP COLUMN "roleId",
ADD COLUMN     "active_status" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "last_login" TIMESTAMP(3),
ADD COLUMN     "password_hash" TEXT NOT NULL,
ADD COLUMN     "role_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_dispatcher_id_fkey" FOREIGN KEY ("dispatcher_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
