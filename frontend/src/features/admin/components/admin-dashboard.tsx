import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { urgencyLabels, type Urgency } from '@/features/incident-reports/types/incident-report.types';
import { useAuthStore } from '@/stores/auth.store';
import { getIncidentStats } from '../api/admin-stats.api';
import type { IncidentStats, IncidentStatus, StatsRange, StatsScope } from '../types/admin.types';
import { formatBucket } from '../lib/format-bucket';
import { BuildingChart, CategoryDonut, ChartCard, TopLocationsChart, TrendChart, UrgencyChart } from './dashboard-charts';
import '../admin-dashboard.css';

const ranges: { value: StatsRange | null; label: string }[] = [
  { value: 7, label: '7 ngày' }, { value: 30, label: '30 ngày' }, { value: 90, label: '90 ngày' }, { value: null, label: 'Tất cả' },
];
const scopes: { value: StatsScope; label: string }[] = [
  { value: 'active', label: 'Chờ duyệt + đã duyệt' }, { value: 'approved', label: 'Chỉ đã duyệt' },
];
const pipeline: { status: IncidentStatus; label: string }[] = [
  { status: 'PENDING_ASSIGNMENT', label: 'Chờ phân công' },
  { status: 'ASSIGNED', label: 'Đã phân công' },
  { status: 'IN_PROGRESS', label: 'Đang xử lý' },
  { status: 'RESOLVED', label: 'Đã khắc phục' },
];
const trendUnitLabel = { day: 'theo ngày', week: 'theo tuần', month: 'theo tháng' } as const;

