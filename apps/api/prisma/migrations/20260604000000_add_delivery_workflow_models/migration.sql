-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('CREATED', 'PENDING_DISPATCH', 'ASSIGNED', 'DRIVER_NOTIFIED', 'ACCEPTED_BY_DRIVER', 'LOADING_STARTED', 'LOADED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'PARTIALLY_DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LoadingStatus" AS ENUM ('NOT_LOADED', 'LOADING', 'LOADED', 'LOAD_ISSUE');

-- CreateEnum
CREATE TYPE "FuelRequestStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryEventType" AS ENUM ('STATUS_CHANGE', 'LOADING', 'PROBLEM', 'NOTE', 'FUEL', 'POD');

-- AlterTable: Delivery
ALTER TABLE "Delivery" ADD COLUMN "createdByAdminId" TEXT;
ALTER TABLE "Delivery" ADD COLUMN "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'CREATED';
ALTER TABLE "Delivery" ADD COLUMN "loadingStatus" "LoadingStatus" NOT NULL DEFAULT 'NOT_LOADED';
ALTER TABLE "Delivery" ADD COLUMN "deliveryStartedAt" TIMESTAMP(3);
ALTER TABLE "Delivery" ADD COLUMN "deliveredAt" TIMESTAMP(3);
ALTER TABLE "Delivery" ADD COLUMN "failedAt" TIMESTAMP(3);
ALTER TABLE "Delivery" ADD COLUMN "failureReason" TEXT;

-- CreateIndex
CREATE INDEX "Delivery_deliveryStatus_idx" ON "Delivery"("deliveryStatus");
CREATE INDEX "Delivery_organizationId_deliveryStatus_idx" ON "Delivery"("organizationId", "deliveryStatus");

-- AlterTable: Notification
ALTER TABLE "Notification" ADD COLUMN "type" TEXT;
ALTER TABLE "Notification" ADD COLUMN "recipientRole" TEXT;
ALTER TABLE "Notification" ADD COLUMN "payload" JSONB;

-- CreateIndex
CREATE INDEX "Notification_userId_type_idx" ON "Notification"("userId", "type");

-- CreateTable: DeliveryItem
CREATE TABLE "DeliveryItem" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "volume" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "DeliveryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryItem_deliveryId_idx" ON "DeliveryItem"("deliveryId");
CREATE INDEX "DeliveryItem_organizationId_idx" ON "DeliveryItem"("organizationId");

-- CreateTable: LoadBatch
CREATE TABLE "LoadBatch" (
    "id" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "driverId" TEXT,
    "vehicleId" TEXT,
    "dispatcherId" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'CREATED',
    "totalWeight" DOUBLE PRECISION,
    "totalVolume" DOUBLE PRECISION,
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "routeDistanceKm" DOUBLE PRECISION,
    "estimatedDurationMinutes" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LoadBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoadBatch_batchCode_key" ON "LoadBatch"("batchCode");
CREATE INDEX "LoadBatch_organizationId_idx" ON "LoadBatch"("organizationId");
CREATE INDEX "LoadBatch_driverId_idx" ON "LoadBatch"("driverId");
CREATE INDEX "LoadBatch_status_idx" ON "LoadBatch"("status");
CREATE INDEX "LoadBatch_organizationId_status_idx" ON "LoadBatch"("organizationId", "status");

-- CreateTable: LoadBatchDelivery
CREATE TABLE "LoadBatchDelivery" (
    "id" TEXT NOT NULL,
    "loadBatchId" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "stopOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoadBatchDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoadBatchDelivery_loadBatchId_deliveryId_key" ON "LoadBatchDelivery"("loadBatchId", "deliveryId");
CREATE INDEX "LoadBatchDelivery_loadBatchId_idx" ON "LoadBatchDelivery"("loadBatchId");
CREATE INDEX "LoadBatchDelivery_deliveryId_idx" ON "LoadBatchDelivery"("deliveryId");

-- CreateTable: DeliveryTimeline
CREATE TABLE "DeliveryTimeline" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "eventType" "DeliveryEventType" NOT NULL DEFAULT 'STATUS_CHANGE',
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "note" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "photoUrl" TEXT,
    "signatureUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "DeliveryTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryTimeline_deliveryId_createdAt_idx" ON "DeliveryTimeline"("deliveryId", "createdAt");
CREATE INDEX "DeliveryTimeline_organizationId_idx" ON "DeliveryTimeline"("organizationId");
CREATE INDEX "DeliveryTimeline_eventType_idx" ON "DeliveryTimeline"("eventType");

-- CreateTable: FuelRequest
CREATE TABLE "FuelRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "dispatcherId" TEXT,
    "vehicleId" TEXT NOT NULL,
    "loadBatchId" TEXT,
    "amountRequested" DOUBLE PRECISION,
    "fuelLiters" DOUBLE PRECISION,
    "fuelStation" TEXT,
    "reason" TEXT,
    "status" "FuelRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "approvedByDispatcherId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "receiptPhotoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FuelRequest_organizationId_idx" ON "FuelRequest"("organizationId");
CREATE INDEX "FuelRequest_driverId_idx" ON "FuelRequest"("driverId");
CREATE INDEX "FuelRequest_status_idx" ON "FuelRequest"("status");
CREATE INDEX "FuelRequest_organizationId_status_idx" ON "FuelRequest"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryItem" ADD CONSTRAINT "DeliveryItem_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryItem" ADD CONSTRAINT "DeliveryItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadBatch" ADD CONSTRAINT "LoadBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LoadBatch" ADD CONSTRAINT "LoadBatch_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoadBatch" ADD CONSTRAINT "LoadBatch_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoadBatch" ADD CONSTRAINT "LoadBatch_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadBatchDelivery" ADD CONSTRAINT "LoadBatchDelivery_loadBatchId_fkey" FOREIGN KEY ("loadBatchId") REFERENCES "LoadBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoadBatchDelivery" ADD CONSTRAINT "LoadBatchDelivery_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTimeline" ADD CONSTRAINT "DeliveryTimeline_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryTimeline" ADD CONSTRAINT "DeliveryTimeline_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelRequest" ADD CONSTRAINT "FuelRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FuelRequest" ADD CONSTRAINT "FuelRequest_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FuelRequest" ADD CONSTRAINT "FuelRequest_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FuelRequest" ADD CONSTRAINT "FuelRequest_loadBatchId_fkey" FOREIGN KEY ("loadBatchId") REFERENCES "LoadBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FuelRequest" ADD CONSTRAINT "FuelRequest_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FuelRequest" ADD CONSTRAINT "FuelRequest_approvedByDispatcherId_fkey" FOREIGN KEY ("approvedByDispatcherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
