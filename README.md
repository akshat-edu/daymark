# Daymark

Daymark is a lightweight exam-preparation workspace built around a few useful habits: make a plan, protect focus time, track syllabus work in more than one stage, and learn from test mistakes.

## Run it

1. Download or unzip this folder.
2. Open `index.html` in a modern browser.
3. Your changes save in that browser using `localStorage`.

No build step or package install is required. The optional typefaces load from Google Fonts; the layout falls back to system fonts when offline.

## What works in this version

- Responsive dashboard with daily tasks, focus totals, syllabus overview, and weekly bars.
- Class 11 and Class 12 chapter matrices, with class and subject filters plus separate lecture, practice, and revision checkboxes.
- Light and dark themes, with the selected theme saved between visits.
- A clean first launch: no sample tasks, mock scores, mistakes, or pre-checked syllabus boxes. Earlier starter entries are removed during the one-time data migration; unrelated personal tasks and session history are kept.
- Focus timer with focus/short-break/long-break modes and completed-session logging.
- Mock-test log and mistake notebook with review status.
- Weekly planner with task completion and quick task creation.
- Subject progress insights, settings, JSON export, and JSON import.
- Browser-local persistence.

## Notes

The built-in chapter map is a practical JEE/NEET study outline rather than a guarantee of the next exam cycle’s exact scope. Check the latest official exam syllabus and your school or coaching plan. This is a client-side starter, not a hosted multi-user service. It does not include Google login, cloud sync, live study groups, a deployed AI mentor, or server-side data storage; those need a backend and the relevant service credentials. Timer history is recorded when a session finishes normally, so leaving or reloading the page stops an in-progress session rather than counting unfinished time. Keep exported backups somewhere safe before clearing browser data.

The interface and code were created from scratch for this rebrand. Feature ideas are common exam-tracker concepts, not a copy of another site's implementation.
