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
import { Inbox } from 'lucide-react';

export function ReportList() {
  const userId = useAuthStore((state) => state.user?.id);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<IncidentReport | null>(null);
  const [reason, setReason] = useState('');
  const route = useLocation();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['reports', 'mine', userId, page],
    queryFn: ({ signal }) => getMyReports(page, signal),
    refetchInterval: 30_000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => cancelReport(id, reason),
    onSuccess: async () => {
      setSelected(null);
      setReason('');
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const message = (route.state as { message?: string } | null)?.message;

  return (
    <div className="page">
      <PageHeader
        title="Báo cáo của tôi"
        description="Theo dõi phản ánh và kết quả tiếp nhận từ nhà trường."
        action={
          <Link className="btn btn--primary btn--lg" to="/reports/new">
            + Báo cáo mới
          </Link>
        }
      />

      {message && (
        <div className="badge badge--success" style={{ display: 'block', padding: '12px 16px', height: 'auto', marginBottom: '16px' }} role="status">
          {message}
        </div>
      )}

      {query.data && query.data.items.length > 0 && (
        <div className="report-stats">
          <div className="card">
            <div className="stat__label">
              <span className="dot dot--neutral" />
              <span>Tổng số</span>
            </div>
            <div className="stat__value num">{query.data.total ?? query.data.items.length}</div>
          </div>
          <div className="card">
            <div className="stat__label">
              <span className="dot dot--warning" />
              <span>Chờ duyệt</span>
            </div>
            <div className="stat__value num">
              {query.data.items.filter((r) => r.status === 'PENDING').length}
            </div>
          </div>
          <div className="card">
            <div className="stat__label">
              <span className="dot dot--info" />
              <span>Đang xử lý</span>
            </div>
            <div className="stat__value num">
              {query.data.items.filter((r) => r.status === 'APPROVED').length}
            </div>
          </div>
          <div className="card">
            <div className="stat__label">
              <span className="dot dot--danger" />
              <span>Từ chối / Hủy</span>
            </div>
            <div className="stat__value num">
              {query.data.items.filter((r) => r.status === 'REJECTED' || r.status === 'CANCELLED').length}
            </div>
          </div>
        </div>
      )}

      {query.isPending && (
        <div className="stagger" style={{ display: 'grid', gap: '16px' }}>
          <div className="skeleton" style={{ height: '120px' }} />
          <div className="skeleton" style={{ height: '120px' }} />
        </div>
      )}

      {query.isError && (
        <div className="card" style={{ padding: '24px', textAlign: 'center', borderColor: 'var(--danger-border)' }} role="alert">
          <p className="field__error" style={{ marginBottom: '12px' }}>Không tải được danh sách báo cáo.</p>
          <Button variant="outline" size="sm" onClick={() => { void query.refetch(); }}>
            Thử lại
          </Button>
        </div>
      )}

      {query.data?.items.length === 0 && (
        <div className="empty">
          <Inbox size={32} style={{ color: 'var(--text-subtle)', margin: '0 auto 12px' }} />
          <h3>Chưa có báo cáo nào</h3>
          <p>Khi phòng học hoặc thiết bị cần hỗ trợ, hãy gửi phản ánh tại đây.</p>
          <Link className="btn btn--secondary btn--sm" to="/reports/new">
            Tạo báo cáo mới
          </Link>
        </div>
      )}

      {query.data && query.data.items.length > 0 && (
        <div className="card report-list">
          {query.data.items.map((report) => {
            const hasMedia = Boolean(report.media && report.media.length > 0);
            const firstMedia = hasMedia ? report.media[0] : null;
            const extraCount = hasMedia ? report.media.length - 1 : 0;
            const rejectHistory = report.status === 'REJECTED'
              ? report.histories.findLast((e) => e.action === 'REJECTED')
              : null;
            const cancelHistory = report.status === 'CANCELLED'
              ? report.histories.findLast((e) => e.action === 'CANCELLED')
              : null;

            return (
              <article
                className={`report-row${hasMedia ? '' : ' report-row--no-thumb'}`}
                key={report.id}
              >
                {hasMedia && firstMedia ? (
                  <div className="report-row__thumb-wrap">
                    <a href={firstMedia.url} target="_blank" rel="noreferrer">
                      <img className="thumb" src={firstMedia.url} alt="Ảnh hiện trường" />
                    </a>
                    {extraCount > 0 && (
                      <span className="report-row__thumb-badge">+{extraCount}</span>
                    )}
                  </div>
                ) : null}

                <div className="report-row__main">
                  <div className="report-row__id">{report.code}</div>
                  <h3>{report.title}</h3>
                  <p className="report-row__meta">
                    {report.category.name} · {report.building.name} · {report.location.floor?.name ?? 'Khu vực chung'} · {report.location.name}
                  </p>
                  <p className="report-row__desc">{report.description}</p>

                  {rejectHistory && (
                    <div
                      className="badge badge--danger"
                      style={{ display: 'inline-flex', padding: '4px 8px', marginTop: '8px', height: 'auto' }}
                    >
                      <strong>Lý do từ chối:</strong>&nbsp;{rejectHistory.reason ?? 'Không có lý do cụ thể.'}
                    </div>
                  )}

                  {cancelHistory && (
                    <div
                      className="badge badge--neutral"
                      style={{ display: 'inline-flex', padding: '4px 8px', marginTop: '8px', height: 'auto' }}
                    >
                      <strong>Lý do hủy:</strong>&nbsp;{cancelHistory.reason ?? 'Đã hủy.'}
                    </div>
                  )}
                </div>

                <div className="report-row__side">
                  <Badge kind="status" value={report.status} />
                  {report.urgency ? <Badge kind="urgency" value={report.urgency} /> : null}
                  <span className="report-row__time">
                    {new Date(report.createdAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  {report.status === 'PENDING' && (
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => {
                        setSelected(report);
                        setReason('');
                        mutation.reset();
                      }}
                    >
                      Hủy báo cáo
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ReportPagination page={page} totalPages={query.data?.totalPages ?? 0} onChange={setPage} loading={query.isFetching} />

      <Modal
        open={Boolean(selected)}
        onClose={() => {
          if (!mutation.isPending) setSelected(null);
        }}
        closeOnBackdrop={!mutation.isPending}
        title="Hủy báo cáo"
        description={selected?.code}
        footer={
          <>
            <Button variant="outline" size="sm" disabled={mutation.isPending} onClick={() => setSelected(null)}>
              Giữ lại
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={mutation.isPending}
              disabled={reason.trim().length < 3}
              onClick={() => {
                if (selected) mutation.mutate({ id: selected.id, reason: reason.trim() });
              }}
            >
              Xác nhận hủy
            </Button>
          </>
        }
      >
        <p style={{ margin: '0 0 16px', fontSize: '13px', lineHeight: '1.5', color: 'var(--text-muted)' }}>
          Chỉ báo cáo đang ở trạng thái <strong>Chờ duyệt</strong> mới có thể hủy.
        </p>
        <Input
          label="Lý do hủy"
          required
          maxLength={1000}
          value={reason}
          disabled={mutation.isPending}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Nhập lý do rút lại báo cáo..."
        />
        {mutation.isError && (
          <p className="field__error" role="alert" style={{ marginTop: '8px' }}>
            {readErrorMessage(mutation.error, 'Không thể hủy báo cáo.')}
          </p>
        )}
      </Modal>
    </div>
  );
}
