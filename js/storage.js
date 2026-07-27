// js/storage.js
import { computeAttendanceRate } from './calc.js';

const STORAGE_KEY = 'senate-attendance-data-v1';

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { senators: [], sittings: [], records: [], lastExportAt: null };
  return JSON.parse(raw);
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getSenators({ includeInactive = false } = {}) {
  const data = loadData();
  return includeInactive ? data.senators : data.senators.filter((s) => s.active);
}

export function addSenator({ name, position, level, department }) {
  const data = loadData();
  const senator = { id: uid(), name, position: position || 'none', level, department, active: true };
  data.senators.push(senator);
  saveData(data);
  return senator;
}

export function updateSenator(id, updates) {
  const data = loadData();
  const senator = data.senators.find((s) => s.id === id);
  if (!senator) throw new Error(`Senator ${id} not found`);
  Object.assign(senator, updates);
  saveData(data);
  return senator;
}

export function deactivateSenator(id) {
  return updateSenator(id, { active: false });
}

export function getSittings() {
  const data = loadData();
  return data.sittings.slice().sort((a, b) => b.date.localeCompare(a.date));
}

export function addSitting({ date, type }) {
  const data = loadData();
  const sitting = { id: uid(), date, type };
  data.sittings.push(sitting);
  saveData(data);
  return sitting;
}

export function getRecordsForSitting(sittingId) {
  const data = loadData();
  return data.records.filter((r) => r.sittingId === sittingId);
}

export function saveRecordsForSitting(sittingId, entries) {
  const data = loadData();
  data.records = data.records.filter((r) => r.sittingId !== sittingId);
  for (const entry of entries) {
    data.records.push({ id: uid(), sittingId, ...entry });
  }
  saveData(data);
}

export function getRecordsForSenator(senatorId) {
  const data = loadData();
  return data.records.filter((r) => r.senatorId === senatorId);
}

export function getSenatorAttendance(senatorId) {
  return computeAttendanceRate(getRecordsForSenator(senatorId));
}

export function getAllData() {
  return loadData();
}

export function importFullLogRows(parsedRows) {
  const data = loadData();
  const senatorByName = new Map(data.senators.map((s) => [s.name.toLowerCase(), s]));
  const sittingByKey = new Map(data.sittings.map((s) => [`${s.date}|${s.type}`, s]));

  for (const row of parsedRows) {
    let senator = senatorByName.get(row.senatorName.toLowerCase());
    if (!senator) {
      senator = { id: uid(), name: row.senatorName, position: row.position || 'none', level: row.level, department: row.department, active: true };
      data.senators.push(senator);
      senatorByName.set(senator.name.toLowerCase(), senator);
    }
    const key = `${row.date}|${row.type}`;
    let sitting = sittingByKey.get(key);
    if (!sitting) {
      sitting = { id: uid(), date: row.date, type: row.type };
      data.sittings.push(sitting);
      sittingByKey.set(key, sitting);
    }
    const exists = data.records.some((r) => r.sittingId === sitting.id && r.senatorId === senator.id);
    if (!exists) {
      data.records.push({ id: uid(), sittingId: sitting.id, senatorId: senator.id, status: row.status, note: row.note || '' });
    }
  }
  saveData(data);
}

export function markExported() {
  const data = loadData();
  data.lastExportAt = new Date().toISOString();
  saveData(data);
}

export function getLastExportAt() {
  return loadData().lastExportAt;
}
