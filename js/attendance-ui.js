// js/attendance-ui.js
import { getSenators, addSitting } from './storage.js';
import { renderChecklist } from './checklist-ui.js';

const TYPES = ['Plenary', 'Committee Meeting', 'Special Session'];

export function renderAttendanceScreen(container) {
  container.innerHTML = `
    <div class="section">
      <h3>New Sitting</h3>
      <div id="type-buttons" class="section"></div>
      <input id="custom-type" class="mock-input" placeholder="Custom title" style="display:none;" />
      <input id="sitting-date" class="mock-input" type="date" />
      <button id="start-btn" class="mock-button">Start Attendance</button>
    </div>
    <div id="checklist-box"></div>
  `;

  const typeButtons = container.querySelector('#type-buttons');
  const customInput = container.querySelector('#custom-type');
  const dateInput = container.querySelector('#sitting-date');
  const checklistBox = container.querySelector('#checklist-box');

  dateInput.value = new Date().toISOString().slice(0, 10);

  let selectedType = TYPES[0];
  function renderTypeButtons() {
    typeButtons.innerHTML = [...TYPES, 'Other'].map((t) =>
      `<button class="mock-button type-btn" data-type="${t}" style="${t === selectedType ? 'font-weight:bold;' : ''}">${t}</button>`
    ).join('');
    typeButtons.querySelectorAll('.type-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedType = btn.dataset.type;
        customInput.style.display = selectedType === 'Other' ? 'block' : 'none';
        renderTypeButtons();
      });
    });
  }
  renderTypeButtons();

  container.querySelector('#start-btn').addEventListener('click', () => {
    if (getSenators().length === 0) {
      alert('Add at least one senator in the Roster tab before starting a sitting.');
      return;
    }
    const type = selectedType === 'Other' ? (customInput.value.trim() || 'Other') : selectedType;
    const date = dateInput.value;
    if (!date) { alert('Pick a date'); return; }
    const sitting = addSitting({ date, type });
    checklistBox.innerHTML = '';
    renderChecklist(checklistBox, sitting, () => {
      checklistBox.innerHTML = '<p class="subtitle">Saved.</p>';
    });
  });
}
