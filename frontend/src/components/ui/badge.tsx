import type { HTMLAttributes } from 'react';

type Status = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'PENDING_ASSIGNMENT' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type Urgency = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type BadgeProps = HTMLAttributes<HTMLSpanElement> & (
  { kind: 'status'; value: Status } | { kind: 'urgency'; value: Urgency }
);

const labels: Record<Status | Urgency, string> = {
  PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', CANCELLED: 'Đã hủy',
  PENDING_ASSIGNMENT: 'Chờ phân công', ASSIGNED: 'Đã phân công', IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã khắc phục', CLOSED: 'Đã đóng', CRITICAL: 'Khẩn cấp', HIGH: 'Cao', MEDIUM: 'Bình thường', LOW: 'Thấp',
};

export function Badge({ kind, value, className = '', children, ...props }: BadgeProps) {
  return <span {...props} className={`ui-badge ui-badge--${kind}-${value.toLowerCase()} ${className}`}>
    <span className="badge-dot" aria-hidden="true" />{children ?? labels[value]}
  </span>;
}
