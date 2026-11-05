import { BadRequestException } from '@nestjs/common';

const HALF_DAY = 12 * 60 * 60 * 1000;
const CAMPUS_OFFSET = 7 * 60 * 60 * 1000;
export type RelativeToRepair = 'BEFORE' | 'AFTER';

// observedAt represents the beginning of a campus morning/afternoon bucket,
// not an invented exact observation time. This uses the existing nullable column.
export function periodStart(date: Date) {
  return new Date(Math.floor((date.getTime() + CAMPUS_OFFSET) / HALF_DAY) * HALF_DAY - CAMPUS_OFFSET);
}

export function observationDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now() + 60_000) {
    throw new BadRequestException('Thời điểm phát hiện không hợp lệ hoặc nằm trong tương lai.');
  }
  return periodStart(date);
}

export function cosine(left: number[], right: number[]) {
  if (!left.length || left.length !== right.length) return 0;
  let dot = 0, normLeft = 0, normRight = 0;
  for (let i = 0; i < left.length; i++) {
    dot += left[i] * right[i]; normLeft += left[i] ** 2; normRight += right[i] ** 2;
  }
  return normLeft && normRight ? dot / Math.sqrt(normLeft * normRight) : 0;
}

export function classifyTime(resolvedAt: Date | null, observedAt: Date | null, relative?: RelativeToRepair) {
  if (!resolvedAt) return 'POSSIBLE_DUPLICATE' as const;
  if (observedAt) {
    const start = periodStart(observedAt).getTime();
    if (start >= resolvedAt.getTime()) return 'POSSIBLE_RECURRENCE' as const;
    if (start + HALF_DAY <= resolvedAt.getTime()) return 'PAST_EVENT' as const;
  }
  // A repair within the selected half-day cannot establish whether the student
  // observed the fault before or after it. Only an explicit student choice can.
  if (relative === 'BEFORE') return 'PAST_EVENT' as const;
  if (relative === 'AFTER') return 'POSSIBLE_RECURRENCE' as const;
  return 'NEEDS_TIME' as const;
}

// Only controlled vocabulary is shared; never copy another student's raw text.
export function symptomSummary(text: string) {
  const normalized = text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  if (/khong (len nguon|khoi dong)|bat.*khong (duoc|len)/.test(normalized)) return 'Không khởi động / không lên nguồn';
  if (/chay nuoc|ri nuoc|nho nuoc/.test(normalized)) return 'Rò rỉ hoặc chảy nước';
  if (/bi mo|hinh.*mo|khong ro/.test(normalized)) return 'Hình ảnh hoặc chữ không rõ';
  if (/khong (lanh|mat)/.test(normalized)) return 'Không làm mát';
  if (/mat mang|khong.*ket noi|wifi.*yeu/.test(normalized)) return 'Không kết nối / kết nối yếu';
  return 'Triệu chứng có nội dung tương tự — cần bạn đối chiếu';
}
