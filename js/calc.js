export function computeAttendanceRate(records) {
  const total = records.length;
  const presentCount = records.filter((r) => r.status === 'present').length;
  const excusedCount = records.filter((r) => r.status === 'excused').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const percent = total === 0 ? 0 : Math.round((presentCount / total) * 1000) / 10;
  return { total, presentCount, excusedCount, absentCount, percent };
}
