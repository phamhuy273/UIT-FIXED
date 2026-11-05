import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../core/database/database.module.js';
import { AdminCategoriesController } from './admin-categories.controller.js';
import { MasterDataController } from './master-data.controller.js';
import { MasterDataService } from './master-data.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [MasterDataController, AdminCategoriesController],
  providers: [MasterDataService],
  exports: [MasterDataService],
})
export class MasterDataModule {}
