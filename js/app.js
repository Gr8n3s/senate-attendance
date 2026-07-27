import { renderRosterScreen } from './roster-ui.js';
import { renderAttendanceScreen } from './attendance-ui.js';
import { renderReportsScreen } from './reports-ui.js';

const screens = {
  attendance: document.getElementById('screen-attendance'),
  roster: document.getElementById('screen-roster'),
  reports: document.getElementById('screen-reports'),
};

const rendered = { roster: false, attendance: false, reports: false };

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
  if (name === 'reports') {
    renderReportsScreen(screens.reports);
    rendered.reports = true;
  }
}

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => showTab(btn.dataset.tab));
});

showTab('attendance');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => console.error('SW registration failed', err));
  });
}
