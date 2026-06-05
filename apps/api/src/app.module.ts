import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ActivityLoggerInterceptor } from "./prisma/activity-logger.interceptor";
import { DispatchModule } from "./dispatch/dispatch.module";
import { TrackingModule } from "./tracking/tracking.module";
import { CustomersModule } from "./customers/customers.module";
import { DeliveriesModule } from "./deliveries/deliveries.module";
import { DriversModule } from "./drivers/drivers.module";
import { VehiclesModule } from "./vehicles/vehicles.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { ReportsModule } from "./reports/reports.module";
import { MapsModule } from "./maps/maps.module";
import { RolesModule } from "./roles/roles.module";
import { PermissionsModule } from "./permissions/permissions.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { QueuesModule } from "./queues/queues.module";
import { PodModule } from "./pod/pod.module";
import { SettingsModule } from "./settings/settings.module";
import { FleetModule } from "./fleet/fleet.module";
import { OrdersModule } from "./orders/orders.module";
import { OrganizationModule } from "./organizations/organization.module";
import { TenantGuard } from "./organizations/guards/tenant.guard";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { PlanModule } from "./plans/plan.module";
import { SubscriptionModule } from "./subscriptions/subscription.module";
import { JobSitesModule } from "./job-sites/job-sites.module";
import { RoutesModule } from "./routes/routes.module";
import { TrackingPublicModule } from "./tracking-public/tracking-public.module";
import { DeliveryEventsModule } from "./delivery-events/delivery-events.module";
import { VoiceNotesModule } from "./voice-notes/voice-notes.module";
import { DeliveryInstructionsModule } from "./delivery-instructions/delivery-instructions.module";
import { AvailabilityModule } from "./availability/availability.module";
import { ProofOfDeliveryModule } from "./proof-of-delivery/proof-of-delivery.module";
import { WorkloadModule } from "./workload/workload.module";
import { ClusteringModule } from "./clustering/clustering.module";
import { AssignmentModule } from "./assignment/assignment.module";
import { DeliveryTimelineModule } from "./delivery-timeline/delivery-timeline.module";
import { LoadBatchModule } from "./load-batch/load-batch.module";
import { FuelRequestModule } from "./fuel-requests/fuel-requests.module";
import { RouteOptimizationModule } from "./route-optimization/route-optimization.module";
import { ProductsModule } from "./products/products.module";

@Module({
  imports: [
    QueuesModule.register(),
    PodModule,
    CacheModule.register({
      isGlobal: true,
      ttl: 60,
      max: 100,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuthModule,
    UsersModule,
    OrganizationModule,
    PlanModule,
    SubscriptionModule,
    PermissionsModule,
    RolesModule,
    PrismaModule,
    DeliveriesModule,
    DispatchModule,
    TrackingModule,
    CustomersModule,
    DriversModule,
    VehiclesModule,
    NotificationsModule,
    AnalyticsModule,
    ReportsModule,
    MapsModule,
    InvoicesModule,
    SettingsModule,
    FleetModule,
    OrdersModule,
    JobSitesModule,
    RoutesModule,
    TrackingPublicModule,
    DeliveryEventsModule,
    VoiceNotesModule,
    DeliveryInstructionsModule,
    AvailabilityModule,
    ProofOfDeliveryModule,
    WorkloadModule,
    ClusteringModule,
    AssignmentModule,
    DeliveryTimelineModule,
    LoadBatchModule,
    FuelRequestModule,
    RouteOptimizationModule,
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityLoggerInterceptor,
    },
  ],
})
export class AppModule {}
