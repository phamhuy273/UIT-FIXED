import { Module } from '@nestjs/common';
import { MediaController } from './controllers/media.controller.js';
import { MediaService } from './services/media.service.js';
import { CloudinaryModule } from '../../shared/cloudinary/cloudinary.module.js';

@Module({
  imports: [CloudinaryModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
