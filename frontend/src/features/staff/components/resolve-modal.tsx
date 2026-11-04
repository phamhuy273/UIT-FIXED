import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { readErrorMessage } from '@/features/auth/lib/api-error';
import { ImageUploader } from '@/features/media/components/image-uploader';
import type { UploadMediaResponse } from '@/features/media/api/upload-media.api';
import { resolveStaffTask } from '../api/staff.api';

interface ResolveModalProps {
  incidentId: number;
  incidentCode: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ResolveModal({
  incidentId,
  incidentCode,
  onClose,
  onSuccess,
}: ResolveModalProps) {
  const queryClient = useQueryClient();
  const [resolutionNote, setResolutionNote] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<{ id: number; url: string }[]>([]);

  const mutation = useMutation({
    mutationFn: () =>
      resolveStaffTask(incidentId, {
        resolutionNote: resolutionNote.trim(),
        mediaIds: uploadedPhotos.map((p) => p.id),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
      onSuccess?.();
      onClose();
    },
  });

  const handleUploadSuccess = (media: UploadMediaResponse) => {
    setUploadedPhotos((prev) => [...prev, { id: media.id, url: media.url }]);
  };

  const removePhoto = (id: number) => {
    setUploadedPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <Modal
      open
      onClose={() => {
        if (!mutation.isPending) onClose();
      }}
      closeOnBackdrop={!mutation.isPending}
      title={`Nghiệm thu hoàn tất ${incidentCode}`}
      description="Xác nhận sự cố đã được sửa chữa triệt để và an toàn tại phòng học."
      footer={
        <>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="button"
            className="btn btn--primary"
            style={{ background: '#16A34A', borderColor: '#16A34A' }}
            disabled={mutation.isPending || resolutionNote.trim().length < 5}
            onClick={() => mutation.mutate()}
          >
            <CheckCircle size={16} style={{ marginRight: 6 }} />
            {mutation.isPending ? 'Đang hoàn tất...' : 'Xác nhận hoàn thành'}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 16 }}>
        {/* Note textarea */}
        <div style={{ display: 'grid', gap: 6 }}>
          <label htmlFor="resolve-note" style={{ fontSize: 13, fontWeight: 600 }}>
            Biên bản / Ghi chú khắc phục sự cố <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <textarea
            id="resolve-note"
            className="input"
            rows={4}
            placeholder="Ví dụ: Đã thay thế bóng đèn led 1m2 mới tại vị trí dãy bàn thứ 2. Đã bật thử công tắc, đèn sáng ổn định và không còn hiện tượng chập chờn..."
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
          />
          <span className="text-small text-muted">
            Tối thiểu 5 ký tự. Nội dung này sẽ được lưu vào lịch sử nghiệm thu của sự cố.
          </span>
        </div>

        {/* Upload proof photos */}
        <div style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            Ảnh chụp sau khi sửa xong (Minh chứng hoàn tất)
          </span>

          {uploadedPhotos.length < 3 && (
            <ImageUploader onSuccess={handleUploadSuccess} disabled={mutation.isPending} />
          )}

          {uploadedPhotos.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
              {uploadedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  style={{
                    position: 'relative',
                    width: 90,
                    height: 90,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '1.5px solid #CBD5E1',
                  }}
                >
                  <img
                    src={photo.url}
                    alt="Ảnh nghiệm thu"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)',
                      color: '#ffffff',
                      border: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {mutation.isError && (
          <div
            style={{
              padding: 10,
              background: '#FEE2E2',
              color: '#B91C1C',
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            {readErrorMessage(mutation.error, 'Hoàn tất sự cố thất bại. Vui lòng thử lại.')}
          </div>
        )}
      </div>
    </Modal>
  );
}
