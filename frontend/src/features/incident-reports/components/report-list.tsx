import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { readErrorMessage } from '@/features/auth/lib/api-error';
import { cancelReport, getMyReports } from '../api/incident-reports.api';
import type { IncidentReport } from '../types/incident-report.types';
import { ReportPagination } from './report-pagination';

export function ReportList() {
  const userId = useAuthStore((state) => state.user?.id);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<IncidentReport | null>(null);
  const [reason, setReason] = useState('');
  const route = useLocation();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['reports', 'mine', userId, page], queryFn: ({ signal }) => getMyReports(page, signal), refetchInterval: 30_000 });
  const mutation = useMutation({ mutationFn: ({ id, reason }: { id: number; reason: string }) => cancelReport(id, reason),
    onSuccess: async () => { setSelected(null); setReason(''); await queryClient.invalidateQueries({ queryKey: ['reports'] }); },
    onError: () => { void queryClient.invalidateQueries({ queryKey: ['reports'] }); },
  });
  const message = (route.state as { message?: string } | null)?.message;
  return <>
    <PageHeader eyebrow="KHÔNG GIAN CỦA BẠN" title="Báo cáo của tôi" description="Theo dõi phản ánh và kết quả duyệt từ nhà trường."
      action={<Link className="ui-button ui-button--primary ui-button--md" to="/reports/new">+ Báo cáo mới</Link>} />
    {message && <p className="success-notice" role="status">{message}</p>}
    {query.isPending && <p role="status">Đang tải báo cáo…</p>}
    {query.isError && <div className="error-notice" role="alert">Không tải được báo cáo.<Button variant="outline" onClick={() => { void query.refetch(); }}>Thử lại</Button></div>}
    {query.data?.items.length === 0 && <div className="report-empty"><span aria-hidden="true">▤</span><h2>Chưa có báo cáo nào</h2><p>Khi phòng học cần hỗ trợ, hãy gửi phản ánh tại đây.</p><Link className="ui-button ui-button--primary ui-button--md" to="/reports/new">Tạo báo cáo đầu tiên →</Link></div>}
    <div className="report-cards">{query.data?.items.map((report) => <article className="report-panel report-card" key={report.id}>
      <header><span className="report-code">{report.code}</span><Badge kind="status" value={report.status} /></header>
      <h2>{report.title}</h2><p className="report-location">{report.building.name} · {report.location.floor?.name ?? 'Khu vực chung'} · {report.location.name}</p>
      <p className="report-content">{report.description}</p>
      <div className="report-thumbnails">{report.media.map((image) => <a key={image.id} href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt="Ảnh hiện trường báo cáo" /></a>)}</div>
      {report.status === 'REJECTED' && <p className="report-reason"><strong>Lý do từ chối:</strong> {report.histories.findLast((event) => event.action === 'REJECTED')?.reason}</p>}
      {report.status === 'CANCELLED' && <p className="report-reason"><strong>Lý do hủy:</strong> {report.histories.findLast((event) => event.action === 'CANCELLED')?.reason}</p>}
      <footer>{report.incident && <p className="report-progress">Tiến độ xử lý: <Badge kind="status" value={report.incident.status} /></p>}
        <div className="report-card-meta"><span>{report.category.name} · {new Date(report.createdAt).toLocaleString('vi-VN')}</span><div>{report.urgency && <Badge kind="urgency" value={report.urgency} />}{report.status === 'PENDING' && <Button variant="outline" size="sm" onClick={() => { setSelected(report); setReason(''); mutation.reset(); }}>Hủy báo cáo</Button>}</div></div></footer>
    </article>)}</div>
    <ReportPagination page={page} totalPages={query.data?.totalPages ?? 0} onChange={setPage} loading={query.isFetching} />
    <Modal open={Boolean(selected)} onClose={() => { if (!mutation.isPending) setSelected(null); }} closeOnBackdrop={!mutation.isPending}
      title="Hủy báo cáo" description={selected?.code} footer={<><Button variant="outline" disabled={mutation.isPending} onClick={() => setSelected(null)}>Giữ báo cáo</Button><Button variant="danger" loading={mutation.isPending} disabled={reason.trim().length < 3} onClick={() => { if (selected) mutation.mutate({ id: selected.id, reason: reason.trim() }); }}>Xác nhận hủy</Button></>}>
      <p className="field-helper">Chỉ báo cáo đang chờ duyệt mới có thể hủy.</p><Input label="Lý do hủy" required maxLength={1000} value={reason} disabled={mutation.isPending} onChange={(event) => setReason(event.target.value)} />
      {mutation.isError && <p className="field-error" role="alert">{readErrorMessage(mutation.error, 'Không thể hủy báo cáo.')}</p>}
    </Modal>
  </>;
}
