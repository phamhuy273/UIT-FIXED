import { Injectable, NotFoundException } from '@nestjs/common';
import { CloudinaryService } from '../../../shared/cloudinary/cloudinary.service.js';
import { PrismaService } from '../../../core/database/prisma.service.js';

@Injectable()
export class MediaService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly prisma: PrismaService,
  ) {}

  async uploadImage(file: Express.Multer.File, userId?: string) {
    // 1. Stream buffer to Cloudinary
    const uploadResult = await this.cloudinaryService.uploadFile(file, 'scrum_media');

    // 2. Persist media metadata in PostgreSQL
    const media = await this.prisma.media.create({
      data: {
        publicId: uploadResult.public_id,
        url: uploadResult.secure_url,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        userId: userId || null,
      },
    });

    return media;
  }

  async deleteImage(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw new NotFoundException('Media not found.');
    }

    // 1. Delete from Cloudinary
    await this.cloudinaryService.deleteFile(media.publicId);

    // 2. Delete record in PostgreSQL
    return this.prisma.media.delete({ where: { id } });
  }

  async getAllMedia(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.media.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.media.count(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
