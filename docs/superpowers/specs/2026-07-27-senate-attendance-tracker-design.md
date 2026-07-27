# Senate Attendance Tracker — Design

**Date:** 2026-07-27
**Status:** Approved

## Purpose

A personal, single-user mobile app for a Chief Whip (or an aspiring one) to track
attendance of fellow senators across sittings. Used solely by one person, on one
phone. No accounts, no other users, no server.

## Data model

- **Senator**
  - `name`
  - `position` — one of: Senate President, Deputy Senate President, Chief Whip,
    Senate Scribe, or none. Display-only badge; does not change app behavior or
    report grouping.
  - `level` (e.g. "300L")
  - `department` (e.g. "Computer Science")
  - `active` (boolean) — set to `false` when "removed" instead of hard-deleting,
    so historical attendance records and reports stay intact.

- **Sitting**
  - `date`
  - `type` — one of: Plenary, Committee Meeting, Special Session, or a custom
    typed title ("Other").

- **Attendance record** (one per sitting × senator)
  - `status` — Present / Absent / Excused
  - `note` — optional free-text (e.g. "official trip", "medical", "no excuse given")

Roster size: ~12-15 senators. Small enough that no server-side scale concerns apply.

## Architecture & tech stack

- Single-page **installable PWA** (add-to-homescreen), no backend, no login.
- Plain HTML/CSS/JS — no framework needed at this scale.
- Data persisted in the phone's browser storage (`localStorage`, as JSON).
  Comfortably fits years of sittings for 12-15 senators within typical
  localStorage limits (~5-10MB).
- Works fully offline once installed.
- A service worker provides offline caching + installability (no sync logic
  needed, unlike AttendEase's PWA — this app has no server to sync with).

## Navigation & screens

Bottom tab bar with three tabs:

1. **Take Attendance** (default tab)
   - "New Sitting": pick type (Plenary / Committee Meeting / Special Session /
     Other — custom text) + date (defaults to today).
   - Checklist of all active senators; tap to cycle status
     Present → Absent → Excused. Optional note per senator (tap-and-hold or a
     small note icon).
   - Save writes the sitting + all attendance records.
   - Past sittings are editable (to fix mis-taps).

2. **Roster**
   - Searchable/filterable list of senators (by name, level, department).
   - Each card shows: name, position badge (if any), level, department.
   - Add / edit senator. "Remove" sets `active = false` rather than deleting.

3. **Reports**
   - Senator list with computed attendance %: `present / total sittings`.
     Excused count is shown as a separate figure alongside the %, not folded
     into it — an excused absence is still an absence for the roll call, but
     it's visibly distinguished from an unexplained one.
   - Tap a senator → full sitting-by-sitting history with notes.
   - Raw sitting log: list of past sittings; tap a sitting → that day's full
     roll call.
   - A small "last backup exported: X days ago" note, computed from the last
     export timestamp stored locally. Informational only, never blocking.

## Backup & export

- **Export to CSV** (opens cleanly in Excel/Sheets), two variants:
  - Full log: sitting date, sitting type, senator name, status, note.
  - Summary: senator name, position, level, department, attendance %.
- **Import**: restore from a previously exported full-log CSV, so switching
  phones doesn't lose history. Import replaces/merges into local storage.

## Error handling & edge cases

- Taking attendance with an empty roster → prompt to add senators first,
  block starting a sitting until at least one senator exists.
- Removing a senator with existing attendance history never deletes that
  history — the senator is marked inactive and excluded from new sittings
  only.
- Storage limits are a non-issue at this scale.
- No forced backup reminders — the "last backup" note is informational only.

## Testing approach

No backend, single user — formal test suites would be overkill. Plan:

- Manual pass on an actual phone browser: install flow, mark a sitting, edit
  a past sitting, search/filter roster, export CSV and reopen it in
  Excel/Sheets, import it back, and confirm offline behavior (airplane mode).
- Light unit checks for the two pieces of logic that are easy to get subtly
  wrong: attendance % calculation, and CSV export/import round-trip
  (including notes with commas/quotes).

## Out of scope (for this version)

- Multi-user access, accounts, or cloud sync.
- Any server/backend component.
- Automated reminders or notifications.
- Filtering reports by position (position is a display-only badge).
