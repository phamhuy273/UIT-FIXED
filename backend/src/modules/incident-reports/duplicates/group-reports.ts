import { cosine } from './duplicate-rules.js';

export interface GroupableReport {
  id: number; locationId: number; categoryId: number; recurrenceOfIncidentId: number | null;
  urgency: string | null; createdAt: Date;
}
const priority = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const urgencyRank = (urgency: string | null) => urgency && priority.includes(urgency) ? priority.indexOf(urgency) : 4;
export function compareReports(a: GroupableReport, b: GroupableReport) {
  return urgencyRank(a.urgency) - urgencyRank(b.urgency) || a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id;
}

export function groupReports<T extends GroupableReport>(reports: T[], vectors: ReadonlyMap<number, number[]>, threshold: number) {
  const groups: T[][] = [];
  for (const report of [...reports].sort(compareReports)) {
    const vector = vectors.get(report.id);
    const match = vector && groups.find((group) => group.every((member) => {
      const other = vectors.get(member.id);
      return member.locationId === report.locationId && member.categoryId === report.categoryId
        && member.recurrenceOfIncidentId === report.recurrenceOfIncidentId
        && other && cosine(vector, other) >= threshold;
    }));
    if (match) match.push(report);
    else groups.push([report]);
  }
  // All-pairs compatibility avoids A~B, B~C silently implying A~C.
  return groups.sort((a, b) => urgencyRank(a[0].urgency) - urgencyRank(b[0].urgency)
    || Math.min(...a.map((report) => report.createdAt.getTime())) - Math.min(...b.map((report) => report.createdAt.getTime()))
    || Math.min(...a.map((report) => report.id)) - Math.min(...b.map((report) => report.id)));
}
