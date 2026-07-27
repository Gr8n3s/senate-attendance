import { renderRosterScreen } from './roster-ui.js';
import { renderAttendanceScreen } from './attendance-ui.js';

const screens = {
  attendance: document.getElementById('screen-attendance'),
  roster: document.getElementById('screen-roster'),
  reports: document.getElementById('screen-reports'),
};

screens.reports.textContent = 'reports screen (coming soon)';

const rendered = { roster: false, attendance: false };

function showTab(name) {
  for (const [key, el] of Object.entries(screens)) {
    el.classList.toggle('active', key === name);
  }
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === name);
  });
  if (name === 'roster' && !rendered.roster) {
    renderRosterScreen(screens.roster);
    rendered.roster = true;
  }
  if (name === 'attendance' && !rendered.attendance) {
    renderAttendanceScreen(screens.attendance);
    rendered.attendance = true;
  }
}

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => showTab(btn.dataset.tab));
});

showTab('attendance');
