const screens = {
  attendance: document.getElementById('screen-attendance'),
  roster: document.getElementById('screen-roster'),
  reports: document.getElementById('screen-reports'),
};

for (const [name, el] of Object.entries(screens)) {
  el.textContent = `${name} screen (coming soon)`;
}

function showTab(name) {
  for (const [key, el] of Object.entries(screens)) {
    el.classList.toggle('active', key === name);
  }
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === name);
  });
}

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => showTab(btn.dataset.tab));
});
