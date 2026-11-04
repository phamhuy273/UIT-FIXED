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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from '../services/media.service.js';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
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
    return this.mediaService.uploadImage(file);
  }

  @Get()
  async getMediaList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.mediaService.getAllMedia(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Delete(':id')
  async deleteMedia(@Param('id') id: string) {
    const mediaId = Number(id);
    if (!Number.isInteger(mediaId) || mediaId < 1) {
      throw new NotFoundException('Media not found.');
    }
    return this.mediaService.deleteImage(mediaId);
  }
}
