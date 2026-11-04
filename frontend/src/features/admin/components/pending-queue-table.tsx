import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Camera, Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { useLocations } from '@/features/master-data';
import { useAuthStore } from '@/stores/auth.store';
import type { IncidentReport } from '@/features/incident-reports/types/incident-report.types';
import { ReportPagination } from '@/features/incident-reports/components/report-pagination';
import { getPendingReports } from '../api/admin-review.api';
import { ReviewModal } from './review-modal';
import '@/features/incident-reports/incidents.css';

function fmtDate(d: string | Date) {
  const date = new Date(d);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (isToday) {
    return `Hôm nay, ${timeStr}`;
  }
  return `${date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${timeStr}`;
}

export function PendingQueueTable() {
  const userId = useAuthStore((state) => state.user?.id);
  const buildings = useLocations();
  const [buildingId, setBuildingId] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<IncidentReport | null>(null);

  const query = useQuery({
    queryKey: ['reports', 'pending', userId, page, buildingId],
    queryFn: ({ signal }) =>
      getPendingReports(page, buildingId ? Number(buildingId) : undefined, signal),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    // Synchronize pagination after another admin processes the last row of a page.
    if (query.data && page > 1 && !query.data.items.length) {
      // oxlint-disable-next-line react/set-state-in-effect -- Synchronize with the server's shrinking queue.
      setPage((current) => Math.max(1, current - 1));
    }
  }, [query.data, page]);

  return (
    <div className="page">
      <PageHeader
        title="Hàng đợi chờ duyệt"
        description="Ưu tiên phản ánh khẩn cấp, sau đó theo thứ tự gửi sớm nhất."
      />

      <div className="card" style={{ padding: 24 }}>
        <div className="queue-toolbar">
          <div className="queue-counter">
            <strong>{query.data?.total ?? 0}</strong>
            <span>báo cáo chờ duyệt</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label htmlFor="queue-building" className="text-small text-muted" style={{ whiteSpace: 'nowrap' }}>
              Tòa nhà:
            </label>
            <select
              id="queue-building"
              className="select"
              style={{ width: 'auto', minWidth: 160, height: 36 }}
              value={buildingId}
              disabled={buildings.isPending || buildings.isError}
              onChange={(event) => {
                setBuildingId(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả tòa nhà</option>
              {buildings.data?.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
            {buildings.isError && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => {
                  void buildings.refetch();
                }}
              >
                Tải lại
              </button>
            )}
          </div>
        </div>

        {query.isPending && (
          <div className="skeleton" style={{ height: 240, margin: '20px 0', borderRadius: 'var(--radius-md)' }} />
        )}

        {query.isError && (
          <div style={{ padding: 24, textAlign: 'center' }} role="alert">
            <p style={{ color: 'var(--danger-text)', margin: '0 0 12px' }}>Không tải được hàng đợi.</p>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => {
                void query.refetch();
              }}
            >
              Thử lại
            </button>
          </div>
        )}

        {!query.isPending && query.data?.items.length === 0 && (
          <div className="empty">
            <Inbox size={28} />
            <h3>Không có báo cáo chờ duyệt</h3>
            <p>Các phản ánh mới cần kiểm tra sẽ xuất hiện tại đây.</p>
          </div>
        )}

        {Boolean(query.data?.items.length) && (
          <div className="table-wrap">
            <table className="table" aria-label="Báo cáo chờ duyệt">
              <thead>
                <tr>
                  <th scope="col" style={{ width: 64 }}>Ảnh</th>
                  <th scope="col">Sự cố & vị trí</th>
                  <th scope="col" style={{ width: 140 }}>Mức độ đề xuất</th>
                  <th scope="col" style={{ width: 160 }}>Thời gian gửi</th>
                  <th scope="col" className="actions">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {query.data?.items.map((report) => (
                  <tr
                    key={report.id}
                    className={`queue-row${report.urgency === 'CRITICAL' ? ' is-critical' : ''}`}
                  >
                    <td>
                      {report.media[0] ? (
                        <img className="thumb" src={report.media[0].url} alt="" />
                      ) : (
                        <div className="thumb thumb--placeholder" aria-hidden="true">
                          <Camera size={18} strokeWidth={1.5} />
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="cell-title">{report.title}</div>
                      <div className="cell-sub">
                        <span className="mono">{report.code}</span>
                        {' · '}
                        {report.building.name}
                        {' · '}
                        {report.location.name}
                        {' · '}
                        {report.student.fullName ?? report.student.email}
                      </div>
                    </td>
                    <td>
                      {report.urgency ? (
                        <Badge kind="urgency" value={report.urgency} />
                      ) : (
                        <span className="text-muted" style={{ fontSize: 13 }}>—</span>
                      )}
                    </td>
                    <td>
                      <time className="text-small text-muted" dateTime={report.createdAt}>
                        {fmtDate(report.createdAt)}
                      </time>
                    </td>
                    <td className="actions">
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => setSelected(report)}
                      >
                        Xem & duyệt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ReportPagination
          page={page}
          totalPages={query.data?.totalPages ?? 0}
          onChange={setPage}
          loading={query.isFetching}
        />
      </div>

      {selected && <ReviewModal key={selected.id} report={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
