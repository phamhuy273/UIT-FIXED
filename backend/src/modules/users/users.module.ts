import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AdminStaffController } from './admin-staff.controller.js';
import { AdminStaffService } from './admin-staff.service.js';
import { AdminStudentsController } from './admin-students.controller.js';
import { AdminStudentsService } from './admin-students.service.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [AuthModule],
  controllers: [UsersController, AdminStudentsController, AdminStaffController],
  providers: [UsersService, AdminStudentsService, AdminStaffService],
  exports: [UsersService],
})
export class UsersModule {}
