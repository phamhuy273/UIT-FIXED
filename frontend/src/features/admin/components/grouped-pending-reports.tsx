import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import type { IncidentReport } from '@/features/incident-reports/types/incident-report.types';
import { ReportPagination } from '@/features/incident-reports/components/report-pagination';
import { formatCampusPeriod } from '@/features/incident-reports/utils/observation-period';
import { getPendingGroups, type PendingGroup } from '../api/duplicate-groups.api';
import '../duplicate-groups.css';

type OnReview = (report: IncidentReport, rejectReason?: string) => void;

export function GroupedPendingReports({ buildingId, floorId, onReview, onShowAll }: {
  buildingId?: number; floorId?: number; onReview: OnReview; onShowAll: () => void;
}) {
  const [page, setPage] = useState(1);
  const userId = useAuthStore((state) => state.user?.id);
  const query = useQuery({ queryKey: ['reports', 'pending-groups', userId, buildingId, floorId, page],
    queryFn: ({ signal }) => getPendingGroups(page, buildingId, floorId, signal), refetchInterval: 30_000,
  });
  return <section className="admin-duplicate-groups" aria-label="Nhóm báo cáo có thể trùng lặp">
    <p>Chỉ hiển thị nhóm có từ 2 báo cáo tương tự. Bạn vẫn duyệt hoặc từ chối từng báo cáo.</p>
    {query.isPending && <p role="status">Đang kiểm tra và gom báo cáo tương tự…</p>}
    {query.isError && <div role="alert"><p>Không tải được nhóm báo cáo.</p><Button variant="outline" onClick={() => { void query.refetch(); }}>Thử lại</Button> <Button variant="ghost" onClick={onShowAll}>Xem danh sách thường</Button></div>}
    {query.data && <>
      <p role="status">{query.data.total} nhóm báo cáo tương tự · {query.data.totalReports} báo cáo chờ duyệt trong phạm vi đang xem</p>
      {query.data.availability === 'unavailable' && <div role="status">
        <p>AI đang bận hoặc chưa sẵn sàng. Mở danh sách thường để xem và xử lý các báo cáo.</p>
        <Button variant="ghost" onClick={onShowAll}>Xem danh sách thường</Button>
      </div>}
      {query.data.consideredReports < query.data.totalReports && <div role="status">
        <p>Đang gom {query.data.consideredReports}/{query.data.totalReports} báo cáo ưu tiên đầu tiên. Mở danh sách thường để xem toàn bộ.</p>
        <Button variant="ghost" onClick={onShowAll}>Xem toàn bộ báo cáo</Button>
      </div>}
      {query.data.items.map((group) => <SimilarGroup key={group.id} group={group} onReview={onReview} />)}
      {!query.data.total && query.data.availability !== 'unavailable' && <div>
        <p>Chưa tìm thấy nhóm báo cáo tương tự trong phạm vi đã kiểm tra. Báo cáo đơn lẻ nằm ở danh sách thường.</p>
        <Button variant="ghost" onClick={onShowAll}>Xem danh sách thường</Button>
      </div>}
      {!query.data.items.length && page > 1 && <Button variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))}>Về trang trước</Button>}
      <ReportPagination page={page} totalPages={query.data.totalPages} onChange={setPage} loading={query.isFetching} />
    </>}
  </section>;
}

function SimilarGroup({ group, onReview }: { group: PendingGroup; onReview: OnReview }) {
  const [referenceId, setReferenceId] = useState(group.referenceId);
  const reference = group.reports.find((report) => report.id === referenceId) ?? group.reports[0];
  return <details className="admin-duplicate-group">
    <summary>
      <span className="admin-group-title">Có thể trùng lặp · {group.reports.length} báo cáo</span>
      <span>{reference.building.name} · {reference.location.name} · {reference.category.name}</span>
      <span>{reference.title}</span>
      {group.urgency && <Badge kind="urgency" value={group.urgency} />}
      <span className="admin-group-open">Nhấn để mở/đóng danh sách đối chiếu</span>
    </summary>
    <div className="admin-group-members">
      <label htmlFor={`reference-${group.id}`}>Đối chiếu với báo cáo</label>
      <select id={`reference-${group.id}`} className="select" value={reference.id} onChange={(event) => setReferenceId(Number(event.target.value))}>
        {group.reports.map((report) => <option key={report.id} value={report.id}>{report.code} — {report.title}</option>)}
      </select>
      <p>Chọn báo cáo để đối chiếu. Việc chọn không thay đổi cách xử lý các báo cáo còn lại.</p>
      {group.reports.map((report) => <ReportEntry key={report.id} report={report} reference={reference} onReview={onReview} />)}
    </div>
  </details>;
}

function ReportEntry({ report, reference, onReview }: { report: IncidentReport; reference?: IncidentReport; onReview: OnReview }) {
  return <article className={`admin-group-report${reference?.id === report.id ? ' is-reference' : ''}`} aria-label={`Báo cáo ${report.code}`}>
    <header><div className="admin-report-heading"><span className="admin-report-code">{report.code}</span><h3>{report.title}</h3></div>
      <div className="admin-report-markers">{reference?.id === report.id && <span className="admin-reference-label">Đang đối chiếu</span>}{report.urgency && <Badge kind="urgency" value={report.urgency} />}</div></header>
    <p>{report.building.name} · {report.location.name} · {report.category.name}</p>
    <p>{report.student.fullName ?? report.student.email} · Gửi {formatCampusPeriod(report.createdAt)}</p>
    <p>Phát hiện: {report.observedAt ? formatCampusPeriod(report.observedAt) : 'Không rõ ngày/buổi'}{report.recurrenceOfIncidentId ? ' · Báo cáo khả năng tái phát' : ''}</p>
    <p className="admin-report-description">{report.description}</p>
    {report.media.length > 0 && <div className="admin-group-photos">{report.media.map((photo) => <img key={photo.id} src={photo.url} alt={`Ảnh hiện trường ${report.code}`} loading="lazy" />)}</div>}
    <div className="admin-group-actions">
      <Button variant="outline" onClick={() => onReview(report)}>{reference ? 'Xem & duyệt riêng' : 'Xem & duyệt'}</Button>
      {reference && reference.id !== report.id && <Button variant="ghost" onClick={() => onReview(report,
        `Báo cáo trùng với ${reference.code}: cùng phòng ${reference.location.name}, cùng danh mục ${reference.category.name} và cùng sự cố đã được đối chiếu.`)}>Từ chối do trùng</Button>}
    </div>
  </article>;
}
