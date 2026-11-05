export type ObservationPeriod = '' | 'AM' | 'PM';
const timeZone = 'Asia/Ho_Chi_Minh';

export function campusToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function campusPeriod(now = new Date()): 'AM' | 'PM' {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(now));
  return hour < 12 ? 'AM' : 'PM';
}

export function observationTimestamp(day: string, period: ObservationPeriod): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !period) return undefined;
  const value = new Date(`${day}T${period === 'AM' ? '00' : '12'}:00:00+07:00`);
  if (!Number.isFinite(value.getTime()) || campusToday(value) !== day) return undefined;
  return value.toISOString();
}

export function formatCampusPeriod(value: string) {
  const date = new Date(value);
  return `${campusPeriod(date) === 'AM' ? 'Sáng' : 'Chiều'} ${date.toLocaleDateString('vi-VN', { timeZone })}`;
}
