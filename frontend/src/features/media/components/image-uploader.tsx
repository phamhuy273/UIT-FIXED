import React, { useState, useRef } from 'react';
import { uploadMediaApi, type UploadMediaResponse } from '../api/upload-media.api';

interface ImageUploaderProps {
  onSuccess?: (result: UploadMediaResponse) => void;
  folder?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Dung lượng ảnh không được vượt quá 5MB.');
      return;
    }

    // Local preview
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setLoading(true);

    try {
      const response = await uploadMediaApi(file);
      setLoading(false);
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Upload ảnh thất bại.');
    }
  };

  return (
    <div style={{ border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '24px', textAlign: 'center' }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp"
        style={{ display: 'none' }}
      />
      {previewUrl ? (
        <div style={{ marginBottom: '12px' }}>
          <img
            src={previewUrl}
            alt="Preview"
            style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '6px', objectFit: 'cover' }}
          />
        </div>
      ) : null}
      <button
        type="button"
        disabled={loading}
        onClick={() => fileInputRef.current?.click()}
        style={{
          padding: '8px 16px',
          background: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Đang tải lên Cloudinary...' : 'Chọn hình ảnh'}
      </button>
      {error && <p style={{ color: '#ef4444', marginTop: '8px' }}>{error}</p>}
    </div>
  );
};
