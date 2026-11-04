import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './core/database/database.module.js';
import cloudinaryConfig from './config/cloudinary.config.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { MasterDataModule } from './modules/master-data/master-data.module.js';
import { IncidentReportsModule } from './modules/incident-reports/incident-reports.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [cloudinaryConfig],
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    MediaModule,
    MasterDataModule,
    IncidentReportsModule,
  ],
})
export class AppModule {}
