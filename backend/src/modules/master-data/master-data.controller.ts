import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { MasterDataService } from './master-data.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

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

  @Get('departments')
  getDepartments() {
    return this.masterData.getDepartments();
  }

  @Get('departments/:id/staff')
  @UseGuards(JwtAuthGuard)
  getDepartmentStaff(@Param('id', ParseIntPipe) id: number) {
    return this.masterData.getDepartmentStaff(id);
  }
}
