import { Module } from "@nestjs/common";
import { VoiceNotesService } from "./voice-notes.service";
import { VoiceNotesController } from "./voice-notes.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [VoiceNotesController],
  providers: [VoiceNotesService],
  exports: [VoiceNotesService],
})
export class VoiceNotesModule {}
