-- AlterTable
ALTER TABLE "DeliveryStatusLog" ADD COLUMN     "changed_by" TEXT;

-- AlterTable
ALTER TABLE "DeliveryTracking" ADD COLUMN     "batteryLevel" DOUBLE PRECISION,
ADD COLUMN     "heading" DOUBLE PRECISION,
ADD COLUMN     "speed" DOUBLE PRECISION;

-- AddForeignKey
ALTER TABLE "DeliveryStatusLog" ADD CONSTRAINT "DeliveryStatusLog_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
