import { Module } from "@nestjs/common";
import { DispatchService } from "./dispatch.service";
import { DispatchController } from "./dispatch.controller";
import { SimulationModule } from "./simulation/simulation.module";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule, SimulationModule],
  controllers: [DispatchController],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
