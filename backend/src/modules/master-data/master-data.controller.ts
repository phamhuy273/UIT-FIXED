import { Controller, Get } from '@nestjs/common';
import { MasterDataService } from './master-data.service.js';

@Controller('master-data')
export class MasterDataController {
  constructor(private readonly masterData: MasterDataService) {}

  @Get('locations')
  getLocations() {
    return this.masterData.getLocations();
  }

  @Get('categories')
  getCategories() {
    return this.masterData.getCategories();
  }
}
