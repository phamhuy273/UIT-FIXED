import type { IncidentStats } from '../types/admin.types';

export function formatBucket(bucket: string, unit: IncidentStats['trend']['unit']) {
  const [year, month, day] = bucket.split('-');
  if (unit === 'month') return `${month}/${year}`;
  return unit === 'week' ? `Tuần ${day}/${month}` : `${day}/${month}`;
}
