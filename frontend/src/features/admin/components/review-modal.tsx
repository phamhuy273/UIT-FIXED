import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { useCategories } from '@/features/master-data';
import { readErrorMessage } from '@/features/auth/lib/api-error';
import { urgencyLabels, type IncidentReport, type Urgency } from '@/features/incident-reports/types/incident-report.types';
import { reviewReport } from '../api/admin-review.api';
import type { ReviewInput } from '../types/admin.types';

export function ReviewModal({ report, onClose }: { report: IncidentReport; onClose: () => void }) {
  const categories = useCategories();
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState(report.categoryId);
  const [urgency, setUrgency] = useState<Urgency | ''>(report.urgency ?? '');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [zoomed, setZoomed] = useState<number | null>(null);
  const mutation = useMutation({ mutationFn: (input: ReviewInput) => reviewReport(report.id, input),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['reports'], refetchType: 'all' }); onClose(); },
    onError: () => { void queryClient.invalidateQueries({ queryKey: ['reports'] }); },
  });
  const validCategory = categories.data?.some((item) => item.id === categoryId);
  return <Modal open onClose={() => { if (!mutation.isPending) onClose(); }} closeOnBackdrop={!mutation.isPending}
    title={`Duyệt báo cáo ${report.code}`} description={report.title}
    footer={rejecting ? <><Button variant="outline" disabled={mutation.isPending} onClick={() => setRejecting(false)}>Quay lại</Button><Button variant="danger" loading={mutation.isPending} disabled={reason.trim().length < 3} onClick={() => mutation.mutate({ action: 'REJECT', reason: reason.trim() })}>Xác nhận từ chối</Button></> :
      <><Button variant="outline" disabled={mutation.isPending} onClick={() => setRejecting(true)}>Từ chối</Button><Button loading={mutation.isPending} disabled={!urgency || !validCategory || categories.isError} onClick={() => { if (urgency) mutation.mutate({ action: 'APPROVE', categoryId, urgency }); }}>Phê duyệt</Button></>}>
    <div className="review-meta"><Badge kind="status" value={report.status} />{report.urgency && <Badge kind="urgency" value={report.urgency} />}</div>
    <p className="report-location">{report.building.name} · {report.location.floor?.name ?? 'Khu vực chung'} · {report.location.name}</p>
    <p className="review-reporter"><strong>{report.student.fullName ?? 'Sinh viên'}</strong><br />{report.student.email}</p>
    <p className="report-content">{report.description}</p>
    <div className="review-photos">{report.media.map((image) => <button type="button" key={image.id} onClick={() => setZoomed((current) => current === image.id ? null : image.id)} aria-label="Phóng to hoặc thu nhỏ ảnh hiện trường" aria-expanded={zoomed === image.id}>
      <img className={zoomed === image.id ? 'is-zoomed' : ''} src={image.url} alt="Ảnh hiện trường của sinh viên" /></button>)}</div>
    {report.media.length === 0 && <p className="field-helper">Báo cáo không đính kèm ảnh.</p>}
    {rejecting ? <div className="review-fields"><Input label="Lý do từ chối" value={reason} required maxLength={1000} disabled={mutation.isPending} onChange={(event) => setReason(event.target.value)} helperText="Lý do sẽ được gửi cho sinh viên và lưu trong lịch sử." /></div> :
      <div className="review-fields"><div className="ui-field"><label htmlFor="review-category">Danh mục xác nhận</label><select id="review-category" className="ui-select" value={categoryId} disabled={mutation.isPending || categories.isPending || categories.isError} onChange={(event) => setCategoryId(Number(event.target.value))}>
        {!validCategory && <option value={report.categoryId}>{report.category.name} (không còn hoạt động)</option>}{categories.data?.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
      </select>{categories.isError && <p className="field-error" role="alert">Không tải được danh mục. <Button size="sm" variant="outline" onClick={() => { void categories.refetch(); }}>Thử lại</Button></p>}</div>
      <div className="ui-field"><label htmlFor="review-urgency">Độ khẩn cấp xác nhận *</label><select id="review-urgency" className="ui-select" value={urgency} disabled={mutation.isPending} onChange={(event) => setUrgency(event.target.value as Urgency | '')}><option value="">Chọn độ khẩn cấp</option>{Object.entries(urgencyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <p className="field-helper">Phê duyệt sẽ tạo sự cố ở trạng thái chờ phân công.</p></div>}
    {mutation.isError && <p role="alert" className="error-notice">{readErrorMessage(mutation.error, 'Không thể xử lý báo cáo.')}</p>}
  </Modal>;
}
