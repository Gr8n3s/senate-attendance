// js/reports-ui.js
import { getSenators, getSittings, getSenatorAttendance, getRecordsForSenator } from './storage.js';
import { renderChecklist } from './checklist-ui.js';

export function renderReportsScreen(container) {
  container.innerHTML = `
    <h3>Senators</h3>
    <div id="senator-list" class="section"></div>
    <h3>Past Sittings</h3>
    <div id="sitting-list" class="section"></div>
    <div id="detail-box"></div>
  `;

  renderSenatorList();
  renderSittingList();

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
