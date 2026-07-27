import { renderRosterScreen } from './roster-ui.js';

const screens = {
  attendance: document.getElementById('screen-attendance'),
  roster: document.getElementById('screen-roster'),
  reports: document.getElementById('screen-reports'),
};

screens.attendance.textContent = 'attendance screen (coming soon)';
screens.reports.textContent = 'reports screen (coming soon)';

let rosterRendered = false;

function showTab(name) {
  for (const [key, el] of Object.entries(screens)) {
    el.classList.toggle('active', key === name);
  }
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === name);
  });
  if (name === 'roster' && !rosterRendered) {
    renderRosterScreen(screens.roster);
    rosterRendered = true;
  }
}

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => showTab(btn.dataset.tab));
});
