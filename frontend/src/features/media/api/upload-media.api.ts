import { apiClient } from '@/lib/axios';

export interface UploadMediaResponse {
  url: string;
  publicId: string;
  format: string;
  width: number;
  height: number;
}

export const uploadMediaApi = async (file: File): Promise<UploadMediaResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<any, { data: UploadMediaResponse }>('/media/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};
