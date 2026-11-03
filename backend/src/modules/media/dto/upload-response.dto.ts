export class UploadResponseDto {
  id: string;
  publicId: string;
  url: string;
  format?: string;
  bytes?: number;
  createdAt: Date;
}
