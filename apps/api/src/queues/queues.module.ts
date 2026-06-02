import { Module, Global } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: process.env.REDIS_HOST || "localhost",
          port: parseInt(process.env.REDIS_PORT!) || 6379,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: "invoice-processing" },
      { name: "location-tracking" },
      { name: "whatsapp-events" },
      { name: "notifications" },
      { name: "report-generation" },
      { name: "cleanup-jobs" },
    ),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
