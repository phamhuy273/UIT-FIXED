import { useId, type ReactNode } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { urgencyLabels, type Urgency } from '@/features/incident-reports/types/incident-report.types';
import { formatBucket } from '../lib/format-bucket';
import type { IncidentStats, TrendPoint } from '../types/admin.types';

const COLORS = {
  primary: '#2563eb', approved: '#22c55e', rejected: '#ef4444', grid: '#e2e8f0', axis: '#64748b',
};
const CATEGORY_PALETTE = ['#2563eb', '#f97316', '#22c55e', '#a855f7', '#ef4444', '#14b8a6', '#f59e0b', '#64748b'];
const URGENCY_COLORS: Record<Urgency | 'UNSET', string> = {
  CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#3b82f6', LOW: '#94a3b8', UNSET: '#cbd5e1',
};
const axisProps = { stroke: COLORS.axis, fontSize: 12, tickLine: false, axisLine: false } as const;
const tooltipStyle = { borderRadius: 8, border: `1px solid ${COLORS.grid}`, fontSize: 13 };
const countLabel = (value: unknown) => [`${value} phản ánh`, ''] as [string, string];

export function ChartCard({ title, description, className = '', table, children }: {
  title: string; description?: string; className?: string; table: [string, number][]; children: ReactNode;
}) {
  const headingId = useId();
  const empty = table.every(([, value]) => value === 0);
  return <section className={`report-panel dash-card ${className}`} aria-labelledby={headingId}>
    <header className="dash-card-header"><h2 id={headingId}>{title}</h2>{description && <p>{description}</p>}</header>
    {empty ? <p className="dash-empty">Chưa có dữ liệu trong khoảng thời gian này.</p> : <>
      <div aria-hidden="true">{children}</div>
      <table className="sr-only"><caption>{title}</caption><tbody>{table.map(([label, value]) =>
        <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>)}</tbody></table>
    </>}
  </section>;
}

export function TrendChart({ points, unit }: { points: TrendPoint[]; unit: IncidentStats['trend']['unit'] }) {
  const data = points.map((point) => ({ ...point, label: formatBucket(point.bucket, unit) }));
  return <ResponsiveContainer width="100%" height={280}>
    <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
      <defs><linearGradient id="dash-trend-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.25} /><stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
      </linearGradient></defs>
      <CartesianGrid stroke={COLORS.grid} vertical={false} />
      <XAxis dataKey="label" {...axisProps} minTickGap={16} />
      <YAxis {...axisProps} allowDecimals={false} />
      <Tooltip contentStyle={tooltipStyle} />
      <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
      <Area type="monotone" dataKey="total" name="Tổng phản ánh" stroke={COLORS.primary} strokeWidth={2} fill="url(#dash-trend-fill)" />
      <Area type="monotone" dataKey="approved" name="Đã duyệt" stroke={COLORS.approved} strokeWidth={2} fill="transparent" />
      <Area type="monotone" dataKey="rejected" name="Từ chối" stroke={COLORS.rejected} strokeWidth={2} strokeDasharray="4 4" fill="transparent" />
    </AreaChart>
  </ResponsiveContainer>;
}

export function BuildingChart({ data }: { data: IncidentStats['byBuilding'] }) {
  return <ResponsiveContainer width="100%" height={280}>
    <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
      <CartesianGrid stroke={COLORS.grid} vertical={false} />
      <XAxis dataKey="name" {...axisProps} interval={0} />
      <YAxis {...axisProps} allowDecimals={false} />
      <Tooltip contentStyle={tooltipStyle} formatter={countLabel} cursor={{ fill: '#f1f5f9' }} />
      <Bar dataKey="count" fill={COLORS.primary} radius={[6, 6, 0, 0]} maxBarSize={56} />
    </BarChart>
  </ResponsiveContainer>;
}

export function CategoryDonut({ data }: { data: IncidentStats['byCategory'] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const slices = data.filter((item) => item.count > 0);
  return <div className="dash-donut">
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={slices} dataKey="count" nameKey="name" innerRadius="58%" outerRadius="90%" paddingAngle={2} stroke="none">
          {slices.map((item, index) => <Cell key={item.id} fill={CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={countLabel} />
      </PieChart>
    </ResponsiveContainer>
    <ul className="dash-legend-list">{slices.map((item, index) => <li key={item.id}>
      <span className="dash-dot" style={{ background: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length] }} />
      <span>{item.name}</span><strong>{item.count}</strong><small>{Math.round((item.count / total) * 100)}%</small>
    </li>)}</ul>
  </div>;
}

export function UrgencyChart({ data }: { data: IncidentStats['byUrgency'] }) {
  const rows = (Object.keys(URGENCY_COLORS) as (Urgency | 'UNSET')[]).map((key) => ({
    key, name: key === 'UNSET' ? 'Chưa đánh giá' : urgencyLabels[key], count: data[key],
  }));
  return <ResponsiveContainer width="100%" height={240}>
    <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
      <CartesianGrid stroke={COLORS.grid} horizontal={false} />
      <XAxis type="number" {...axisProps} allowDecimals={false} />
      <YAxis type="category" dataKey="name" {...axisProps} width={104} />
      <Tooltip contentStyle={tooltipStyle} formatter={countLabel} cursor={{ fill: '#f1f5f9' }} />
      <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
        {rows.map((row) => <Cell key={row.key} fill={URGENCY_COLORS[row.key]} />)}
      </Bar>
    </BarChart>
  </ResponsiveContainer>;
}

export function TopLocationsChart({ data }: { data: IncidentStats['topLocations'] }) {
  const rows = data.map((item) => ({ ...item, label: `${item.name} · ${item.buildingName}` }));
  return <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 40)}>
    <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
      <CartesianGrid stroke={COLORS.grid} horizontal={false} />
      <XAxis type="number" {...axisProps} allowDecimals={false} />
      <YAxis type="category" dataKey="label" {...axisProps} width={168} />
      <Tooltip contentStyle={tooltipStyle} formatter={countLabel} cursor={{ fill: '#f1f5f9' }} />
      <Bar dataKey="count" fill={COLORS.primary} radius={[0, 6, 6, 0]} maxBarSize={24} />
    </BarChart>
  </ResponsiveContainer>;
}
