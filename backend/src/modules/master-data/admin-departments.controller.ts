import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { UpdateDepartmentDto } from './dto/update-department.dto.js';
import { MasterDataService } from './master-data.service.js';

@Controller('admin/departments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminDepartmentsController {
  constructor(private readonly masterData: MasterDataService) {}

  @Get() list() { return this.masterData.listDepartmentsForAdmin(); }
  @Get(':id') detail(@Param('id', ParseIntPipe) id: number) { return this.masterData.getDepartmentForAdmin(id); }
  @Post() create(@Body() dto: CreateDepartmentDto) { return this.masterData.createDepartment(dto); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDepartmentDto) {
    return this.masterData.updateDepartment(id, dto);
  }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.masterData.deleteDepartment(id); }
}
