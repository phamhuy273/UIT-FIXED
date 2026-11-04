import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/modal';
import { readErrorMessage } from '@/features/auth/lib/api-error';
import { addStaffProgressNote } from '../api/staff.api';

interface ProgressNoteModalProps {
  incidentId: number;
  incidentCode: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ProgressNoteModal({
  incidentId,
  incidentCode,
  onClose,
  onSuccess,
}: ProgressNoteModalProps) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');

  const mutation = useMutation({
    mutationFn: () => addStaffProgressNote(incidentId, content.trim()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
      onSuccess?.();
      onClose();
    },
  });

  return (
    <Modal
      open
      onClose={() => {
        if (!mutation.isPending) onClose();
      }}
      closeOnBackdrop={!mutation.isPending}
      title={`Cập nhật tiến độ: ${incidentCode}`}
      description="Ghi nhận nhật ký xử lý thực tế tại hiện trường."
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
            disabled={mutation.isPending || content.trim().length < 2}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Đang lưu...' : 'Lưu ghi chú'}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <label htmlFor="progress-content" style={{ fontSize: 13, fontWeight: 600 }}>
          Nội dung tiến độ hiện trường <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <textarea
          id="progress-content"
          className="input"
          rows={4}
          placeholder="Ví dụ: Đã đến phòng kiểm tra, quạt bị cháy tụ. Đang đi kho lấy linh kiện mới để thay thế..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
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
            {readErrorMessage(mutation.error, 'Lưu ghi chú thất bại. Vui lòng thử lại.')}
          </div>
        )}
      </div>
    </Modal>
  );
}
