import { Module } from '@nestjs/common';
import { RouteOptimizationService } from './route-optimization.service';
import { RouteOptimizationController } from './route-optimization.controller';

@Module({
  providers: [RouteOptimizationService],
  controllers: [RouteOptimizationController],
  exports: [RouteOptimizationService],
})
export class RouteOptimizationModule {}
