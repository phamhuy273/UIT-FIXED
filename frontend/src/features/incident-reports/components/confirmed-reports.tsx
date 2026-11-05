import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { myConfirmations, sharedStatusLabels } from '../api/duplicates.api';
import { ReportPagination } from './report-pagination';
import '../duplicates.css';
import { formatCampusPeriod } from '../utils/observation-period';

export function ConfirmedReports() {
  const [page, setPage] = useState(1);
  const userId = useAuthStore((state) => state.user?.id);
  const query = useQuery({ queryKey: ['reports', 'confirmations', userId, page],
    queryFn: ({ signal }) => myConfirmations(page, signal), refetchInterval: 30_000 });
  return <section className="confirmed-reports" aria-label="Sự cố tôi cùng gặp">
    <h2>Sự cố tôi cùng gặp</h2>
    <p>Bạn đang theo dõi tiến độ chung, không tạo thêm báo cáo trong hàng đợi.</p>
    {query.isPending && <p role="status">Đang tải sự cố theo dõi…</p>}
    {query.isError && <div role="alert">Không tải được danh sách. <Button variant="ghost" onClick={() => { void query.refetch(); }}>Thử lại</Button></div>}
    {query.data && !query.data.total && <p>Bạn chưa xác nhận cùng gặp sự cố nào.</p>}
    {query.data?.items.map(({ id, report }) => <article key={id} className="duplicate-match">
      <strong>{report.summary}</strong>
      <p>{sharedStatusLabels[report.status] ?? report.status} · {report.confirmationCount} sinh viên xác nhận thêm</p>
      {report.resolvedAt && <p>Đã khắc phục: {formatCampusPeriod(report.resolvedAt)}</p>}
      {['CANCELLED', 'REJECTED'].includes(report.reportStatus) && <p>Báo cáo gốc không còn được xử lý. Nếu vấn đề vẫn tồn tại, bạn có thể <Link to="/reports/new">tạo báo cáo riêng</Link>.</p>}
      {report.status === 'RESOLVED' && <Link to="/reports/new">Gặp lỗi lại sau khi sửa? Tạo báo cáo mới</Link>}
    </article>)}
    <ReportPagination page={page} totalPages={query.data?.totalPages ?? 0} onChange={setPage} loading={query.isFetching} />
  </section>;
}
