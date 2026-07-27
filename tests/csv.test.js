import test from 'node:test';
import assert from 'node:assert/strict';
import { toCSV, parseCSV, fullLogRows, parseFullLogRows, summaryRows } from '../js/csv.js';

test('toCSV/parseCSV round-trip handles commas, quotes, and newlines', () => {
  const rows = [
    ['Name', 'Note'],
    ['Sen. A, Jr.', 'said "sick", but no note'],
    ['Sen. B', 'multi\nline note'],
  ];
  const text = toCSV(rows);
  const parsed = parseCSV(text);
  assert.deepEqual(parsed, rows);
});

test('fullLogRows/parseFullLogRows round-trip preserves record data', () => {
  const senators = [{ id: 's1', name: 'Sen. A, Jr.', position: 'Chief Whip', level: '300L', department: 'CS' }];
  const sittings = [{ id: 't1', date: '2026-07-20', type: 'Plenary' }];
  const records = [{ id: 'r1', senatorId: 's1', sittingId: 't1', status: 'absent', note: 'said "sick", but no note' }];

  const rows = fullLogRows(senators, sittings, records);
  const csvText = toCSV(rows);
  const parsedRows = parseCSV(csvText);
  const roundTripped = parseFullLogRows(parsedRows);

  assert.equal(roundTripped.length, 1);
  assert.equal(roundTripped[0].date, '2026-07-20');
  assert.equal(roundTripped[0].type, 'Plenary');
  assert.equal(roundTripped[0].senatorName, 'Sen. A, Jr.');
  assert.equal(roundTripped[0].status, 'absent');
  assert.equal(roundTripped[0].note, 'said "sick", but no note');
});

test('summaryRows computes attendance percent per senator', () => {
  const senators = [{ id: 's1', name: 'Sen. A', position: 'none', level: '300L', department: 'CS' }];
  const records = [
    { senatorId: 's1', status: 'present' },
    { senatorId: 's1', status: 'present' },
    { senatorId: 's1', status: 'absent' },
  ];
  const rows = summaryRows(senators, records);
  assert.equal(rows[0][0], 'Senator');
  assert.deepEqual(rows[1], ['Sen. A', 'none', '300L', 'CS', 2, 1, 0, 3, 66.7]);
});
