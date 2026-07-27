import { computeAttendanceRate } from './calc.js';

export function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function toCSV(rows) {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
}

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { row.push(field); field = ''; rows.push(row); row = []; i++; continue; }
    field += ch; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

const LOG_HEADER = ['Date', 'Type', 'Senator', 'Position', 'Level', 'Department', 'Status', 'Note'];

export function fullLogRows(senators, sittings, records) {
  const senatorById = new Map(senators.map((s) => [s.id, s]));
  const sittingById = new Map(sittings.map((s) => [s.id, s]));
  const rows = records.map((r) => {
    const senator = senatorById.get(r.senatorId) || {};
    const sitting = sittingById.get(r.sittingId) || {};
    return [
      sitting.date || '', sitting.type || '', senator.name || '',
      senator.position || '', senator.level || '', senator.department || '',
      r.status, r.note || '',
    ];
  });
  return [LOG_HEADER, ...rows];
}

export function parseFullLogRows(rows) {
  const [, ...body] = rows;
  return body.map((row) => ({
    date: row[0], type: row[1], senatorName: row[2],
    position: row[3], level: row[4], department: row[5],
    status: row[6], note: row[7] || '',
  }));
}

const SUMMARY_HEADER = ['Senator', 'Position', 'Level', 'Department', 'Present', 'Absent', 'Excused', 'Total', 'Attendance %'];

export function summaryRows(senators, records) {
  const rows = senators.map((s) => {
    const own = records.filter((r) => r.senatorId === s.id);
    const stats = computeAttendanceRate(own);
    return [s.name, s.position || '', s.level || '', s.department || '', stats.presentCount, stats.absentCount, stats.excusedCount, stats.total, stats.percent];
  });
  return [SUMMARY_HEADER, ...rows];
}
