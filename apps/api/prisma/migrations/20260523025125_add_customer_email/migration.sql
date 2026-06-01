-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "assistant_cost" DOUBLE PRECISION,
ADD COLUMN     "delivery_margin_percentage" DOUBLE PRECISION,
ADD COLUMN     "driver_cost" DOUBLE PRECISION,
ADD COLUMN     "estimated_driving_time_minutes" INTEGER,
ADD COLUMN     "estimated_profit" DOUBLE PRECISION,
ADD COLUMN     "expected_fuel_cost" DOUBLE PRECISION,
ADD COLUMN     "expected_fuel_liters" DOUBLE PRECISION,
ADD COLUMN     "maintenance_cost" DOUBLE PRECISION,
ADD COLUMN     "toll_cost" DOUBLE PRECISION,
ADD COLUMN     "total_km" DOUBLE PRECISION,
ADD COLUMN     "traffic_delay_minutes" INTEGER;

-- CreateTable
CREATE TABLE "FuelLog" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "fillDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "litersFilled" DOUBLE PRECISION NOT NULL,
    "costPerLiter" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "odometer" DOUBLE PRECISION NOT NULL,
    "stationName" TEXT,
    "receiptPhotoUrl" TEXT,
    "odometerPhotoUrl" TEXT,
    "detectedAnomaly" BOOLEAN NOT NULL DEFAULT false,
    "anomalyReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "FuelLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceLog" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cost" DOUBLE PRECISION NOT NULL,
    "odometer" DOUBLE PRECISION NOT NULL,
    "providerName" TEXT,
    "notes" TEXT,
    "nextDueDate" TIMESTAMP(3),
    "nextDueOdometer" DOUBLE PRECISION,
    "alertGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadingVerification" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "verifiedByUserId" TEXT NOT NULL,
    "materialCount" INTEGER NOT NULL,
    "invoiceMapped" BOOLEAN NOT NULL DEFAULT true,
    "packageQuantity" INTEGER NOT NULL,
    "truckCapacityOk" BOOLEAN NOT NULL DEFAULT true,
    "emptyTruckPhotoUrl" TEXT,
    "materialsLoadedPhotoUrl" TEXT,
    "sealedCargoPhotoUrl" TEXT,
    "invoiceVerificationPhotoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'VERIFIED',
    "sealedAt" TIMESTAMP(3),
    "driverAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "LoadingVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalDeliveriesToday" INTEGER NOT NULL,
    "trucksOnRoute" INTEGER NOT NULL,
    "delayedDeliveries" INTEGER NOT NULL,
    "activeDrivers" INTEGER NOT NULL,
    "loadingInProgress" INTEGER NOT NULL,
    "revenueToday" DOUBLE PRECISION NOT NULL,
    "fuelCostToday" DOUBLE PRECISION NOT NULL,
    "maintenanceAlertsCount" INTEGER NOT NULL,
    "completedDeliveries" INTEGER NOT NULL,
    "failedDeliveries" INTEGER NOT NULL,
    "deliverySuccessRate" DOUBLE PRECISION NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoadingVerification_deliveryId_key" ON "LoadingVerification"("deliveryId");

-- AddForeignKey
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadingVerification" ADD CONSTRAINT "LoadingVerification_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadingVerification" ADD CONSTRAINT "LoadingVerification_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
