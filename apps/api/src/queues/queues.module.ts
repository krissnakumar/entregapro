import { DynamicModule, Global, Logger, Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";

export const QUEUE_FEATURES_ENABLED = "QUEUE_FEATURES_ENABLED";

@Global()
@Module({})
export class QueuesModule {
  static register(): DynamicModule {
    const logger = new Logger(QueuesModule.name);
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;
    const redisPort = process.env.REDIS_PORT;
    const queueFeaturesEnabled = Boolean(
      redisUrl || (redisHost && redisPort),
    );

    if (!queueFeaturesEnabled) {
      logger.warn(
        "Redis is not configured. Queue-backed features will run in degraded mode.",
      );

      return {
        module: QueuesModule,
        providers: [
          {
            provide: QUEUE_FEATURES_ENABLED,
            useValue: false,
          },
        ],
        exports: [QUEUE_FEATURES_ENABLED],
      };
    }

    const connection = redisUrl
      ? { url: redisUrl }
      : {
          host: redisHost!,
          port: Number.parseInt(redisPort!, 10),
        };

    return {
      module: QueuesModule,
      imports: [
        BullModule.forRoot({
          connection,
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
      providers: [
        {
          provide: QUEUE_FEATURES_ENABLED,
          useValue: true,
        },
      ],
      exports: [BullModule, QUEUE_FEATURES_ENABLED],
    };
  }
}
