import type { Urgency } from '@/features/incident-reports/types/incident-report.types';
export type ReviewInput = { action: 'APPROVE'; categoryId: number; urgency: Urgency } | { action: 'REJECT'; reason: string };
