import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAttendanceRate } from '../js/calc.js';

test('empty records → all zero', () => {
  const result = computeAttendanceRate([]);
  assert.deepEqual(result, { total: 0, presentCount: 0, excusedCount: 0, absentCount: 0, percent: 0 });
});

test('mixed statuses → correct counts and percent', () => {
  const records = [
    { status: 'present' },
    { status: 'present' },
    { status: 'absent' },
    { status: 'excused' },
  ];
  const result = computeAttendanceRate(records);
  assert.equal(result.total, 4);
  assert.equal(result.presentCount, 2);
  assert.equal(result.absentCount, 1);
  assert.equal(result.excusedCount, 1);
  assert.equal(result.percent, 50);
});

test('percent rounds to one decimal place', () => {
  const records = [{ status: 'present' }, { status: 'present' }, { status: 'absent' }];
  const result = computeAttendanceRate(records);
  assert.equal(result.percent, 66.7);
});
