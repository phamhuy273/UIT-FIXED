import {
  Controller,
  Post,
  Get,
  Delete,
  NotFoundException,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from '../services/media.service.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { ReportQueryDto } from '../../incident-reports/dto/report-query.dto.js';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadFile(
    @CurrentUser('id') userId: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB limit
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.mediaService.uploadImage(file, userId);
  }

  @Get()
  async getMediaList(
    @CurrentUser('id') userId: number,
    @Query() query: ReportQueryDto,
  ) {
    return this.mediaService.getAllMedia(
      query.page, query.limit, userId,
    );
  }

  @Delete(':id')
  async deleteMedia(@CurrentUser('id') userId: number, @Param('id') id: string) {
    const mediaId = Number(id);
    if (!Number.isInteger(mediaId) || mediaId < 1) {
      throw new NotFoundException('Media not found.');
    }
    return this.mediaService.deleteImage(mediaId, userId);
  }
}
