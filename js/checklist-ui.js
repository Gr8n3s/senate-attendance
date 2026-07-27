// js/checklist-ui.js
import { getSenators, getRecordsForSitting, saveRecordsForSitting } from './storage.js';

const STATUSES = ['present', 'absent', 'excused'];
const STATUS_LABEL = { present: 'Present', absent: 'Absent', excused: 'Excused' };

export function renderChecklist(container, sitting, onSaved) {
  const activeSenators = getSenators();
  const existingForRoster = getRecordsForSitting(sitting.id);
  const existingIds = new Set(existingForRoster.map((r) => r.senatorId));
  const inactiveButRecorded = getSenators({ includeInactive: true }).filter(
    (s) => !s.active && existingIds.has(s.id)
  );
  const senators = activeSenators.concat(inactiveButRecorded);

  if (senators.length === 0) {
    container.innerHTML = '<p class="subtitle">No senators on the roster yet. Add senators in the Roster tab first.</p>';
    return;
  }

  const existing = existingForRoster;
  const state = new Map(senators.map((s) => {
    const rec = existing.find((r) => r.senatorId === s.id);
    return [s.id, { status: rec ? rec.status : 'present', note: rec ? rec.note : '' }];
  }));

  render();

  function render() {
    container.innerHTML = `
      <h3>${escapeHtml(sitting.type)} &mdash; ${escapeHtml(sitting.date)}</h3>
      <div id="checklist-items"></div>
      <button id="save-checklist" class="mock-button">Save</button>
    `;
    const items = container.querySelector('#checklist-items');
    items.innerHTML = senators.map((s) => {
      const entry = state.get(s.id);
      return `
        <div class="card">
          <strong>${escapeHtml(s.name)}</strong>
          <span class="subtitle">${escapeHtml(s.level || '')} &middot; ${escapeHtml(s.department || '')}</span>
          <button class="mock-button status-btn" data-id="${s.id}">${STATUS_LABEL[entry.status]}</button>
          <input class="note-input mock-input" data-id="${s.id}" placeholder="Note (optional)" value="${escapeHtml(entry.note)}" />
        </div>
      `;
    }).join('');

    items.querySelectorAll('.status-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const entry = state.get(btn.dataset.id);
        const idx = STATUSES.indexOf(entry.status);
        entry.status = STATUSES[(idx + 1) % STATUSES.length];
        btn.textContent = STATUS_LABEL[entry.status];
      });
    });
    items.querySelectorAll('.note-input').forEach((input) => {
      input.addEventListener('input', () => {
        state.get(input.dataset.id).note = input.value;
      });
    });

    container.querySelector('#save-checklist').addEventListener('click', () => {
      const entries = senators.map((s) => ({ senatorId: s.id, ...state.get(s.id) }));
      saveRecordsForSitting(sitting.id, entries);
      onSaved();
    });
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
