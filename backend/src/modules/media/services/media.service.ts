import { Injectable, NotFoundException } from '@nestjs/common';
import { CloudinaryService } from '../../../shared/cloudinary/cloudinary.service.js';
import { PrismaService } from '../../../core/database/prisma.service.js';

@Injectable()
export class MediaService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly prisma: PrismaService,
  ) {}

  async uploadImage(file: Express.Multer.File, userId: number) {
    // 1. Stream buffer to Cloudinary
    const uploadResult = await this.cloudinaryService.uploadFile(file, 'scrum_media');

    // 2. Persist media metadata in PostgreSQL
    const media = await this.prisma.media.create({
      data: {
        publicId: uploadResult.public_id,
        url: uploadResult.secure_url,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        userId: userId ?? null,
      },
    });

    return media;
  }

  async deleteImage(id: number, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      // Serialize deletion against an intake transaction claiming the same upload.
      await tx.$queryRaw`SELECT id FROM media WHERE id = ${id} FOR UPDATE`;
      const media = await tx.media.findFirst({ where: { id, userId, reportId: null, resolutionId: null } });
      if (!media) throw new NotFoundException('Media not found.');
      await this.cloudinaryService.deleteFile(media.publicId);
      return tx.media.delete({ where: { id } });
    }, { timeout: 15_000 });
  }

  async getAllMedia(page: number, limit: number, userId: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.media.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.media.count({ where: { userId } }),
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
