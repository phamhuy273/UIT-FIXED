import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { MasterDataService } from './master-data.service.js';

@Controller('admin/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminCategoriesController {
  constructor(private readonly masterData: MasterDataService) {}

  @Get() list() { return this.masterData.listCategoriesForAdmin(); }
  @Get(':id') detail(@Param('id', ParseIntPipe) id: number) { return this.masterData.getCategoryForAdmin(id); }
  @Post() create(@Body() dto: CreateCategoryDto) { return this.masterData.createCategory(dto); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.masterData.updateCategory(id, dto);
  }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.masterData.deleteCategory(id); }
}
