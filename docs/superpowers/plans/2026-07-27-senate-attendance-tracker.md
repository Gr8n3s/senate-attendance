# Senate Attendance Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal, single-user, offline-first PWA that lets a Chief Whip (or an aspiring one) take and review attendance for ~12-15 senators across sittings, with no backend and no login.

**Architecture:** Plain HTML/CSS/JS, ES modules, no framework. All app data lives in the phone's `localStorage` as JSON. A service worker makes the app installable and usable offline. Pure calculation/CSV logic is isolated into dependency-free modules so it can be unit tested with Node's built-in test runner; everything else (DOM rendering, storage) is verified manually in a browser.

**Tech Stack:** Vanilla JS (ES modules), `localStorage`, Service Worker API, Web App Manifest, Node built-in test runner (`node --test`), a tiny dependency-free static file server for local dev, deployed as a static site to GitHub Pages.

---

## File structure

```
senate-attendance/
  index.html
  manifest.json
  sw.js
  css/
    styles.css
  js/
    app.js              # tab navigation, entry point
    calc.js             # pure: attendance % calculation (tested)
    csv.js              # pure: CSV serialize/parse + row mapping (tested)
    storage.js           # localStorage-backed data layer (senators/sittings/records)
    checklist-ui.js       # shared roll-call checklist component
    roster-ui.js          # Roster tab
    attendance-ui.js      # Take Attendance tab
    reports-ui.js         # Reports tab (stats, history, CSV export/import)
  icons/
    icon.svg
  scripts/
    dev-server.js        # tiny local static server for manual testing
  tests/
    calc.test.js
    csv.test.js
  package.json
  .gitignore
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `scripts/dev-server.js`
- Create: `.gitignore` (already exists with `.superpowers/`; add `node_modules/`)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "senate-attendance",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/",
    "dev": "node scripts/dev-server.js"
  }
}
```

- [ ] **Step 2: Create the dev server**

```js
// scripts/dev-server.js
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 5173;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
});
```

- [ ] **Step 3: Update `.gitignore`**

```
.superpowers/
node_modules/
```

- [ ] **Step 4: Verify the server runs**

