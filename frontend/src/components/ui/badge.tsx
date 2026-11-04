import type { HTMLAttributes } from 'react';

type Status =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'PENDING_ASSIGNMENT'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'in_progress'
  | 'resolved';

type Urgency = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'critical' | 'high' | 'medium' | 'low';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  kind?: 'status' | 'urgency';
  value: Status | Urgency;
  withDot?: boolean;
};

const TONE_MAP: Record<string, { label: string; tone: 'warning' | 'info' | 'success' | 'danger' | 'neutral' }> = {
  // Status
  pending: { label: 'Chờ duyệt', tone: 'warning' },
  approved: { label: 'Đã duyệt', tone: 'info' },
  pending_assignment: { label: 'Chờ phân công', tone: 'info' },
  assigned: { label: 'Đã phân công', tone: 'info' },
  in_progress: { label: 'Đang xử lý', tone: 'info' },
  resolved: { label: 'Đã khắc phục', tone: 'success' },
  closed: { label: 'Đã đóng', tone: 'neutral' },
  rejected: { label: 'Từ chối', tone: 'danger' },
  cancelled: { label: 'Đã hủy', tone: 'neutral' },

  // Urgency
  critical: { label: 'Khẩn cấp', tone: 'danger' },
  high: { label: 'Cao', tone: 'warning' },
  medium: { label: 'Bình thường', tone: 'info' },
  low: { label: 'Thấp', tone: 'neutral' },
};

export function Badge({ kind = 'status', value, withDot = true, className = '', children, ...props }: BadgeProps) {
  const key = String(value).toLowerCase();
  const config = TONE_MAP[key] ?? { label: String(value), tone: 'neutral' };

  return (
    <span
      {...props}
      className={`badge badge--${config.tone} ui-badge ui-badge--${kind}-${key} ${className}`}
    >
      {withDot ? <span className="badge__dot badge-dot" aria-hidden="true" /> : null}
      {children ?? config.label}
    </span>
  );
}

export default Badge;
