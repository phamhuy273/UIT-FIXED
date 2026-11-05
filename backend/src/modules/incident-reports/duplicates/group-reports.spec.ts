import { groupReports, type GroupableReport } from './group-reports.js';

const report = (id: number, extra: Partial<GroupableReport> = {}): GroupableReport => ({
  id, locationId: 1, categoryId: 1, recurrenceOfIncidentId: null, urgency: 'HIGH', createdAt: new Date(2026, 0, id), ...extra,
});

it('groups only same room, category and recurrence occurrence', () => {
  const reports = [report(1), report(2), report(3, { locationId: 2 }), report(4, { categoryId: 2 }), report(5, { recurrenceOfIncidentId: 20 })];
  const vectors = new Map(reports.map((item) => [item.id, [1, 0]]));
  expect(groupReports(reports, vectors, 0.8).map((items) => items.map((item) => item.id))).toEqual([[1, 2], [3], [4], [5]]);
});

it('does not group a transitive chain with a dissimilar pair', () => {
  const groups = groupReports([report(1), report(2), report(3)], new Map([
    [1, [1, 0]], [2, [0.9, 0.43589]], [3, [0.62, 0.7846]],
  ]), 0.8);
  expect(groups.map((items) => items.map((item) => item.id))).toEqual([[1, 2], [3]]);
});

it('keeps all reports visible as singles if embeddings are missing', () => {
  expect(groupReports([report(1), report(2)], new Map(), 0.8).map((items) => items.length)).toEqual([1, 1]);
});

it('sorts groups by their highest urgency and then their oldest member', () => {
  const reports = [report(1, { urgency: 'LOW' }), report(2, { urgency: 'CRITICAL', locationId: 2 }),
    report(3, { urgency: 'CRITICAL' }), report(4, { urgency: null, locationId: 3 })];
  const vectors = new Map(reports.map((item) => [item.id, [1, 0]]));
  expect(groupReports(reports, vectors, 0.8).map((items) => items.map((item) => item.id))).toEqual([[3, 1], [2], [4]]);
});
