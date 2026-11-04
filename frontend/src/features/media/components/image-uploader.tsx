import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { readErrorMessage } from '@/features/auth/lib/api-error';
import { uploadMediaApi, type UploadMediaResponse } from '../api/upload-media.api';

interface ImageUploaderProps {
  onSuccess?: (result: UploadMediaResponse) => void;
  folder?: string;
  disabled?: boolean;
  onLoadingChange?: (loading: boolean) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onSuccess, disabled = false, onLoadingChange }) => {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || disabled || loading) return;

    // Validate size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Dung lượng ảnh không được vượt quá 5MB.');
      e.target.value = '';
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.');
      e.target.value = '';
      return;
    }

    // Local preview
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setLoading(true);
    onLoadingChange?.(true);

    try {
      const response = await uploadMediaApi(file);
      setLoading(false);
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (err: unknown) {
      setError(readErrorMessage(err, 'Upload ảnh thất bại.'));
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="image-uploader" aria-busy={loading}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp"
        disabled={disabled || loading}
        hidden
      />
      {previewUrl ? (
        <div className="image-uploader-preview">
          <img src={previewUrl} alt="Preview" />
        </div>
      ) : <span className="image-uploader-icon" aria-hidden="true">↑</span>}
      <Button type="button" variant="secondary" disabled={loading || disabled}
        onClick={() => fileInputRef.current?.click()}>
        {loading ? 'Đang tải lên Cloudinary...' : 'Chọn hình ảnh'}
      </Button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
};
