// js/roster-ui.js
import { getSenators, addSenator, updateSenator, deactivateSenator } from './storage.js';

const POSITIONS = ['none', 'Senate President', 'Deputy Senate President', 'Chief Whip', 'Senate Scribe'];

export function renderRosterScreen(container) {
  container.innerHTML = `
    <div class="section">
      <input id="roster-search" class="mock-input" placeholder="Search name, level, or department" />
    </div>
    <div id="roster-list" class="section"></div>
    <button id="add-senator-btn" class="mock-button">+ Add Senator</button>
    <div id="senator-form" class="section" style="display:none;"></div>
  `;

  const search = container.querySelector('#roster-search');
  const list = container.querySelector('#roster-list');
  const formBox = container.querySelector('#senator-form');

  function renderList(filter = '') {
    const term = filter.trim().toLowerCase();
    const senators = getSenators().filter((s) =>
      !term ||
      s.name.toLowerCase().includes(term) ||
      (s.level || '').toLowerCase().includes(term) ||
      (s.department || '').toLowerCase().includes(term)
    );
    list.innerHTML = senators.map((s) => `
      <div class="card" data-id="${s.id}">
        <strong>${escapeHtml(s.name)}</strong>
        ${s.position && s.position !== 'none' ? `<span class="badge">${escapeHtml(s.position)}</span>` : ''}
        <div class="subtitle">${escapeHtml(s.level || '')} &middot; ${escapeHtml(s.department || '')}</div>
        <button class="mock-button edit-btn" data-id="${s.id}">Edit</button>
        <button class="mock-button remove-btn" data-id="${s.id}">Remove</button>
      </div>
    `).join('') || '<p class="subtitle">No senators yet. Add one below.</p>';

    list.querySelectorAll('.edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => showForm(senators.find((s) => s.id === btn.dataset.id)));
    });
    list.querySelectorAll('.remove-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (confirm('Remove this senator? Their history is kept.')) {
          deactivateSenator(btn.dataset.id);
          renderList(search.value);
        }
      });
    });
  }

  function showForm(senator = null) {
    formBox.style.display = 'block';
    formBox.innerHTML = `
      <input id="f-name" class="mock-input" placeholder="Full name" value="${senator ? escapeHtml(senator.name) : ''}" />
      <select id="f-position" class="mock-input">
        ${POSITIONS.map((p) => `<option value="${p}" ${senator && senator.position === p ? 'selected' : ''}>${p === 'none' ? 'No position' : p}</option>`).join('')}
      </select>
      <input id="f-level" class="mock-input" placeholder="Level (e.g. 300L)" value="${senator ? escapeHtml(senator.level || '') : ''}" />
      <input id="f-department" class="mock-input" placeholder="Department" value="${senator ? escapeHtml(senator.department || '') : ''}" />
      <button id="f-save" class="mock-button">Save</button>
    `;
    formBox.querySelector('#f-save').addEventListener('click', () => {
      const name = formBox.querySelector('#f-name').value.trim();
      if (!name) { alert('Name is required'); return; }
      const payload = {
        name,
        position: formBox.querySelector('#f-position').value,
        level: formBox.querySelector('#f-level').value.trim(),
        department: formBox.querySelector('#f-department').value.trim(),
      };
      if (senator) updateSenator(senator.id, payload);
      else addSenator(payload);
      formBox.style.display = 'none';
      renderList(search.value);
    });
  }

  container.querySelector('#add-senator-btn').addEventListener('click', () => showForm());
  search.addEventListener('input', () => renderList(search.value));

  renderList();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