export function AdminDashboard() {
  const userId = useAuthStore((state) => state.user?.id);
  const [days, setDays] = useState<StatsRange | null>(30);
  const [scope, setScope] = useState<StatsScope>('active');
  const query = useQuery({
    queryKey: ['reports', 'stats', userId, days, scope],
    queryFn: ({ signal }) => getIncidentStats(days, scope, signal),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const stats = query.data;

  return <>
    <PageHeader eyebrow="QUẢN TRỊ CƠ SỞ VẬT CHẤT" title="Tổng quan sự cố"
      description="Thống kê phản ánh theo tòa nhà, phòng và loại thiết bị trong toàn trường." />
    <div className="dash-toolbar">
      <Segmented label="Khoảng thời gian" options={ranges} value={days} onChange={setDays} />
      <Segmented label="Phạm vi thống kê" options={scopes} value={scope} onChange={setScope} />
    </div>
    {query.isPending && <p role="status">Đang tải thống kê…</p>}
    {query.isError && <div className="error-notice" role="alert">Không tải được thống kê.<Button variant="outline" onClick={() => { void query.refetch(); }}>Thử lại</Button></div>}
    {stats && <Dashboard stats={stats} refreshing={query.isFetching} />}
  </>;
}

function Dashboard({ stats, refreshing }: { stats: IncidentStats; refreshing: boolean }) {
  const scopeNote = stats.scope === 'approved' ? 'Chỉ tính phản ánh đã duyệt.' : 'Tính phản ánh chờ duyệt và đã duyệt.';
  return <div className={`dash-grid${refreshing ? ' is-refreshing' : ''}`} aria-busy={refreshing}>
    <KpiRow stats={stats} />
    <ChartCard className="dash-wide" title={`Xu hướng phản ánh ${trendUnitLabel[stats.trend.unit]}`}
      description="Tất cả phản ánh được gửi, kèm số đã duyệt và bị từ chối."
      table={stats.trend.points.map((point) => [formatBucket(point.bucket, stats.trend.unit), point.total])}>
      <TrendChart points={stats.trend.points} unit={stats.trend.unit} />
    </ChartCard>
    <ChartCard title="Theo tòa nhà" description={scopeNote} table={stats.byBuilding.map((item) => [item.name, item.count])}>
      <BuildingChart data={stats.byBuilding} />
    </ChartCard>
    <ChartCard title="Theo loại thiết bị" description={scopeNote} table={stats.byCategory.map((item) => [item.name, item.count])}>
      <CategoryDonut data={stats.byCategory} />
    </ChartCard>
    <ChartCard title="Phòng hỏng nhiều nhất" description={`10 phòng có nhiều phản ánh nhất. ${scopeNote}`}
      table={stats.topLocations.map((item) => [`${item.name} · ${item.buildingName}`, item.count])}>
      <TopLocationsChart data={stats.topLocations} />
    </ChartCard>
    <ChartCard title="Mức độ khẩn cấp" description={scopeNote}
      table={Object.entries(stats.byUrgency).map(([key, count]) => [key === 'UNSET' ? 'Chưa đánh giá' : urgencyLabels[key as Urgency], count])}>
      <UrgencyChart data={stats.byUrgency} />
    </ChartCard>
    <PipelineCard stats={stats} />
  </div>;
}

function Segmented<T extends string | number | null>({ label, options, value, onChange }: {
  label: string; options: { value: T; label: string }[]; value: T; onChange: (value: T) => void;
}) {
  return <div className="dash-range" role="group" aria-label={label}>{options.map((option) =>
    <button key={option.label} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>;
}

function KpiRow({ stats }: { stats: IncidentStats }) {
  const navigate = useNavigate();
  const { byStatus } = stats.incidents;
  const active = byStatus.PENDING_ASSIGNMENT + byStatus.ASSIGNED + byStatus.IN_PROGRESS;
  const resolvedRate = stats.incidents.total ? Math.round((byStatus.RESOLVED / stats.incidents.total) * 100) : 0;
  return <div className="dash-kpis">
    <article className="report-panel dash-kpi"><span>Tổng phản ánh</span><strong>{stats.reports.total}</strong><small>{stats.reports.byStatus.REJECTED} bị từ chối · {stats.reports.byStatus.CANCELLED} đã hủy</small></article>
    <article className="report-panel dash-kpi is-warning"><span>Chờ duyệt</span><strong>{stats.reports.byStatus.PENDING}</strong><Button size="sm" variant="ghost" onClick={() => navigate('/admin/queue')}>Mở hàng đợi →</Button></article>
    <article className="report-panel dash-kpi is-info"><span>Đang xử lý</span><strong>{active}</strong><small>{byStatus.PENDING_ASSIGNMENT} chờ phân công</small></article>
    <article className="report-panel dash-kpi is-success"><span>Đã khắc phục</span><strong>{byStatus.RESOLVED}</strong><small>{resolvedRate}% trên {stats.incidents.total} sự cố đã duyệt</small></article>
  </div>;
}

function PipelineCard({ stats }: { stats: IncidentStats }) {
  const total = stats.incidents.total;
  return <section className="report-panel dash-card dash-wide" aria-labelledby="dash-pipeline">
    <header className="dash-card-header"><h2 id="dash-pipeline">Tiến độ xử lý sự cố</h2><p>Phân bổ các sự cố đã duyệt theo trạng thái hiện tại.</p></header>
    {total === 0 ? <p className="dash-empty">Chưa có sự cố nào được duyệt trong khoảng thời gian này.</p> : <>
      <div className="dash-stack" aria-hidden="true">{pipeline.map(({ status }) => stats.incidents.byStatus[status] > 0 &&
        <i key={status} className={`is-${status.toLowerCase()}`} style={{ flexGrow: stats.incidents.byStatus[status] }} />)}</div>
      <ul className="dash-legend">{pipeline.map(({ status, label }) => {
        const count = stats.incidents.byStatus[status];
        return <li key={status}><span className={`dash-dot is-${status.toLowerCase()}`} />{label}<strong>{count}</strong><small>{Math.round((count / total) * 100)}%</small></li>;
      })}</ul>
    </>}
  </section>;
}
