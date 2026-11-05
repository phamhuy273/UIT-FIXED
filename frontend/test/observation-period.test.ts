import { test } from 'node:test';
import assert from 'node:assert/strict';
import { campusPeriod, campusToday, formatCampusPeriod, observationTimestamp } from '../src/features/incident-reports/utils/observation-period.ts';

test('morning and afternoon encode campus half-days without collecting hours/minutes', () => {
  assert.equal(observationTimestamp('2026-01-01', 'AM'), '2025-12-31T17:00:00.000Z');
  assert.equal(observationTimestamp('2026-01-01', 'PM'), '2026-01-01T05:00:00.000Z');
  assert.equal(observationTimestamp('2026-01-01', ''), undefined);
  assert.equal(observationTimestamp('2026-02-31', 'AM'), undefined);
});
test('campus date and half-day do not depend on the computer timezone', () => {
  assert.equal(campusToday(new Date('2026-01-01T18:00:00Z')), '2026-01-02');
  assert.equal(campusPeriod(new Date('2026-01-01T04:59:00Z')), 'AM');
  assert.equal(campusPeriod(new Date('2026-01-01T05:00:00Z')), 'PM');
  assert.equal(formatCampusPeriod('2026-01-01T05:30:00Z'), 'Chiều 1/1/2026');
});
