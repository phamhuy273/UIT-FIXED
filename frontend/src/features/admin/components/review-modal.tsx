import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useCategories } from '@/features/master-data';
import { readErrorMessage } from '@/features/auth/lib/api-error';
import { urgencyLabels, type IncidentReport, type Urgency } from '@/features/incident-reports/types/incident-report.types';
import { reviewReport } from '../api/admin-review.api';
import type { ReviewInput } from '../types/admin.types';

export function ReviewModal({
  report,
  onClose,
  onApproved,
  initialRejectReason,
}: {
  report: IncidentReport;
  onClose: () => void;
  onApproved?: (approvedReport: IncidentReport) => void;
  initialRejectReason?: string;
}) {
  const categories = useCategories();
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState(report.categoryId);
  const [urgency, setUrgency] = useState<Urgency | ''>(report.urgency ?? '');
  const [rejecting, setRejecting] = useState(Boolean(initialRejectReason));
  const [reason, setReason] = useState(initialRejectReason ?? '');
  const [zoomed, setZoomed] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: (input: ReviewInput) => reviewReport(report.id, input),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['reports'], refetchType: 'all' });
      await queryClient.invalidateQueries({ queryKey: ['incidents'], refetchType: 'all' });
      if (variables.action === 'APPROVE' && onApproved) {
        onApproved(data);
      } else {
        onClose();
      }
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const validCategory = categories.data?.some((item) => item.id === categoryId);

  return (
    <Modal
      open
      onClose={() => {
        if (!mutation.isPending) onClose();
      }}
      closeOnBackdrop={!mutation.isPending}
      title={`Duyệt báo cáo ${report.code}`}
      description={report.title}
      footer={
        rejecting ? (
          <>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={mutation.isPending}
              onClick={() => setRejecting(false)}
            >
              Quay lại
            </button>
            <button
              type="button"
              className="btn btn--danger"
              disabled={mutation.isPending || reason.trim().length < 3}
              onClick={() => mutation.mutate({ action: 'REJECT', reason: reason.trim() })}
            >
              {mutation.isPending ? 'Đang từ chối...' : 'Xác nhận từ chối'}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={mutation.isPending}
              onClick={() => setRejecting(true)}
            >
              Từ chối
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={mutation.isPending || !urgency || !validCategory || categories.isError}
              onClick={() => {
                if (urgency) mutation.mutate({ action: 'APPROVE', categoryId, urgency });
              }}
            >
              {mutation.isPending ? 'Đang phê duyệt...' : 'Phê duyệt & Phân công KTV'}
            </button>
          </>
        )
      }
    >
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Badge kind="status" value={report.status} />
          <span>{report.confirmationCount ?? 0} sinh viên xác nhận cùng gặp sự cố</span>
          {report.urgency && <Badge kind="urgency" value={report.urgency} />}
        </div>

        <p className="text-small text-muted" style={{ margin: 0 }}>
          {report.building.name} · {report.location.floor?.name ?? 'Khu vực chung'} · {report.location.name}
        </p>

        <div className="review-reporter">
          <div style={{ fontWeight: 500, color: 'var(--text)' }}>
            {report.student.fullName ?? 'Sinh viên'}
          </div>
          <div className="text-small text-muted">{report.student.email}</div>
        </div>

        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--text)' }}>
          {report.description}
        </p>

        {report.media.length > 0 ? (
          <div className="review-photos">
            {report.media.map((image) => (
              <button
                type="button"
                key={image.id}
                style={{ border: 0, padding: 0, background: 'transparent' }}
                onClick={() => setZoomed((current) => (current === image.id ? null : image.id))}
                aria-label="Phóng to hoặc thu nhỏ ảnh hiện trường"
                aria-expanded={zoomed === image.id}
              >
                <img
                  className={zoomed === image.id ? 'is-zoomed' : ''}
                  src={image.url}
                  alt="Ảnh hiện trường"
                  style={
                    zoomed === image.id
                      ? { width: '100%', height: 'auto', maxHeight: 360, borderRadius: 'var(--radius-md)' }
                      : undefined
                  }
                />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-small text-muted" style={{ margin: 0 }}>
            Báo cáo không đính kèm ảnh.
          </p>
        )}

        {rejecting ? (
          <div className="field" style={{ marginTop: 8 }}>
            <label htmlFor="review-reason" className="field__label">
              Lý do từ chối <span className="req">*</span>
            </label>
            <textarea
              id="review-reason"
              className="textarea"
              rows={3}
              value={reason}
              required
              maxLength={1000}
              disabled={mutation.isPending}
              placeholder="Nhập lý do từ chối để sinh viên nắm được thông tin..."
              onChange={(event) => setReason(event.target.value)}
            />
            <span className="field__hint">Lý do sẽ được gửi cho sinh viên và lưu trong lịch sử phản ánh.</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14, marginTop: 8 }}>
            <div className="field">
              <label htmlFor="review-category" className="field__label">
                Danh mục xác nhận
              </label>
              <select
                id="review-category"
                className="select"
                value={categoryId}
                disabled={mutation.isPending || categories.isPending || categories.isError}
                onChange={(event) => setCategoryId(Number(event.target.value))}
              >
                {!validCategory && (
                  <option value={report.categoryId}>{report.category.name} (không còn hoạt động)</option>
                )}
                {categories.data?.map((category) => (
                  <option value={category.id} key={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {categories.isError && (
                <p className="field__error" role="alert">
                  Không tải được danh mục.{' '}
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      void categories.refetch();
                    }}
                  >
                    Thử lại
                  </button>
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="review-urgency" className="field__label">
                Độ khẩn cấp xác nhận <span className="req">*</span>
              </label>
              <select
                id="review-urgency"
                className="select"
                value={urgency}
                disabled={mutation.isPending}
                onChange={(event) => setUrgency(event.target.value as Urgency | '')}
              >
                <option value="">Chọn độ khẩn cấp</option>
                {Object.entries(urgencyLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-small text-muted" style={{ margin: 0 }}>
              Phê duyệt sẽ tạo sự cố ở trạng thái chờ phân công cho phòng ban phụ trách.
            </p>
          </div>
        )}

        {mutation.isError && (
          <p
            role="alert"
            style={{
              margin: 0,
              padding: '10px 12px',
              background: 'var(--danger-bg)',
              color: 'var(--danger-text)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
            }}
          >
            {readErrorMessage(mutation.error, 'Không thể xử lý báo cáo.')}
          </p>
        )}
      </div>
    </Modal>
  );
}
