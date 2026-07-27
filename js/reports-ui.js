// js/reports-ui.js
import { getSenators, getSittings, getSenatorAttendance, getRecordsForSenator, getAllData, getLastExportAt, markExported, importFullLogRows } from './storage.js';
import { renderChecklist } from './checklist-ui.js';
import { toCSV, parseCSV, fullLogRows, parseFullLogRows, summaryRows } from './csv.js';

export function renderReportsScreen(container) {
  container.innerHTML = `
    <div id="backup-note" class="subtitle"></div>
    <div class="section">
      <button id="export-log-btn" class="mock-button">Export Full Log (CSV)</button>
      <button id="export-summary-btn" class="mock-button">Export Summary (CSV)</button>
      <label class="mock-button" style="display:block;text-align:center;">
        Import Backup CSV
        <input id="import-input" type="file" accept=".csv" style="display:none;" />
      </label>
    </div>
    <h3>Senators</h3>
    <div id="senator-list" class="section"></div>
    <h3>Past Sittings</h3>
    <div id="sitting-list" class="section"></div>
    <div id="detail-box"></div>
  `;

  renderBackupNote();
  renderSenatorList();
  renderSittingList();

  container.querySelector('#export-log-btn').addEventListener('click', () => {
    const data = getAllData();
    downloadCSV(toCSV(fullLogRows(getSenators({ includeInactive: true }), getSittings(), data.records)), 'senate-attendance-log.csv');
  });
  container.querySelector('#export-summary-btn').addEventListener('click', () => {
    const data = getAllData();
    downloadCSV(toCSV(summaryRows(getSenators({ includeInactive: true }), data.records)), 'senate-attendance-summary.csv');
  });
  container.querySelector('#import-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    importFullLogRows(parseFullLogRows(parseCSV(text)));
    alert('Import complete.');
    renderSenatorList();
    renderSittingList();
  });

  function renderBackupNote() {
    const box = container.querySelector('#backup-note');
    const last = getLastExportAt();
    if (!last) { box.textContent = 'No backup exported yet.'; return; }
    const days = Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
    box.textContent = `Last backup exported: ${days === 0 ? 'today' : days + ' day(s) ago'}.`;
  }

  function downloadCSV(text, filename) {
    const blob = new Blob([text], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    markExported();
    renderBackupNote();
  }

  function renderSenatorList() {
    const box = container.querySelector('#senator-list');
    const senators = getSenators({ includeInactive: true });
    box.innerHTML = senators.map((s) => {
      const stats = getSenatorAttendance(s.id);
      return `
        <div class="card senator-row" data-id="${s.id}">
          <strong>${escapeHtml(s.name)}</strong>
          <div class="subtitle">${stats.percent}% present (${stats.presentCount}/${stats.total}) &middot; ${stats.excusedCount} excused</div>
        </div>
      `;
    }).join('') || '<p class="subtitle">No senators yet.</p>';

    box.querySelectorAll('.senator-row').forEach((row) => {
      row.addEventListener('click', () => showSenatorHistory(senators.find((s) => s.id === row.dataset.id)));
    });
  }

  function renderSittingList() {
    const box = container.querySelector('#sitting-list');
    const sittings = getSittings();
    box.innerHTML = sittings.map((s) => `
      <div class="card sitting-row" data-id="${s.id}">
        <strong>${escapeHtml(s.date)}</strong> &mdash; ${escapeHtml(s.type)}
      </div>
    `).join('') || '<p class="subtitle">No sittings recorded yet.</p>';

    box.querySelectorAll('.sitting-row').forEach((row) => {
      row.addEventListener('click', () => showSittingDetail(sittings.find((s) => s.id === row.dataset.id)));
    });
  }

  function showSenatorHistory(senator) {
    const detail = container.querySelector('#detail-box');
    const records = getRecordsForSenator(senator.id);
    const sittings = getSittings();
    detail.innerHTML = `
      <h3>${escapeHtml(senator.name)}</h3>
      ${records.map((r) => {
        const sitting = sittings.find((s) => s.id === r.sittingId);
        return `<div class="card">${escapeHtml(sitting ? sitting.date : '?')} &mdash; ${escapeHtml(sitting ? sitting.type : '?')}: <b>${escapeHtml(r.status)}</b>${r.note ? ' &mdash; ' + escapeHtml(r.note) : ''}</div>`;
      }).join('') || '<p class="subtitle">No records yet.</p>'}
    `;
  }

  function showSittingDetail(sitting) {
    const detail = container.querySelector('#detail-box');
    detail.innerHTML = '';
    renderChecklist(detail, sitting, () => {
      detail.innerHTML = '<p class="subtitle">Updated.</p>';
      renderSittingList();
      renderSenatorList();
    });
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