Run: `node scripts/dev-server.js` (in the `senate-attendance` folder), then in another terminal:
`curl -I http://localhost:5173/` (or open the URL in a browser)
Expected: a 404 response (no `index.html` yet) — confirms the server itself works. Stop the server with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/dev-server.js .gitignore
git commit -m "chore: scaffold project with a dependency-free dev server"
```

---

### Task 2: App shell (HTML, CSS, tab navigation)

**Files:**
- Create: `index.html`
- Create: `css/styles.css`
- Create: `js/app.js`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Senate Attendance</title>
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#1c2b4a">
<link rel="icon" href="icons/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <header class="app-header">Senate Attendance</header>

  <main id="screen-attendance" class="screen active"></main>
  <main id="screen-roster" class="screen"></main>
  <main id="screen-reports" class="screen"></main>

  <nav class="tab-bar">
    <button class="tab-btn active" data-tab="attendance">&#128203;<br>Attend</button>
    <button class="tab-btn" data-tab="roster">&#128101;<br>Roster</button>
    <button class="tab-btn" data-tab="reports">&#128202;<br>Reports</button>
  </nav>

  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `css/styles.css`**

```css
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0b1220;
  color: #eef1f7;
  padding-bottom: 72px;
}
.app-header {
  padding: 16px;
  font-weight: 600;
  text-align: center;
  background: #1c2b4a;
}
.screen { display: none; padding: 12px; }
.screen.active { display: block; }
.section { margin-bottom: 16px; }
.card {
  border: 1px solid #2c3b5a;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 8px;
}
.subtitle { color: #9aa5c0; font-size: 13px; }
.badge {
  display: inline-block;
  background: #3a4d7a;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 12px;
  margin-left: 6px;
}
.mock-input, .mock-button, select {
  width: 100%;
  padding: 10px;
  margin: 4px 0;
  border-radius: 8px;
  border: 1px solid #2c3b5a;
  background: #131c30;
  color: #eef1f7;
  font-size: 14px;
}
.mock-button { cursor: pointer; text-align: center; }
.status-btn { width: auto; display: inline-block; margin-right: 8px; }
.note-input { display: block; margin-top: 6px; }
.tab-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  display: flex;
  background: #1c2b4a;
  border-top: 1px solid #2c3b5a;
}
.tab-btn {
  flex: 1;
  padding: 10px 0;
  text-align: center;
  background: none;
  border: none;
  color: #9aa5c0;
  font-size: 12px;
}
.tab-btn.active { color: #ffffff; font-weight: 600; }
```

- [ ] **Step 3: Create `js/app.js` with placeholder screens (real screens land in later tasks)**

```js
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
```

- [ ] **Step 4: Verify in a browser**

Run: `npm run dev`, then open `http://localhost:5173/`.
Expected: header "Senate Attendance", three bottom tabs, tapping each tab swaps which placeholder text is shown.

- [ ] **Step 5: Commit**

```bash
git add index.html css/styles.css js/app.js
git commit -m "feat: add app shell with bottom tab navigation"
```

---

### Task 3: `calc.js` — attendance percentage (TDD)

**Files:**
- Create: `js/calc.js`
- Test: `tests/calc.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/calc.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAttendanceRate } from '../js/calc.js';

test('empty records → all zero', () => {
  const result = computeAttendanceRate([]);
  assert.deepEqual(result, { total: 0, presentCount: 0, excusedCount: 0, absentCount: 0, percent: 0 });
});

test('mixed statuses → correct counts and percent', () => {
  const records = [
    { status: 'present' },
    { status: 'present' },
    { status: 'absent' },
    { status: 'excused' },
  ];
  const result = computeAttendanceRate(records);
  assert.equal(result.total, 4);
  assert.equal(result.presentCount, 2);
  assert.equal(result.absentCount, 1);
  assert.equal(result.excusedCount, 1);
  assert.equal(result.percent, 50);
});

test('percent rounds to one decimal place', () => {
  const records = [{ status: 'present' }, { status: 'present' }, { status: 'absent' }];
  const result = computeAttendanceRate(records);
  assert.equal(result.percent, 66.7);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../js/calc.js'`

- [ ] **Step 3: Write the implementation**

```js
// js/calc.js
export function computeAttendanceRate(records) {
  const total = records.length;
  const presentCount = records.filter((r) => r.status === 'present').length;
  const excusedCount = records.filter((r) => r.status === 'excused').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const percent = total === 0 ? 0 : Math.round((presentCount / total) * 1000) / 10;
  return { total, presentCount, excusedCount, absentCount, percent };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — 3 tests passing

- [ ] **Step 5: Commit**

```bash
git add js/calc.js tests/calc.test.js
git commit -m "feat: add attendance percentage calculation with tests"
```

---

### Task 4: `csv.js` — CSV serialize/parse + row mapping (TDD)

**Files:**
- Create: `js/csv.js`
- Test: `tests/csv.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/csv.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { toCSV, parseCSV, fullLogRows, parseFullLogRows, summaryRows } from '../js/csv.js';

test('toCSV/parseCSV round-trip handles commas, quotes, and newlines', () => {
  const rows = [
    ['Name', 'Note'],
    ['Sen. A, Jr.', 'said "sick", but no note'],
    ['Sen. B', 'multi\nline note'],
  ];
  const text = toCSV(rows);
  const parsed = parseCSV(text);
  assert.deepEqual(parsed, rows);
});

test('fullLogRows/parseFullLogRows round-trip preserves record data', () => {
  const senators = [{ id: 's1', name: 'Sen. A, Jr.', position: 'Chief Whip', level: '300L', department: 'CS' }];
  const sittings = [{ id: 't1', date: '2026-07-20', type: 'Plenary' }];
  const records = [{ id: 'r1', senatorId: 's1', sittingId: 't1', status: 'absent', note: 'said "sick", but no note' }];

  const rows = fullLogRows(senators, sittings, records);
  const csvText = toCSV(rows);
  const parsedRows = parseCSV(csvText);
  const roundTripped = parseFullLogRows(parsedRows);

  assert.equal(roundTripped.length, 1);
  assert.equal(roundTripped[0].date, '2026-07-20');
  assert.equal(roundTripped[0].type, 'Plenary');
  assert.equal(roundTripped[0].senatorName, 'Sen. A, Jr.');
  assert.equal(roundTripped[0].status, 'absent');
  assert.equal(roundTripped[0].note, 'said "sick", but no note');
});

test('summaryRows computes attendance percent per senator', () => {
  const senators = [{ id: 's1', name: 'Sen. A', position: 'none', level: '300L', department: 'CS' }];
  const records = [
    { senatorId: 's1', status: 'present' },
    { senatorId: 's1', status: 'present' },
    { senatorId: 's1', status: 'absent' },
  ];
  const rows = summaryRows(senators, records);
  assert.equal(rows[0][0], 'Senator');
  assert.deepEqual(rows[1], ['Sen. A', 'none', '300L', 'CS', 2, 1, 0, 3, 66.7]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../js/csv.js'`

- [ ] **Step 3: Write the implementation**

```js
// js/csv.js
import { computeAttendanceRate } from './calc.js';

export function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function toCSV(rows) {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
}

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { row.push(field); field = ''; rows.push(row); row = []; i++; continue; }
    field += ch; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

const LOG_HEADER = ['Date', 'Type', 'Senator', 'Position', 'Level', 'Department', 'Status', 'Note'];

export function fullLogRows(senators, sittings, records) {
  const senatorById = new Map(senators.map((s) => [s.id, s]));
  const sittingById = new Map(sittings.map((s) => [s.id, s]));
  const rows = records.map((r) => {
    const senator = senatorById.get(r.senatorId) || {};
    const sitting = sittingById.get(r.sittingId) || {};
    return [
      sitting.date || '', sitting.type || '', senator.name || '',
      senator.position || '', senator.level || '', senator.department || '',
      r.status, r.note || '',
    ];
  });
  return [LOG_HEADER, ...rows];
}

export function parseFullLogRows(rows) {
  const [, ...body] = rows;
  return body.map((row) => ({
    date: row[0], type: row[1], senatorName: row[2],
    position: row[3], level: row[4], department: row[5],
    status: row[6], note: row[7] || '',
  }));
}

const SUMMARY_HEADER = ['Senator', 'Position', 'Level', 'Department', 'Present', 'Absent', 'Excused', 'Total', 'Attendance %'];

export function summaryRows(senators, records) {
  const rows = senators.map((s) => {
    const own = records.filter((r) => r.senatorId === s.id);
    const stats = computeAttendanceRate(own);
    return [s.name, s.position || '', s.level || '', s.department || '', stats.presentCount, stats.absentCount, stats.excusedCount, stats.total, stats.percent];
  });
  return [SUMMARY_HEADER, ...rows];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — 6 tests passing (3 from calc.test.js, 3 from csv.test.js)

- [ ] **Step 5: Commit**

```bash
git add js/csv.js tests/csv.test.js
git commit -m "feat: add CSV serialize/parse and row mapping with round-trip tests"
```

---

### Task 5: `storage.js` — localStorage data layer

**Files:**
- Create: `js/storage.js`

No automated tests for this file (it's a thin `localStorage` wrapper, not fiddly logic — see spec's testing section). It's verified manually through the UI in Tasks 6, 8, and 9.

- [ ] **Step 1: Write `js/storage.js`**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add js/storage.js
git commit -m "feat: add localStorage-backed data layer for senators, sittings, and records"
```

---

### Task 6: Roster screen

**Files:**
- Create: `js/roster-ui.js`
- Modify: `js/app.js` (wire in the real roster screen)

- [ ] **Step 1: Write `js/roster-ui.js`**

```js
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
```

- [ ] **Step 2: Wire it into `js/app.js`**

```js
// js/app.js
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
```

- [ ] **Step 3: Verify in a browser**

Run: `npm run dev`, open `http://localhost:5173/`, tap the Roster tab.
Expected: search box, "No senators yet" message, "+ Add Senator" button. Add a senator (name, position, level, department), confirm it appears in the list with a badge. Reload the page — the senator should still be there (persisted in `localStorage`). Search by department substring and confirm filtering works. Click Remove and confirm the senator disappears from the list.

- [ ] **Step 4: Commit**

```bash
git add js/roster-ui.js js/app.js
git commit -m "feat: add roster screen with search, add, edit, and remove"
```

---

### Task 7: `checklist-ui.js` — shared roll-call component

**Files:**
- Create: `js/checklist-ui.js`

- [ ] **Step 1: Write `js/checklist-ui.js`**

```js
// js/checklist-ui.js
import { getSenators, getRecordsForSitting, saveRecordsForSitting } from './storage.js';

const STATUSES = ['present', 'absent', 'excused'];
const STATUS_LABEL = { present: 'Present', absent: 'Absent', excused: 'Excused' };

export function renderChecklist(container, sitting, onSaved) {
  const senators = getSenators();

  if (senators.length === 0) {
    container.innerHTML = '<p class="subtitle">No senators on the roster yet. Add senators in the Roster tab first.</p>';
    return;
  }

  const existing = getRecordsForSitting(sitting.id);
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
```

- [ ] **Step 2: Commit**

```bash
git add js/checklist-ui.js
git commit -m "feat: add shared roll-call checklist component"
```

(Verified in Task 8, where it's first used.)

---

### Task 8: Take Attendance screen

**Files:**
- Create: `js/attendance-ui.js`
- Modify: `js/app.js` (wire in the real attendance screen)

- [ ] **Step 1: Write `js/attendance-ui.js`**

```js
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
```

- [ ] **Step 2: Wire it into `js/app.js`**

```js
// js/app.js
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
```

- [ ] **Step 3: Verify in a browser**

Run: `npm run dev`, open `http://localhost:5173/` (add a couple of senators in Roster first if you haven't). On the Attend tab: pick a type (or "Other" + type a custom title), keep today's date, tap "Start Attendance". Confirm a checklist appears with every senator defaulted to Present. Tap a status button to confirm it cycles Present → Absent → Excused → Present. Type a note. Tap Save and confirm "Saved." appears. Reload the page, start a new sitting on the same date/type, and confirm — actually re-opening the exact same sitting isn't exposed here (that happens via Reports in Task 9) — instead confirm via `localStorage` in devtools that a `senate-attendance-data-v1` key now holds the sitting and records.

- [ ] **Step 4: Commit**

```bash
git add js/attendance-ui.js js/app.js
git commit -m "feat: add take-attendance screen with sitting setup and roll-call"
```

---

### Task 9: Reports screen

**Files:**
- Create: `js/reports-ui.js`
- Modify: `js/app.js` (wire in the real reports screen)

- [ ] **Step 1: Write `js/reports-ui.js` (stats and history only — export/import added in Task 10)**

```js
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
```

- [ ] **Step 2: Wire it into `js/app.js`**

```js
// js/app.js
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
```

Note: Reports re-renders every time the tab is opened (unlike Roster/Attendance, which render once) — its content depends on data that changes on other tabs, so it must always be fresh.

- [ ] **Step 3: Verify in a browser**

Run: `npm run dev`, open the app, add a couple of senators, take attendance for a sitting (mark a mix of present/absent/excused with a note on one). Go to the Reports tab. Confirm the senator list shows correct percentages and excused counts. Tap a senator and confirm their full history (with notes) shows. Go back, tap the sitting under "Past Sittings", confirm the same roll-call checklist opens pre-filled with what you saved, change a status, tap Save, and confirm "Updated." appears and the senator list's percentage reflects the change.

- [ ] **Step 4: Commit**

```bash
git add js/reports-ui.js js/app.js
git commit -m "feat: add reports screen with attendance stats and drill-down history"
```

---

### Task 10: CSV export/import

**Files:**
- Modify: `js/reports-ui.js`

- [ ] **Step 1: Add export/import UI and wiring to `js/reports-ui.js`**

```js
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
```

- [ ] **Step 2: Verify in a browser**

Run: `npm run dev`, open the Reports tab. Tap "Export Full Log (CSV)" and confirm a `senate-attendance-log.csv` file downloads; open it in Excel or Google Sheets and confirm columns and rows look right, including any note with a comma or quote in it. Tap "Export Summary (CSV)" and confirm the summary file downloads with correct percentages. Confirm the "Last backup exported" note now says "today". Then open the app in a private/incognito window (fresh `localStorage`), use "Import Backup CSV" to import the log file you just exported, and confirm the senators, sittings, and records reappear with matching statuses and notes.

- [ ] **Step 3: Commit**

```bash
git add js/reports-ui.js
git commit -m "feat: add CSV export/import for backup and restore"
```

---

### Task 11: PWA manifest, icon, and service worker

**Files:**
- Create: `manifest.json`
- Create: `icons/icon.svg`
- Create: `sw.js`
- Modify: `js/app.js` (register the service worker)

- [ ] **Step 1: Create `icons/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="32" fill="#1c2b4a"/>
  <text x="96" y="122" font-size="76" font-family="system-ui, sans-serif" fill="#ffffff" text-anchor="middle">SA</text>
</svg>
```

- [ ] **Step 2: Create `manifest.json`**

```json
{
  "name": "Senate Attendance",
  "short_name": "Attendance",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#0b1220",
  "theme_color": "#1c2b4a",
  "icons": [
    { "src": "icons/icon.svg", "sizes": "any", "type": "image/svg+xml" }
  ]
}
```

- [ ] **Step 3: Create `sw.js`**

```js
// sw.js
const CACHE_NAME = 'senate-attendance-v1';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/storage.js',
  './js/calc.js',
  './js/csv.js',
  './js/roster-ui.js',
  './js/attendance-ui.js',
  './js/reports-ui.js',
  './js/checklist-ui.js',
  './manifest.json',
  './icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
```

Note: the fetch handler explicitly skips cross-origin requests, so it can never interfere with anything loaded from another host.

- [ ] **Step 4: Register the service worker in `js/app.js`** (append to the end of the file)

```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => console.error('SW registration failed', err));
  });
}
```

- [ ] **Step 5: Verify in a browser**

Run: `npm run dev`, open `http://localhost:5173/` in Chrome. Open DevTools → Application → Service Workers and confirm one is registered and activated. Reload the page, then in DevTools → Network, set throttling to "Offline" and reload again — the app should still load fully. On your phone (same Wi-Fi network, using your computer's local IP instead of `localhost`), open the URL in Chrome and confirm "Add to Home Screen" is offered; note that a plain HTTP dev server may not satisfy installability on some phones — full install verification happens against the HTTPS GitHub Pages URL in Task 12.

- [ ] **Step 6: Commit**

```bash
git add manifest.json icons/icon.svg sw.js js/app.js
git commit -m "feat: add PWA manifest, icon, and offline service worker"
```

(If you ever change which files the app ships, bump `CACHE_NAME` to `v2`, `v3`, etc. so the service worker picks up the new file list.)

---

### Task 12: Deploy to GitHub Pages

**Files:** none (repo-level operations only)

This creates a **public** GitHub repository — required for free GitHub Pages hosting. This is safe: the repo only ever contains app code, never attendance data (all data stays in `localStorage` on your phone). **Confirm with the user before running Step 1** (creates a new remote repo) and **Step 3** (pushes and makes it publicly reachable).

- [ ] **Step 1: Create the GitHub repository**

```bash
gh repo create senate-attendance --public --source=. --remote=origin
```

- [ ] **Step 2: Push the code**

```bash
git push -u origin main
```

(If your default branch is `master` instead of `main`, substitute accordingly, or rename first with `git branch -M main`.)

- [ ] **Step 3: Enable GitHub Pages**

```bash
gh api -X POST "repos/:owner/senate-attendance/pages" -f "source[branch]=main" -f "source[path]=/"
```

- [ ] **Step 4: Verify the deployed site**

Run: `gh api repos/:owner/senate-attendance/pages --jq .html_url` to get the Pages URL (it can take a minute or two to become live after Step 3). Open that URL on your phone over mobile data (not Wi-Fi, to confirm it's truly public), confirm the app loads, and use your browser's "Add to Home Screen" / "Install app" option. Open the installed app once, add your actual senator roster, and take a real or test sitting to confirm everything persists after closing and reopening the app.

- [ ] **Step 5: Commit any final touch-ups (if the Pages setup required config changes)**

```bash
git add -A
git commit -m "chore: deploy to GitHub Pages" --allow-empty
git push
```
