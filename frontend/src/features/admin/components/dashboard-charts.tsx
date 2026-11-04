import { useId, type ReactNode } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { urgencyLabels, type Urgency } from '@/features/incident-reports/types/incident-report.types';
import { formatBucket } from '../lib/format-bucket';
import type { IncidentStats, TrendPoint } from '../types/admin.types';

const COLORS = {
  primary: '#2563EB',
  approved: '#10B981',
  rejected: '#EF4444',
  grid: '#EEF2F6',
  axis: '#94A3B8',
};

const CATEGORY_PALETTE = ['#2563EB', '#0EA5E9', '#14B8A6', '#F59E0B', '#64748B', '#8B5CF6', '#EC4899', '#94A3B8'];

const URGENCY_COLORS: Record<Urgency | 'UNSET', string> = {
  CRITICAL: '#EF4444',
  HIGH: '#F59E0B',
  MEDIUM: '#3B82F6',
  LOW: '#94A3B8',
  UNSET: '#CBD5E1',
};

const axisProps = {
  stroke: 'transparent',
  tick: { fontSize: 12, fill: COLORS.axis },
  tickLine: false,
  axisLine: false,
} as const;

interface TooltipPayloadItem {
  dataKey?: string;
  name?: string;
  value?: number | string;
  color?: string;
  payload?: { fill?: string; name?: string };
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      {label && <div className="chart-tip__title">{label}</div>}
      {payload.map((p, idx) => (
        <div key={p.dataKey || p.name || idx} className="chart-tip__row">
          <span className="dot" style={{ background: p.color || p.payload?.fill || COLORS.primary }} />
          <span>{p.name || p.payload?.name}</span>
          <b className="num">{p.value}</b>
        </div>
      ))}
    </div>
  );
}

export function ChartCard({
  title,
  description,
  className = '',
  table,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  table: [string, number][];
  children: ReactNode;
}) {
  const headingId = useId();
  const empty = table.every(([, value]) => value === 0);
  return (
    <section className={`card dash-card ${className}`} aria-labelledby={headingId}>
      <header className="dash-card-header">
        <h2 id={headingId}>{title}</h2>
        {description && <p>{description}</p>}
      </header>
      {empty ? (
        <div className="dash-empty">Chưa có dữ liệu trong khoảng thời gian này.</div>
      ) : (
        <>
          <div aria-hidden="true">{children}</div>
          <table className="sr-only">
            <caption>{title}</caption>
            <tbody>
              {table.map(([label, value]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

export function TrendChart({ points, unit }: { points: TrendPoint[]; unit: IncidentStats['trend']['unit'] }) {
  const data = points.map((point) => ({ ...point, label: formatBucket(point.bucket, unit) }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.18} />
            <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps} minTickGap={16} interval="preserveStartEnd" />
        <YAxis {...axisProps} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#CBD5E1', strokeDasharray: '3 3' }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
        <Area type="monotone" dataKey="total" name="Tổng phản ánh" stroke={COLORS.primary} strokeWidth={2} fill="url(#gTotal)" dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="approved" name="Đã duyệt" stroke={COLORS.approved} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="rejected" name="Từ chối" stroke={COLORS.rejected} strokeWidth={2} strokeDasharray="4 4" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BuildingChart({ data }: { data: IncidentStats['byBuilding'] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="name" {...axisProps} interval={0} />
        <YAxis {...axisProps} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-muted)' }} />
        <Bar dataKey="count" name="Số phản ánh" fill={COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryDonut({ data }: { data: IncidentStats['byCategory'] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const slices = data.filter((item) => item.count > 0);
  return (
    <div className="dash-donut">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={slices}
            dataKey="count"
            nameKey="name"
            innerRadius="72%"
            outerRadius="96%"
            paddingAngle={2}
            stroke="none"
          >
            {slices.map((item, index) => (
              <Cell key={item.id} fill={CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--text)"
            fontSize={22}
            fontWeight={600}
            className="num"
          >
            {total}
          </text>
        </PieChart>
      </ResponsiveContainer>
      <ul className="dash-legend-list">
        {slices.map((item, index) => (
          <li key={item.id}>
            <span className="dot" style={{ background: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length] }} />
            <span>{item.name}</span>
            <strong className="num">{item.count}</strong>
            <small className="num">{Math.round((item.count / total) * 100)}%</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function UrgencyChart({ data }: { data: IncidentStats['byUrgency'] }) {
  const rows = (Object.keys(URGENCY_COLORS) as (Urgency | 'UNSET')[]).map((key) => ({
    key,
    name: key === 'UNSET' ? 'Chưa đánh giá' : urgencyLabels[key],
    count: data[key],
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={COLORS.grid} horizontal={false} />
        <XAxis type="number" {...axisProps} allowDecimals={false} />
        <YAxis type="category" dataKey="name" {...axisProps} width={108} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-muted)' }} />
        <Bar dataKey="count" name="Số phản ánh" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {rows.map((row) => (
            <Cell key={row.key} fill={URGENCY_COLORS[row.key]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TopLocationsChart({ data }: { data: IncidentStats['topLocations'] }) {
  const rows = data.map((item) => ({ ...item, label: `${item.name} · ${item.buildingName}` }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 36)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={COLORS.grid} horizontal={false} />
        <XAxis type="number" {...axisProps} allowDecimals={false} />
        <YAxis type="category" dataKey="label" {...axisProps} width={160} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-muted)' }} />
        <Bar dataKey="count" name="Số phản ánh" fill={COLORS.primary} radius={[0, 4, 4, 0]} maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
