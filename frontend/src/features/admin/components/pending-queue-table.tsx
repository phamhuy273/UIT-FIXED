import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { useLocations } from '@/features/master-data';
import { useAuthStore } from '@/stores/auth.store';
import type { IncidentReport } from '@/features/incident-reports/types/incident-report.types';
import { ReportPagination } from '@/features/incident-reports/components/report-pagination';
import { getPendingReports } from '../api/admin-review.api';
import { ReviewModal } from './review-modal';

export function PendingQueueTable() {
  const userId = useAuthStore((state) => state.user?.id);
  const buildings = useLocations();
  const [buildingId, setBuildingId] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<IncidentReport | null>(null);
  const query = useQuery({ queryKey: ['reports', 'pending', userId, page, buildingId], queryFn: ({ signal }) => getPendingReports(page, buildingId ? Number(buildingId) : undefined, signal), refetchInterval: 30_000 });
  useEffect(() => {
    // Synchronize pagination after another admin processes the last row of a page.
    if (query.data && page > 1 && !query.data.items.length) {
      // oxlint-disable-next-line react/set-state-in-effect -- Synchronize with the server's shrinking queue.
      setPage((current) => Math.max(1, current - 1));
    }
  }, [query.data, page]);
  return <>
    <PageHeader eyebrow="QUẢN TRỊ CƠ SỞ VẬT CHẤT" title="Hàng đợi chờ duyệt" description="Ưu tiên phản ánh khẩn cấp, sau đó theo thứ tự gửi sớm nhất." />
    <section className="report-panel queue-panel"><div className="queue-toolbar"><div><strong>{query.data?.total ?? '—'}</strong><span> báo cáo chờ duyệt</span></div><div className="ui-field"><label htmlFor="queue-building">Lọc theo tòa nhà</label><select id="queue-building" className="ui-select" value={buildingId} disabled={buildings.isPending || buildings.isError} onChange={(event) => { setBuildingId(event.target.value); setPage(1); }}><option value="">Tất cả tòa nhà</option>{buildings.data?.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select>
      {buildings.isError && <Button size="sm" variant="outline" onClick={() => { void buildings.refetch(); }}>Tải lại bộ lọc</Button>}</div></div>
      {query.isPending && <p role="status">Đang tải hàng đợi…</p>}
      {query.isError && <div className="error-notice" role="alert">Không tải được hàng đợi.<Button variant="outline" onClick={() => { void query.refetch(); }}>Thử lại</Button></div>}
      {query.data?.items.length === 0 && <div className="report-empty"><span aria-hidden="true">✓</span><h2>Không có báo cáo chờ duyệt</h2><p>Các phản ánh mới sẽ xuất hiện tại đây.</p></div>}
      {Boolean(query.data?.items.length) && <div className="queue-table-wrap"><table className="queue-table" role="table" aria-label="Báo cáo chờ duyệt"><thead role="rowgroup"><tr role="row"><th scope="col">Mã / Hình ảnh</th><th scope="col">Sự cố & vị trí</th><th scope="col">Mức độ đề xuất</th><th scope="col">Thời gian gửi</th><th scope="col"><span className="sr-only">Thao tác</span></th></tr></thead><tbody role="rowgroup">{query.data?.items.map((report) => <tr role="row" key={report.id} className={`queue-row urgency-${report.urgency?.toLowerCase() ?? 'none'}`}>
        <td role="cell"><span className="report-code">{report.code}</span>{report.media[0] && <img className="queue-thumbnail" src={report.media[0].url} alt="Ảnh hiện trường" />}</td>
        <td role="cell"><strong>{report.title}</strong><small>{report.building.name} · {report.location.name}</small><small>{report.student.fullName ?? report.student.email}</small></td>
        <td role="cell" data-label="Mức độ đề xuất">{report.urgency ? <Badge kind="urgency" value={report.urgency} /> : <span className="field-helper">Chưa đề xuất</span>}</td>
        <td role="cell" data-label="Thời gian gửi"><time dateTime={report.createdAt}>{new Date(report.createdAt).toLocaleString('vi-VN')}</time></td>
        <td role="cell"><Button size="sm" onClick={() => setSelected(report)}>Xem & duyệt</Button></td>
      </tr>)}</tbody></table></div>}
      <ReportPagination page={page} totalPages={query.data?.totalPages ?? 0} onChange={setPage} loading={query.isFetching} />
    </section>
    {selected && <ReviewModal key={selected.id} report={selected} onClose={() => setSelected(null)} />}
  </>;
}
