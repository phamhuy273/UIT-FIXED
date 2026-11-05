import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Camera, Inbox, UserCheck, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { useLocations } from '@/features/master-data';
import { useAuthStore } from '@/stores/auth.store';
import type { IncidentReport } from '@/features/incident-reports/types/incident-report.types';
import { ReportPagination } from '@/features/incident-reports/components/report-pagination';
import { getPendingReports } from '../api/admin-review.api';
import { getIncidentsQueue, type IncidentQueueItem } from '../api/dispatch.api';
import { ReviewModal } from './review-modal';
import { DispatchModal } from './dispatch-modal';
import { IncidentDetailModal } from './incident-detail-modal';
import { GroupedPendingReports } from './grouped-pending-reports';
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
  const [activeQueue, setActiveQueue] = useState<'PENDING_REPORTS' | 'DISPATCH_INCIDENTS'>('PENDING_REPORTS');
  const [buildingId, setBuildingId] = useState('');
  const [page, setPage] = useState(1);
  const [incidentPage, setIncidentPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<IncidentReport | null>(null);
  const [groupedView, setGroupedView] = useState(true);
  const [initialRejectReason, setInitialRejectReason] = useState<string | undefined>();
  const [selectedIncidentForDispatch, setSelectedIncidentForDispatch] = useState<IncidentQueueItem | null>(null);
  const [selectedIncidentForDetail, setSelectedIncidentForDetail] = useState<IncidentQueueItem | null>(null);

  // 1. Pending Reports Query
  const pendingReportsQuery = useQuery({
    queryKey: ['reports', 'pending', userId, page, buildingId],
    queryFn: ({ signal }) =>
      getPendingReports(page, buildingId ? Number(buildingId) : undefined, signal),
    refetchInterval: 30_000,
    enabled: activeQueue === 'PENDING_REPORTS',
  });

  // 2. Incidents Queue Query (Dispatch & Workload)
  const incidentsQuery = useQuery({
    queryKey: ['incidents', 'queue', userId, incidentPage, buildingId],
    queryFn: () =>
      getIncidentsQueue({
        buildingId: buildingId ? Number(buildingId) : undefined,
        page: incidentPage,
        limit: 10,
      }),
    refetchInterval: 30_000,
  });

  const pendingAssignmentCount =
    incidentsQuery.data?.items.filter((i) => i.status === 'PENDING_ASSIGNMENT').length ?? 0;

  useEffect(() => {
    if (pendingReportsQuery.data && page > 1 && !pendingReportsQuery.data.items.length) {
      setPage((current) => Math.max(1, current - 1));
    }
  }, [pendingReportsQuery.data, page]);

  return (
    <div className="page">
      <PageHeader
        title="Quản trị sự cố & Điều phối Kỹ thuật viên"
        description="Duyệt phản ánh của sinh viên và phân công KTV theo chuyên môn, cân bằng tải công việc."
      />

      {/* Queue Selection Tabs */}
      <div className="queue-tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          className={`btn ${activeQueue === 'PENDING_REPORTS' ? 'btn--primary' : 'btn--secondary'}`}
          onClick={() => {
            setActiveQueue('PENDING_REPORTS');
            setPage(1);
          }}
        >
          <Inbox size={16} style={{ marginRight: 6 }} />
          Báo cáo chờ duyệt ({pendingReportsQuery.data?.total ?? 0})
        </button>
        <button
          type="button"
          className={`btn ${activeQueue === 'DISPATCH_INCIDENTS' ? 'btn--primary' : 'btn--secondary'}`}
          style={pendingAssignmentCount > 0 && activeQueue !== 'DISPATCH_INCIDENTS' ? { borderColor: '#F59E0B' } : undefined}
          onClick={() => {
            setActiveQueue('DISPATCH_INCIDENTS');
            setIncidentPage(1);
          }}
        >
          <Wrench size={16} style={{ marginRight: 6 }} />
          Điều phối & Tiến độ KTV ({incidentsQuery.data?.total ?? 0})
          {pendingAssignmentCount > 0 && (
            <span
              style={{
                marginLeft: 8,
                background: '#EF4444',
                color: '#ffffff',
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {pendingAssignmentCount} chờ giao
            </span>
          )}
        </button>
      </div>

      {/* Alert banner if there are approved incidents needing assignment */}
      {pendingAssignmentCount > 0 && activeQueue === 'PENDING_REPORTS' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            background: '#FEF3C7',
            border: '1px solid #FCD34D',
            borderRadius: 'var(--radius-md)',
            marginBottom: 16,
            color: '#92400E',
            fontSize: 13.5,
          }}
        >
          <span>
            <strong>Có {pendingAssignmentCount} sự cố đã phê duyệt</strong> đang chờ giao việc cho Kỹ thuật viên.
          </span>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => setActiveQueue('DISPATCH_INCIDENTS')}
          >
            Chuyển sang giao việc
          </button>
        </div>
      )}

      <div className="card" style={{ padding: 24 }}>
        <div className="queue-toolbar">
          <div className="queue-counter">
            <strong>
              {activeQueue === 'PENDING_REPORTS'
                ? pendingReportsQuery.data?.total ?? 0
                : incidentsQuery.data?.total ?? 0}
            </strong>
            <span>
              {activeQueue === 'PENDING_REPORTS' ? 'báo cáo chờ duyệt' : 'sự cố đang trong quy trình'}
            </span>
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
                setIncidentPage(1);
              }}
            >
              <option value="">Tất cả tòa nhà</option>
              {buildings.data?.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TAB 1: PENDING REPORTS */}
        {activeQueue === 'PENDING_REPORTS' && (
          <>
            <div className="admin-group-modes" role="group" aria-label="Cách xem báo cáo">
              <button type="button" className="btn btn--secondary" aria-pressed={groupedView} onClick={() => setGroupedView(true)}>Gom báo cáo tương tự</button>
              <button type="button" className="btn btn--secondary" aria-pressed={!groupedView} onClick={() => setGroupedView(false)}>Danh sách thường</button>
            </div>
            {groupedView ? <GroupedPendingReports key={buildingId || 'all'} buildingId={buildingId ? Number(buildingId) : undefined}
              onShowAll={() => setGroupedView(false)} onReview={(report, rejectReason) => { setInitialRejectReason(rejectReason); setSelectedReport(report); }} /> : <>
            {pendingReportsQuery.isPending && (
              <div className="skeleton" style={{ height: 240, margin: '20px 0', borderRadius: 'var(--radius-md)' }} />
            )}

            {!pendingReportsQuery.isPending && pendingReportsQuery.data?.items.length === 0 && (
              <div className="empty">
                <Inbox size={28} />
                <h3>Không có báo cáo chờ duyệt</h3>
                <p>Các phản ánh mới gửi từ sinh viên sẽ xuất hiện tại đây.</p>
              </div>
            )}

            {Boolean(pendingReportsQuery.data?.items.length) && (
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
                    {pendingReportsQuery.data?.items.map((report) => (
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
                            onClick={() => { setInitialRejectReason(undefined); setSelectedReport(report); }}
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
              totalPages={pendingReportsQuery.data?.totalPages ?? 0}
              onChange={setPage}
              loading={pendingReportsQuery.isFetching}
            />
            </>}
          </>
        )}

        {/* TAB 2: DISPATCH & INCIDENTS PROGRESS */}
        {activeQueue === 'DISPATCH_INCIDENTS' && (
          <>
            {incidentsQuery.isPending && (
              <div className="skeleton" style={{ height: 240, margin: '20px 0', borderRadius: 'var(--radius-md)' }} />
            )}

            {!incidentsQuery.isPending && incidentsQuery.data?.items.length === 0 && (
              <div className="empty">
                <Wrench size={28} />
                <h3>Chưa có sự cố nào</h3>
                <p>Các sự cố sau khi được phê duyệt sẽ hiển thị ở đây để điều phối KTV.</p>
              </div>
            )}

            {Boolean(incidentsQuery.data?.items.length) && (
              <div className="table-wrap">
                <table className="table" aria-label="Sự cố điều phối">
                  <thead>
                    <tr>
                      <th scope="col">Mã & Tiêu đề</th>
                      <th scope="col">Vị trí</th>
                      <th scope="col" style={{ width: 260 }}>Kỹ thuật viên phụ trách</th>
                      <th scope="col" className="actions">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidentsQuery.data?.items.map((inc) => {
                      const isUnassigned = inc.status === 'PENDING_ASSIGNMENT';
                      return (
                        <tr
                          key={inc.id}
                          className="incident-table-row"
                          onClick={() => setSelectedIncidentForDetail(inc)}
                        >
                          <td>
                            <div className="cell-title">{inc.report.title}</div>
                            <div className="cell-sub">
                              <span className="mono">{inc.report.code}</span>
                              {' · '}
                              <Badge kind="urgency" value={inc.urgency} />
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500 }}>{inc.report.building.name}</div>
                            <div className="cell-sub">
                              {inc.report.location.floor?.name ?? 'Khu vực chung'} · {inc.report.location.name}
                            </div>
                          </td>
                          <td>
                            {inc.assignment ? (
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <UserCheck size={14} color="#2563EB" />
                                  {inc.assignment.assignee.fullName ?? inc.assignment.assignee.email}
                                </div>
                                <div className="text-small text-muted">
                                  {inc.assignment.departmentName}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: '#D97706', fontWeight: 500, fontSize: 13 }}>
                                Chưa phân công
                              </span>
                            )}
                          </td>
                          <td className="actions">
                            {isUnassigned ? (
                              <button
                                type="button"
                                className="btn btn--primary btn--sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedIncidentForDispatch(inc);
                                }}
                              >
                                Giao việc
                              </button>
                            ) : inc.status !== 'RESOLVED' ? (
                              <button
                                type="button"
                                className="btn btn--secondary btn--sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedIncidentForDispatch(inc);
                                }}
                              >
                                Phân công lại
                              </button>
                            ) : (
                              <span className="text-small" style={{ color: '#16A34A', fontWeight: 600 }}>
                                Đã hoàn thành
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <ReportPagination
              page={incidentPage}
              totalPages={incidentsQuery.data?.totalPages ?? 0}
              onChange={setIncidentPage}
              loading={incidentsQuery.isFetching}
            />
          </>
        )}
      </div>

      {/* Review Modal */}
      {selectedReport && (
        <ReviewModal
          key={selectedReport.id}
          report={selectedReport}
          initialRejectReason={initialRejectReason}
          onClose={() => setSelectedReport(null)}
          onApproved={(approvedReport) => {
            setSelectedReport(null);
            const incId = approvedReport.incident?.id ?? approvedReport.id;
            setSelectedIncidentForDispatch({
              id: incId,
              reportId: approvedReport.id,
              status: 'PENDING_ASSIGNMENT',
              urgency: (approvedReport.urgency as any) ?? 'MEDIUM',
              deadline: null,
              createdAt: approvedReport.createdAt,
              updatedAt: approvedReport.createdAt,
              report: approvedReport as any,
              assignment: null,
              progressNotes: [],
              resolution: null,
            });
            setActiveQueue('DISPATCH_INCIDENTS');
          }}
        />
      )}

      {/* Dispatch Modal */}
      {selectedIncidentForDispatch && (
        <DispatchModal
          key={selectedIncidentForDispatch.id}
          incident={selectedIncidentForDispatch}
          onClose={() => setSelectedIncidentForDispatch(null)}
          onSuccess={() => {
            void incidentsQuery.refetch();
          }}
        />
      )}

      {/* Incident Detail Modal */}
      {selectedIncidentForDetail && (
        <IncidentDetailModal
          key={selectedIncidentForDetail.id}
          incident={selectedIncidentForDetail}
          onClose={() => setSelectedIncidentForDetail(null)}
          onDispatch={() => {
            const target = selectedIncidentForDetail;
            setSelectedIncidentForDetail(null);
            setSelectedIncidentForDispatch(target);
          }}
        />
      )}
    </div>
  );
}
