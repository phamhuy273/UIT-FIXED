import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './core/database/database.module.js';
import { MediaModule } from './modules/media/media.module.js';
import cloudinaryConfig from './config/cloudinary.config.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [cloudinaryConfig],
    }),
    DatabaseModule,
    MediaModule,
  ],
})
export class AppModule {}
