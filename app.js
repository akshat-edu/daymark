const STORE_KEY = 'daymark-workspace-v1';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const chapterSeed = {
  'Class 11': {
    Physics: [
      'Units & Measurements', 'Motion in a Straight Line', 'Motion in a Plane', 'Laws of Motion',
      'Work, Energy & Power', 'System of Particles', 'Rotational Motion', 'Gravitation',
      'Mechanical Properties of Solids', 'Mechanical Properties of Fluids', 'Thermal Properties of Matter',
      'Thermodynamics', 'Kinetic Theory', 'Oscillations', 'Waves'
    ],
    Chemistry: [
      'Some Basic Concepts in Chemistry', 'Structure of Atom', 'Classification of Elements & Periodicity',
      'Chemical Bonding & Molecular Structure', 'Chemical Thermodynamics', 'Equilibrium', 'Redox Reactions',
      'Organic Chemistry: Basic Principles & Techniques', 'Hydrocarbons'
    ],
    Mathematics: [
      'Sets', 'Relations & Functions', 'Trigonometric Functions', 'Complex Numbers & Quadratic Equations',
      'Linear Inequalities', 'Permutations & Combinations', 'Binomial Theorem', 'Sequences & Series',
      'Straight Lines', 'Conic Sections', 'Introduction to 3D Geometry', 'Limits & Derivatives',
      'Statistics', 'Probability'
    ],
    Biology: [
      'The Living World', 'Biological Classification', 'Plant Kingdom', 'Animal Kingdom',
      'Morphology of Flowering Plants', 'Anatomy of Flowering Plants', 'Structural Organisation in Animals',
      'Cell: The Unit of Life', 'Biomolecules', 'Cell Cycle & Cell Division', 'Photosynthesis in Higher Plants',
      'Respiration in Plants', 'Plant Growth & Development', 'Breathing & Exchange of Gases',
      'Body Fluids & Circulation', 'Excretion & Elimination', 'Locomotion & Movement',
      'Neural Control & Coordination', 'Chemical Coordination & Integration'
    ]
  },
  'Class 12': {
    Physics: [
      'Electric Charges & Fields', 'Electrostatic Potential & Capacitance', 'Current Electricity',
      'Moving Charges & Magnetism', 'Magnetism & Matter', 'Electromagnetic Induction',
      'Alternating Current', 'Electromagnetic Waves', 'Ray Optics', 'Wave Optics',
      'Dual Nature of Radiation & Matter', 'Atoms', 'Nuclei', 'Semiconductor Electronics', 'Experimental Skills'
    ],
    Chemistry: [
      'Solutions', 'Electrochemistry', 'Chemical Kinetics', 'The p-Block Elements',
      'The d- and f-Block Elements', 'Coordination Compounds', 'Haloalkanes & Haloarenes',
      'Alcohols, Phenols & Ethers', 'Aldehydes, Ketones & Carboxylic Acids', 'Amines',
      'Biomolecules', 'Principles Related to Practical Chemistry'
    ],
    Mathematics: [
      'Relations & Functions', 'Inverse Trigonometric Functions', 'Matrices', 'Determinants',
      'Continuity & Differentiability', 'Applications of Derivatives', 'Integrals',
      'Applications of Integrals', 'Differential Equations', 'Vector Algebra',
      'Three-Dimensional Geometry', 'Linear Programming', 'Probability'
    ],
    Biology: [
      'Sexual Reproduction in Flowering Plants', 'Human Reproduction', 'Reproductive Health',
      'Principles of Inheritance & Variation', 'Molecular Basis of Inheritance', 'Evolution',
      'Human Health & Disease', 'Microbes in Human Welfare', 'Biotechnology: Principles & Processes',
      'Biotechnology & Its Applications', 'Organisms & Populations', 'Ecosystem',
      'Biodiversity & Conservation'
    ]
  }
};
const subjectMeta = {
  Physics: { short: 'PHY', className: 'physics', stamp: 'P' },
  Chemistry: { short: 'CHEM', className: 'chem', stamp: 'C' },
  Mathematics: { short: 'MATH', className: 'math', stamp: 'M' },
  Biology: { short: 'BIO', className: 'bio', stamp: 'B' }
};

const todayKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const shiftDate = (date, days) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const safeNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const dateLabel = (date, options = { month: 'short', day: 'numeric' }) => new Intl.DateTimeFormat('en-IN', options).format(date);
const dayLabel = date => new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date);

function createDefaultState() {
  const chapters = {};
  Object.entries(chapterSeed).forEach(([grade, subjects]) => {
    Object.entries(subjects).forEach(([subject, names]) => {
      names.forEach((name, index) => {
        // Keep old Class 11 IDs so existing personal chapter data can be migrated.
        const id = grade === 'Class 11'
          ? `${subject.toLowerCase()}-${index + 1}`
          : `class12-${subject.toLowerCase()}-${index + 1}`;
        chapters[id] = {
          id, grade, subject, name,
          lecture: false, practice: false, revision: false
        };
      });
    });
  });

  return {
    schemaVersion: 2,
    profile: { name: 'Aspirant', exam: 'JEE Main', year: '2027', dailyTarget: 180 },
    chapters,
    tasks: [],
    tests: [],
    mistakes: [],
    sessions: [],
    preferences: { dayRollover: 4, theme: 'light' },
    timer: { mode: 'focus', remaining: 25 * 60, running: false, startedAt: null, taskId: '' }
  };
}

const DEMO_TASK_TITLES = new Set([
  'balance redox reactions', 'gravitation — escape speed', 'gravitation - escape speed',
  'trigonometry mixed questions', 'review yesterday’s mistakes', "review yesterday's mistakes",
  'revise chemical bonding notes', 'revise redox notes', 'revise redox reaction notes'
]);
const DEMO_TEST_NAMES = new Set([
  'chapter test — motion', 'chapter test - motion', 'chemical bonding practice', 'maths mixed set'
]);
const DEMO_MISTAKE_TITLES = new Set([
  'forgot the direction of friction', 'sign error in oxidation number'
]);

function isDemoTask(task) {
  const title = String(task?.title || '').trim().toLocaleLowerCase();
  return DEMO_TASK_TITLES.has(title) || /\b(revise|review)\b.*\bredox\b.*\bnotes\b/.test(title);
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (!saved) return createDefaultState();

    const parsed = JSON.parse(saved);
    const fresh = createDefaultState();
    const isLegacy = safeNumber(parsed.schemaVersion, 0) < 2;
    const chapters = { ...fresh.chapters };

    Object.entries(parsed.chapters || {}).forEach(([id, oldChapter]) => {
      if (!oldChapter || typeof oldChapter !== 'object') return;
      const base = fresh.chapters[id];
      if (base) {
        const chapter = {
          ...base,
          lecture: Boolean(oldChapter.lecture),
          practice: Boolean(oldChapter.practice),
          revision: Boolean(oldChapter.revision)
        };

        // Older versions pre-checked a few sample boxes on first launch.
        // Remove only those untouched defaults; keep progress that differs from them.
        if (isLegacy && !oldChapter.custom && base.grade === 'Class 11') {
          const oldIndex = Number(id.match(/-(\d+)$/)?.[1]) - 1;
          const oldSubject = base.subject;
          const defaultLecture = oldIndex >= 0 && oldIndex < 2 && oldSubject !== 'Biology';
          const defaultPractice = oldIndex === 0 && oldSubject !== 'Biology';
          if (Boolean(oldChapter.lecture) === defaultLecture &&
              Boolean(oldChapter.practice) === defaultPractice &&
              !Boolean(oldChapter.revision)) {
            chapter.lecture = false;
            chapter.practice = false;
            chapter.revision = false;
          }
        }
        chapters[id] = chapter;
      } else if (oldChapter.custom) {
        chapters[id] = {
          ...oldChapter,
          grade: oldChapter.grade === 'Class 12' ? 'Class 12' : 'Class 11',
          lecture: Boolean(oldChapter.lecture),
          practice: Boolean(oldChapter.practice),
          revision: Boolean(oldChapter.revision)
        };
      }
    });

    const normalized = {
      ...fresh,
      ...parsed,
      schemaVersion: 2,
      profile: { ...fresh.profile, ...(parsed.profile || {}) },
      chapters,
      tasks: (Array.isArray(parsed.tasks) ? parsed.tasks : []).filter(task => !isLegacy || !isDemoTask(task)),
      tests: (Array.isArray(parsed.tests) ? parsed.tests : []).filter(test => !isLegacy || !DEMO_TEST_NAMES.has(String(test?.name || '').trim().toLocaleLowerCase())),
      mistakes: (Array.isArray(parsed.mistakes) ? parsed.mistakes : []).filter(item => !isLegacy || !DEMO_MISTAKE_TITLES.has(String(item?.title || '').trim().toLocaleLowerCase())),
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      preferences: { ...fresh.preferences, ...(parsed.preferences || {}) },
      timer: { ...fresh.timer, ...(parsed.timer || {}), running: false }
    };
    if (isLegacy) {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(normalized));
      } catch (migrationError) {
        console.warn('The older workspace was cleaned in memory but could not be rewritten.', migrationError);
      }
    }
    return normalized;
  } catch (error) {
    console.warn('Could not load the saved Daymark workspace.', error);
    return createDefaultState();
  }
}
function makeId() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }

let state = loadState();
let activePage = 'overview';
let subjectFilter = 'All';
let classFilter = 'All classes';
let syllabusSearch = '';
let testFilter = 'All';
let toastTimer;
let timerInterval;
let lastSavedAt = Date.now();

function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    lastSavedAt = Date.now();
  } catch (error) {
    showToast('This browser could not save your data. Export a backup before leaving.');
  }
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function getChapterProgress(chapter) {
  const checks = ['lecture', 'practice', 'revision'];
  const done = checks.filter(key => chapter[key]).length;
  return { done, total: checks.length, percent: Math.round(done / checks.length * 100) };
}
function syllabusStats(subject = 'All', grade = 'All classes') {
  const chapters = Object.values(state.chapters).filter(chapter =>
    (subject === 'All' || chapter.subject === subject) &&
    (grade === 'All classes' || chapter.grade === grade) &&
    !(state.profile.exam !== 'NEET' && subject === 'All' && chapter.subject === 'Biology')
  );
  const complete = chapters.filter(chapter => getChapterProgress(chapter).done === 3).length;
  const checked = chapters.reduce((sum, chapter) => sum + getChapterProgress(chapter).done, 0);
  return { chapters: chapters.length, complete, checked, percent: chapters.length ? Math.round(checked / (chapters.length * 3) * 100) : 0 };
}
function getTodayTasks(date = todayKey()) { return state.tasks.filter(task => task.date === date).sort((a, b) => Number(a.done) - Number(b.done)); }
function focusMinutesInRange(start, end) {
  return state.sessions.filter(session => session.date >= todayKey(start) && session.date <= todayKey(end)).reduce((sum, session) => sum + safeNumber(session.minutes), 0);
}
function getStreak() {
  const days = new Set(state.sessions.map(session => session.date));
  let streak = 0;
  let date = new Date();
  if (!days.has(todayKey(date))) date = shiftDate(date, -1);
  while (days.has(todayKey(date)) && streak < 365) { streak++; date = shiftDate(date, -1); }
  return streak;
}
function getSubjectProgress(subject) { return syllabusStats(subject).percent; }
function formatMinutes(minutes) {
  const value = Math.max(0, Math.round(minutes));
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  if (!hours) return `${mins}m`;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}
function setPage(page) {
  activePage = page;
  $$('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.page === page));
  $('#sidebar').classList.remove('open');
  const titleMap = {
    overview: 'Make today count.', syllabus: 'One chapter at a time.', focus: 'Protect your attention.',
    tests: 'Learn from every attempt.', planner: 'Give the week a shape.', insights: 'Look at the pattern.'
  };
  $('#page-title').textContent = titleMap[page] || 'Daymark';
  renderPage();
  $('#content').focus({ preventScroll: true });
}

function applyTheme() {
  const theme = state.preferences?.theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  const toggle = $('#theme-toggle');
  if (toggle) {
    toggle.textContent = theme === 'dark' ? '☀' : '☾';
    toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    toggle.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    toggle.setAttribute('aria-pressed', String(theme === 'dark'));
  }
  const metaTheme = $('meta[name="theme-color"]');
  if (metaTheme) metaTheme.content = theme === 'dark' ? '#141914' : '#f6f5f1';
}

function toggleTheme() {
  state.preferences = { ...state.preferences, theme: state.preferences?.theme === 'dark' ? 'light' : 'dark' };
  applyTheme();
  saveState();
}

function updateFrame() {
  const today = new Date();
  $('#today-label').textContent = new Intl.DateTimeFormat('en-IN', { weekday: 'long', month: 'long', day: 'numeric' }).format(today).toUpperCase();
  $('#profile-name').textContent = state.profile.name || 'Aspirant';
  $('#user-avatar').textContent = (state.profile.name || 'A').trim().slice(0, 1).toUpperCase();
  $('#profile-exam').textContent = `${state.profile.exam} · ${state.profile.year}`;
  const weekStart = weekDates()[0];
  const weekEnd = weekDates()[6];
  const mins = focusMinutesInRange(weekStart, weekEnd);
  const target = safeNumber(state.profile.dailyTarget, 180) * 7;
  const percent = target ? Math.min(100, Math.round(mins / target * 100)) : 0;
  $('#side-week-percent').textContent = `${percent}%`;
  $('#side-week-fill').style.width = `${percent}%`;
  $('#side-week-note').textContent = mins ? `${formatMinutes(mins)} of focus this week.` : 'Small sessions count, too.';
  $('#nav-syllabus-count').textContent = `${syllabusStats().percent}%`;
}

function renderPage() {
  updateFrame();
  const content = $('#content');
  const renderers = {
    overview: renderOverview,
    syllabus: renderSyllabus,
    focus: renderFocus,
    tests: renderTests,
    planner: renderPlanner,
    insights: renderInsights
  };
  content.innerHTML = (renderers[activePage] || renderOverview)();
  if (activePage === 'focus') updateTimerDisplay();
}

function renderOverview() {
  const today = new Date();
  const dateParts = new Intl.DateTimeFormat('en-IN', { day: '2-digit' }).format(today);
  const monthParts = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(today);
  const tasks = getTodayTasks();
  const completed = tasks.filter(task => task.done).length;
  const todayMinutes = focusMinutesInRange(today, today);
  const weekMinutes = focusMinutesInRange(weekDates()[0], weekDates()[6]);
  const stats = syllabusStats();
  const testsDone = state.tests.length;
  const nextTask = state.tasks.filter(task => !task.done && task.date >= todayKey()).sort((a,b) => a.date.localeCompare(b.date))[0];
  const weeklyBars = renderWeekBars();
  const backlog = ['Physics', 'Chemistry', 'Mathematics'].map(subject => ({ subject, count: Object.values(state.chapters).filter(ch => ch.subject === subject && getChapterProgress(ch).done < 3).length })).sort((a,b) => b.count-a.count).slice(0,3);
  return `
    <section class="hero-band">
      <div class="welcome-card">
        <div class="welcome-topline"><span></span> A steady plan beats a perfect plan</div>
        <div><h2>Show up for the work.<br>Let the numbers follow.</h2><p>Your prep is a long game. Keep the next step small, clear and doable.</p></div>
        <div class="welcome-bottom"><button class="button button-dark" data-action="focus">Start a session <span>↗</span></button><button class="text-link" data-action="page" data-page="planner">See this week →</button></div>
      </div>
      <div class="date-card">
        <div class="date-head"><span>Today's page</span><span class="streak-tag">✳ ${getStreak()} day streak</span></div>
        <div><div class="date-number">${dateParts}</div><p class="date-month">${monthParts}</p></div>
        <div class="date-bottom"><span>Daily focus target</span><strong>${formatMinutes(state.profile.dailyTarget)}</strong></div>
      </div>
    </section>

    <section class="metric-grid">
      <article class="metric-card"><div class="metric-heading"><span>Focused today</span><span class="metric-icon">◷</span></div><div class="metric-value">${formatMinutes(todayMinutes)}</div><div class="metric-foot"><strong>${Math.min(100, Math.round(todayMinutes / Math.max(1, state.profile.dailyTarget) * 100))}%</strong> of your daily target</div></article>
      <article class="metric-card"><div class="metric-heading"><span>Syllabus covered</span><span class="metric-icon orange">▤</span></div><div class="metric-value">${stats.percent}%</div><div class="metric-foot">${stats.complete} chapters fully wrapped</div></article>
      <article class="metric-card"><div class="metric-heading"><span>Practice logged</span><span class="metric-icon blue">⌁</span></div><div class="metric-value">${testsDone}</div><div class="metric-foot">${state.mistakes.length} mistakes saved for review</div></article>
    </section>

    <section class="section-grid">
      <div class="panel">
        <div class="panel-head"><div><h3 class="panel-title">Today's route</h3><p class="panel-subtitle">A short list you can actually finish.</p></div><button class="text-link" data-action="add-task">+ Add task</button></div>
        <div class="panel-body"><div class="task-list">${tasks.length ? tasks.map(task => taskRow(task)).join('') : '<div class="empty-state">Nothing planned for today. Add one clear next step.</div>'}</div><div class="panel-separator" style="margin-top:7px;padding-top:11px;display:flex;justify-content:space-between;align-items:center"><span class="subtle" style="font-size:10px">${completed} of ${tasks.length} complete</span><button class="text-link" data-action="page" data-page="planner">Open planner →</button></div></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h3 class="panel-title">The week, so far</h3><p class="panel-subtitle">Your tracked focus time, day by day.</p></div><span class="tag green">${formatMinutes(weekMinutes)}</span></div>
        <div class="panel-body">${weeklyBars}<div class="mini-legend"><span><i class="legend-dot"></i>Focused minutes</span><span>Target: ${formatMinutes(state.profile.dailyTarget)}/day</span></div></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h3 class="panel-title">Keep an eye on</h3><p class="panel-subtitle">Topics still in progress.</p></div><button class="text-link" data-action="page" data-page="syllabus">View all →</button></div>
        <div class="panel-body"><div class="backlog-list">${backlog.map(item => `<div class="backlog-row"><span class="subject-stamp ${subjectMeta[item.subject].className}">${subjectMeta[item.subject].stamp}</span><div class="backlog-copy"><strong>${item.subject}</strong><small>${Object.values(state.chapters).filter(ch => ch.subject === item.subject && getChapterProgress(ch).done === 3).length} fully revised chapters</small></div><span class="backlog-count">${item.count} open</span></div>`).join('')}</div></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h3 class="panel-title">Next up</h3><p class="panel-subtitle">One thing worth doing next.</p></div><span class="tag">UP NEXT</span></div>
        <div class="panel-body">${nextTask ? `<div class="next-test"><div class="next-test-top"><span class="test-label">Planned task</span><span class="due-pill">${nextTask.date === todayKey() ? 'Today' : dateLabel(new Date(`${nextTask.date}T12:00:00`))}</span></div><div class="test-name">${escapeHTML(nextTask.title)}</div><p>${escapeHTML(nextTask.subject)} · ${nextTask.minutes} minutes set aside</p><div class="next-test-bottom"><span>Keep it simple.</span><button class="text-link" data-action="complete-task" data-id="${nextTask.id}">Mark done ✓</button></div></div>` : '<div class="empty-state">You cleared the list. Plan the next session when you’re ready.</div>'}</div>
      </div>
    </section>`;
}

function taskRow(task) {
  return `<label class="task-row ${task.done ? 'done' : ''}"><input class="task-check" type="checkbox" data-action="toggle-task" data-id="${task.id}" ${task.done ? 'checked' : ''}><span class="task-copy"><strong>${escapeHTML(task.title)}</strong><small>${task.minutes} min planned</small></span><span class="task-subject">${escapeHTML(task.subject)}</span></label>`;
}

function weekDates() {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = shiftDate(today, mondayOffset);
  return Array.from({ length: 7 }, (_, i) => shiftDate(monday, i));
}
function renderWeekBars() {
  const dates = weekDates();
  const values = dates.map(date => state.sessions.filter(session => session.date === todayKey(date)).reduce((sum, session) => sum + safeNumber(session.minutes), 0));
  const max = Math.max(state.profile.dailyTarget, ...values, 1);
  return `<div class="week-bars">${dates.map((date, i) => `<div class="week-column"><div class="week-bar-holder"><div class="week-bar ${todayKey(date) === todayKey() ? 'today' : ''}" style="height:${Math.max(5, values[i] / max * 95)}px" title="${values[i]} minutes"></div></div><span class="week-day ${todayKey(date) === todayKey() ? 'today' : ''}">${dayLabel(date).slice(0,1)}</span></div>`).join('')}</div>`;
}

function renderSyllabus() {
  const subjects = ['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology'];
  const grades = ['All classes', 'Class 11', 'Class 12'];
  const stats = syllabusStats(subjectFilter, classFilter);
  let chapters = Object.values(state.chapters).filter(ch =>
    (classFilter === 'All classes' || ch.grade === classFilter) &&
    (subjectFilter === 'All' || ch.subject === subjectFilter)
  );
  if (state.profile.exam !== 'NEET' && subjectFilter === 'All') chapters = chapters.filter(ch => ch.subject !== 'Biology');
  if (syllabusSearch.trim()) chapters = chapters.filter(ch => `${ch.name} ${ch.subject}`.toLowerCase().includes(syllabusSearch.toLowerCase()));
  return `
    <div class="page-intro"><div><div class="eyebrow">THE BIG PICTURE</div><h2>Syllabus, without the guesswork.</h2><p>Track learning, problem practice and revision separately. A chapter is only done when you have worked through all three.</p></div><div class="page-actions"><button class="button button-outline" data-action="add-chapter">+ Add chapter</button></div></div>
    <section class="syllabus-summary">
      <article class="metric-card"><div class="metric-heading">Tracked chapters</div><div class="metric-value">${stats.chapters}</div><div class="metric-foot">Across your current subjects</div></article>
      <article class="metric-card"><div class="metric-heading">Fully wrapped</div><div class="metric-value">${stats.complete}</div><div class="metric-foot">All three steps checked off</div></article>
      <article class="metric-card"><div class="metric-heading">Steps checked</div><div class="metric-value">${stats.checked}</div><div class="metric-foot">Out of ${stats.chapters * 3} total</div></article>
      <article class="metric-card"><div class="metric-heading">Overall progress</div><div class="metric-value">${stats.percent}%</div><div class="progress-track"><span style="width:${stats.percent}%"></span></div></article>
    </section>
    <div class="filter-row class-filter-row"><span class="filter-caption">CLASS</span>${grades.map(grade => `<button class="filter-chip ${classFilter === grade ? 'active' : ''}" data-action="filter-class" data-grade="${grade}">${grade}</button>`).join('')}</div>
    <div class="filter-row subject-filter-row">${subjects.map(subject => `<button class="filter-chip ${subjectFilter === subject ? 'active' : ''}" data-action="filter-subject" data-subject="${subject}">${subject}</button>`).join('')}<input id="syllabus-search" class="select-input" style="margin-left:auto;min-width:180px" placeholder="Find a chapter…" value="${escapeHTML(syllabusSearch)}" aria-label="Find a chapter"></div>
    <section class="panel"><div class="panel-head"><div><h3 class="panel-title">Your chapter matrix</h3><p class="panel-subtitle">Changes are saved automatically in this browser.</p></div><span class="tag">${chapters.length} SHOWN</span></div><div class="syllabus-table-wrap"><table class="syllabus-table"><thead><tr><th>Chapter</th><th class="status-cell">Lectures</th><th class="status-cell">Practice</th><th class="status-cell">Revision</th><th>Progress</th></tr></thead><tbody>${chapters.length ? chapters.map(chapter => {
      const progress = getChapterProgress(chapter);
      return `<tr><td><span class="chapter-title">${escapeHTML(chapter.name)}</span><span class="chapter-unit">${escapeHTML(chapter.grade || 'Class 11')} · ${escapeHTML(chapter.subject)}</span></td>${['lecture','practice','revision'].map(step => `<td class="status-cell"><input type="checkbox" class="state-check" data-action="chapter-check" data-id="${chapter.id}" data-step="${step}" ${chapter[step] ? 'checked' : ''} aria-label="${step} complete for ${escapeHTML(chapter.name)}"></td>`).join('')}<td><div class="chapter-progress"><span style="width:${progress.percent}%"></span></div><div class="chapter-percent">${progress.percent}%</div></td></tr>`;
    }).join('') : '<tr><td colspan="5" class="no-results">No chapters match that search.</td></tr>'}</tbody></table></div></section>`;
}

function timerSettings(mode = state.timer.mode) {
  return mode === 'focus' ? 25 * 60 : mode === 'short' ? 5 * 60 : 15 * 60;
}
function renderFocus() {
  const todaySessions = state.sessions.filter(session => session.date === todayKey());
  const todayMinutes = todaySessions.reduce((sum, session) => sum + safeNumber(session.minutes), 0);
  const todayTasks = getTodayTasks().filter(task => !task.done);
  return `
    <div class="page-intro"><div><div class="eyebrow">FOCUS ROOM</div><h2>Make a little room for deep work.</h2><p>Put your phone away, pick one task, and start. This timer records completed focus sessions in your local history.</p></div><div class="page-actions"><span class="tag green">NO SOCIAL FEED. NO NOISE.</span></div></div>
    <div class="focus-layout">
      <section class="timer-panel">
        <div class="timer-eyebrow">TIME WELL SPENT</div>
        <div class="timer-mode-switch"><button class="${state.timer.mode === 'focus' ? 'active' : ''}" data-action="timer-mode" data-mode="focus">Focus · 25m</button><button class="${state.timer.mode === 'short' ? 'active' : ''}" data-action="timer-mode" data-mode="short">Short break · 5m</button><button class="${state.timer.mode === 'long' ? 'active' : ''}" data-action="timer-mode" data-mode="long">Long break · 15m</button></div>
        <div class="timer-ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-track" cx="50" cy="50" r="45"></circle><circle class="ring-value" id="timer-ring-value" cx="50" cy="50" r="45" stroke-dasharray="282.74" stroke-dashoffset="0"></circle></svg><div><div class="timer-reading" id="timer-reading">${formatClock(state.timer.remaining)}</div><div class="timer-mode" id="timer-mode-caption">${state.timer.running ? 'You are in a session' : 'Ready when you are'}</div></div></div>
        <div class="timer-controls"><button class="button button-dark" id="timer-toggle" data-action="timer-toggle">${state.timer.running ? 'Ⅱ Pause' : '▶ Start focus'}</button><button class="button button-outline" data-action="timer-reset">↺ Reset</button></div>
        <div class="timer-caption">Finish the session to add it to your focus history.</div>
      </section>
      <div class="focus-side">
        <section class="panel"><div class="panel-head"><div><h3 class="panel-title">Pick your next task</h3><p class="panel-subtitle">A single target helps you begin.</p></div></div><div class="panel-body"><div class="focus-task-list">${todayTasks.length ? todayTasks.slice(0,5).map(task => `<label class="focus-task"><input type="radio" name="focus-task" value="${task.id}" ${state.timer.taskId === task.id ? 'checked' : ''} data-action="select-focus-task"><span><strong>${escapeHTML(task.title)}</strong><small>${escapeHTML(task.subject)} · ${task.minutes}m planned</small></span></label>`).join('') : '<div class="empty-state">No open tasks for today. Add one in your planner first.</div>'}</div><button class="text-link" data-action="add-task" style="margin-top:12px">+ Add a task</button></div></section>
        <section class="panel"><div class="panel-head"><div><h3 class="panel-title">Today's record</h3><p class="panel-subtitle">Your work, not your intentions.</p></div></div><div class="panel-body"><div class="session-stat"><span>Focus time logged</span><strong>${formatMinutes(todayMinutes)}</strong></div><div class="session-stat"><span>Sessions completed</span><strong>${todaySessions.length}</strong></div><div class="session-stat"><span>Daily target</span><strong>${formatMinutes(state.profile.dailyTarget)}</strong></div><div class="session-stat"><span>Left to target</span><strong>${formatMinutes(Math.max(0,state.profile.dailyTarget - todayMinutes))}</strong></div></div></section>
      </div>
    </div>`;
}
function formatClock(seconds) { const mins = Math.floor(Math.max(0,seconds) / 60); const secs = Math.max(0,seconds) % 60; return `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`; }
function updateTimerDisplay() {
  const reading = $('#timer-reading');
  if (!reading) return;
  reading.textContent = formatClock(state.timer.remaining);
  const max = timerSettings(state.timer.mode);
  const progress = Math.min(1, Math.max(0, state.timer.remaining / max));
  const ring = $('#timer-ring-value');
  if (ring) ring.style.strokeDashoffset = String(282.74 * (1 - progress));
  const toggle = $('#timer-toggle');
  if (toggle) toggle.textContent = state.timer.running ? 'Ⅱ Pause' : '▶ Start focus';
  const caption = $('#timer-mode-caption');
  if (caption) caption.textContent = state.timer.running ? 'You are in a session' : state.timer.remaining === 0 ? 'Session complete' : 'Ready when you are';
}
function startTimer() {
  if (state.timer.running) {
    state.timer.running = false;
    clearInterval(timerInterval);
    timerInterval = null;
    saveState();
    updateTimerDisplay();
    return;
  }
  if (state.timer.remaining <= 0) state.timer.remaining = timerSettings();
  state.timer.running = true;
  state.timer.startedAt = Date.now();
  saveState();
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    if (!state.timer.running) return;
    state.timer.remaining = Math.max(0, state.timer.remaining - 1);
    updateTimerDisplay();
    if (state.timer.remaining === 0) finishTimer();
  }, 1000);
}
function finishTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  const wasFocus = state.timer.mode === 'focus';
  state.timer.running = false;
  if (wasFocus) {
    state.sessions.push({ id: makeId(), date: todayKey(), minutes: 25, taskId: state.timer.taskId, finishedAt: new Date().toISOString() });
    showToast('Session complete. Twenty-five minutes, properly yours.');
  } else showToast('Break finished. Ready for another round?');
  state.timer.remaining = 0;
  saveState();
  renderPage();
  if ('Notification' in window && Notification.permission === 'granted') new Notification(wasFocus ? 'Daymark session complete' : 'Break finished', { body: wasFocus ? 'Your focus session has been logged.' : 'Time to get back to it.' });
}
function resetTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  state.timer.running = false;
  state.timer.remaining = timerSettings();
  state.timer.startedAt = null;
  saveState();
  updateTimerDisplay();
}

function renderTests() {
  const filteredTests = state.tests.filter(test => testFilter === 'All' || test.subject === testFilter);
  const average = state.tests.length ? Math.round(state.tests.reduce((sum, test) => sum + safeNumber(test.score) / Math.max(1,safeNumber(test.total)) * 100, 0) / state.tests.length) : 0;
  const totalMarks = state.tests.reduce((sum, test) => sum + safeNumber(test.score), 0);
  return `
    <div class="page-intro"><div><div class="eyebrow">PRACTICE & REFLECTION</div><h2>The useful part comes after the test.</h2><p>Log your attempts, then keep a short record of the mistakes you don't want to repeat.</p></div><div class="page-actions"><button class="button button-outline" data-action="add-mistake">+ Log mistake</button><button class="button button-dark" data-action="add-test">+ Add test</button></div></div>
    <section class="metric-grid"><article class="metric-card"><div class="metric-heading">Tests logged</div><div class="metric-value">${state.tests.length}</div><div class="metric-foot">Your practice history</div></article><article class="metric-card"><div class="metric-heading">Average accuracy</div><div class="metric-value">${average}%</div><div class="metric-foot">Across logged attempts</div></article><article class="metric-card"><div class="metric-heading">Mistakes to revisit</div><div class="metric-value">${state.mistakes.filter(item => !item.reviewed).length}</div><div class="metric-foot">Mark one reviewed after retrying</div></article></section>
    <div class="test-grid">
      <section class="panel"><div class="panel-head"><div><h3 class="panel-title">Test history</h3><p class="panel-subtitle">Scores make more sense as a trend.</p></div><select class="select-input" id="test-filter" aria-label="Filter tests">${['All','Physics','Chemistry','Mathematics','Biology'].map(subject => `<option ${testFilter === subject ? 'selected' : ''}>${subject}</option>`).join('')}</select></div><div class="panel-body"><div>${filteredTests.length ? [...filteredTests].sort((a,b) => b.date.localeCompare(a.date)).map(test => `<div class="test-row"><div><strong>${escapeHTML(test.name)}</strong><small>${escapeHTML(test.subject)} · ${dateLabel(new Date(`${test.date}T12:00:00`), { day: 'numeric', month: 'short', year: 'numeric' })}</small></div><div class="score-block"><strong>${test.score}<span style="display:inline;font:11px 'DM Sans',sans-serif"> / ${test.total}</span></strong><span>${Math.round(test.score / Math.max(1,test.total) * 100)}% score</span></div></div>`).join('') : '<div class="empty-state">No tests in this filter yet. Add your first attempt above.</div>'}</div></div></section>
      <section class="panel"><div class="panel-head"><div><h3 class="panel-title">Mistake notebook</h3><p class="panel-subtitle">A pattern is easier to fix when it has a name.</p></div><span class="tag orange">${state.mistakes.filter(item => !item.reviewed).length} TO REVIEW</span></div><div class="panel-body"><div>${state.mistakes.length ? [...state.mistakes].sort((a,b) => Number(a.reviewed)-Number(b.reviewed)).map(item => `<div class="mistake-item"><div class="mistake-top"><span class="tag type-${item.type.toLowerCase().replace(/\s+/g,'-')}">${escapeHTML(item.type)}</span><span class="tag">${escapeHTML(item.subject)}</span>${item.reviewed ? '<span class="tag green">Reviewed</span>' : ''}</div><strong>${escapeHTML(item.title)}</strong><p>${escapeHTML(item.note || 'No note added yet.')}</p><div class="mistake-footer"><span>${dateLabel(new Date(`${item.date}T12:00:00`))}</span><button class="text-link" data-action="toggle-mistake" data-id="${item.id}">${item.reviewed ? 'Undo review' : 'Mark reviewed ✓'}</button></div></div>`).join('') : '<div class="empty-state">No mistakes logged yet. The first one is useful data, not a failure.</div>'}</div></div></section>
    </div>`;
}

function renderPlanner() {
  const dates = weekDates();
  const total = state.tasks.filter(task => task.date >= todayKey(dates[0]) && task.date <= todayKey(dates[6])).length;
  const done = state.tasks.filter(task => task.date >= todayKey(dates[0]) && task.date <= todayKey(dates[6]) && task.done).length;
  return `
    <div class="page-intro"><div><div class="eyebrow">WEEKLY PLAN</div><h2>Make space for the important stuff.</h2><p>This is a simple plan, not a contract. Move things around when real life happens.</p></div><div class="page-actions"><button class="button button-dark" data-action="add-task">+ Plan a task</button></div></div>
    <section class="metric-grid"><article class="metric-card"><div class="metric-heading">Tasks this week</div><div class="metric-value">${total}</div><div class="metric-foot">Across all seven days</div></article><article class="metric-card"><div class="metric-heading">Completed</div><div class="metric-value">${done}</div><div class="metric-foot">${total ? Math.round(done/total*100) : 0}% of planned tasks</div></article><article class="metric-card"><div class="metric-heading">Planned study time</div><div class="metric-value">${formatMinutes(state.tasks.filter(task => task.date >= todayKey(dates[0]) && task.date <= todayKey(dates[6])).reduce((sum,task)=>sum+safeNumber(task.minutes),0))}</div><div class="metric-foot">Time you’ve set aside</div></article></section>
    <section class="planner-week">${dates.map(date => {
      const key = todayKey(date);
      const tasks = state.tasks.filter(task => task.date === key);
      return `<div class="planner-day ${key === todayKey() ? 'today' : ''}"><div class="planner-day-head"><span>${dayLabel(date)}</span><strong>${date.getDate()}</strong></div>${tasks.map(task => `<div class="planner-task ${task.done ? 'done' : ''}" title="Click to mark ${task.done ? 'open' : 'done'}" data-action="complete-task" data-id="${task.id}"><strong>${escapeHTML(task.title)}</strong><small>${task.minutes} MIN · ${escapeHTML(task.subject)}</small></div>`).join('')}<button class="planner-add" data-action="add-task-date" data-date="${key}">+ Add</button></div>`;
    }).join('')}</section>
    <p class="planner-note"><span>↳</span><span>${done === total ? 'A clear week. Leave room for rest and unexpected things, too.' : `${total - done} task${total-done === 1 ? '' : 's'} left to work through. Tap a task on the board to mark it complete.`}</span></p>`;
}

function renderInsights() {
  const dates = weekDates();
  const values = dates.map(date => state.sessions.filter(session => session.date === todayKey(date)).reduce((sum, session) => sum + safeNumber(session.minutes), 0));
  const max = Math.max(state.profile.dailyTarget, ...values, 1);
  const maxWeek = Math.max(...values, 0);
  const subjects = (state.profile.exam === 'NEET' ? ['Physics','Chemistry','Biology'] : ['Physics','Chemistry','Mathematics']);
  const testAccuracy = state.tests.length ? Math.round(state.tests.reduce((sum,test)=>sum + safeNumber(test.score)/Math.max(1,safeNumber(test.total))*100,0) / state.tests.length) : null;
  const highestSubject = subjects.map(subject => ({ subject, percent: getSubjectProgress(subject) })).sort((a,b)=>b.percent-a.percent)[0];
  return `
    <div class="page-intro"><div><div class="eyebrow">YOUR DATA, MADE USEFUL</div><h2>Look for patterns, not perfection.</h2><p>These numbers reflect what you have logged here. They are a mirror, not a prediction of your rank.</p></div><div class="page-actions"><button class="button button-outline" data-action="export">Export data ↗</button></div></div>
    <section class="metric-grid"><article class="metric-card"><div class="metric-heading">Focus this week</div><div class="metric-value">${formatMinutes(values.reduce((a,b)=>a+b,0))}</div><div class="metric-foot">${formatMinutes(state.profile.dailyTarget*7)} weekly target</div></article><article class="metric-card"><div class="metric-heading">Average test score</div><div class="metric-value">${testAccuracy === null ? '—' : `${testAccuracy}%`}</div><div class="metric-foot">${testAccuracy === null ? 'Log a test to start a trend' : `${state.tests.length} attempts recorded`}</div></article><article class="metric-card"><div class="metric-heading">Strongest syllabus progress</div><div class="metric-value">${highestSubject ? `${highestSubject.percent}%` : '—'}</div><div class="metric-foot">${highestSubject?.subject || 'No subject yet'}</div></article></section>
    <div class="insight-grid"><section class="panel"><div class="panel-head"><div><h3 class="panel-title">Focus across the week</h3><p class="panel-subtitle">Minutes from sessions you completed.</p></div><span class="tag">${maxWeek ? `Peak ${formatMinutes(maxWeek)}` : 'NO SESSIONS YET'}</span></div><div class="big-chart"><div class="chart-bars">${dates.map((date,i)=>`<div class="chart-col"><span class="bar-value">${values[i] ? values[i] : ''}</span><div class="bar ${todayKey(date) === todayKey() ? 'current' : ''}" style="height:${Math.max(values[i] ? 4 : 2, values[i]/max*160)}px" title="${values[i]} minutes"></div><span class="bar-label">${dayLabel(date).slice(0,1)}</span></div>`).join('')}</div><div class="mini-legend" style="margin-top:26px"><span><i class="legend-dot"></i>Logged focus time</span><span>${formatMinutes(values.reduce((a,b)=>a+b,0))} total</span></div></div></section>
      <section class="panel"><div class="panel-head"><div><h3 class="panel-title">Syllabus by subject</h3><p class="panel-subtitle">Learning + practice + revision.</p></div></div><div class="panel-body"><div class="subject-progress-list">${subjects.map(subject=>`<div class="subject-progress-row"><span class="subject-stamp ${subjectMeta[subject].className}">${subjectMeta[subject].stamp}</span><div><strong>${subject}</strong><div class="progress-track"><span style="width:${getSubjectProgress(subject)}%"></span></div><small>${Object.values(state.chapters).filter(ch=>ch.subject===subject && getChapterProgress(ch).done===3).length} chapters fully wrapped</small></div><span class="percent">${getSubjectProgress(subject)}%</span></div>`).join('')}</div></div></section>
    </div>
    <div class="insight-note"><span class="note-mark">✳</span><div><strong>${maxWeek ? 'Consistency comes from returning.' : 'Your baseline starts with the next session.'}</strong><p>${maxWeek ? 'A lighter day is not lost time. Use the chart to spot what your real week looks like, then plan for that week—not an imaginary one.' : 'Start a timer in Focus Room and finish one session. Your first real pattern will appear here after a few days of logging.'}</p></div></div>`;
}

function addTask(date = todayKey()) {
  const title = prompt('What do you want to work on?');
  if (!title || !title.trim()) return;
  const subject = prompt('Subject (Physics, Chemistry, Mathematics, Biology or General):', 'General') || 'General';
  const minutesInput = prompt('How many minutes will you set aside?', '30');
  const minutes = Math.max(5, Math.min(600, safeNumber(minutesInput, 30)));
  state.tasks.push({ id: makeId(), title: title.trim(), subject: subject.trim(), date, minutes, done: false });
  saveState(); renderPage(); showToast('Task added to your plan.');
}
function addChapter() {
  const name = prompt('Chapter or topic name');
  if (!name || !name.trim()) return;
  const subject = prompt('Which subject? (Physics, Chemistry, Mathematics or Biology)', 'Physics');
  if (!subject) return;
  const normalized = Object.keys(subjectMeta).find(item => item.toLowerCase() === subject.trim().toLowerCase());
  if (!normalized) { showToast('Use Physics, Chemistry, Mathematics or Biology for the subject.'); return; }
  const suggestedGrade = classFilter === 'Class 12' ? 'Class 12' : 'Class 11';
  const gradeInput = prompt('Which class? Enter Class 11 or Class 12', suggestedGrade) || suggestedGrade;
  const grade = gradeInput.trim().toLowerCase() === 'class 12' ? 'Class 12' : gradeInput.trim().toLowerCase() === 'class 11' ? 'Class 11' : '';
  if (!grade) { showToast('Enter Class 11 or Class 12.'); return; }
  const id = `${grade === 'Class 12' ? 'class12-' : ''}${normalized.toLowerCase()}-custom-${makeId()}`;
  state.chapters[id] = { id, grade, subject: normalized, name: name.trim(), lecture: false, practice: false, revision: false, custom: true };
  saveState(); renderPage(); showToast('Chapter added to your syllabus.');
}
function addTest() {
  const name = prompt('Test name');
  if (!name || !name.trim()) return;
  const subject = prompt('Subject (Physics, Chemistry, Mathematics, Biology or General)', 'Physics') || 'General';
  const score = safeNumber(prompt('Marks scored', '0'), 0);
  const total = safeNumber(prompt('Total marks', '100'), 100);
  if (total <= 0 || score < 0 || score > total) { showToast('Check the score and total marks, then try again.'); return; }
  const date = prompt('Date (YYYY-MM-DD)', todayKey()) || todayKey();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { showToast('Use a date in YYYY-MM-DD format.'); return; }
  state.tests.push({ id: makeId(), name: name.trim(), subject: subject.trim(), score, total, date });
  saveState(); renderPage(); showToast('Test result saved.');
}
function addMistake() {
  const title = prompt('What went wrong? Give the mistake a short name.');
  if (!title || !title.trim()) return;
  const note = prompt('What will help you avoid it next time?', '') || '';
  const subject = prompt('Subject (Physics, Chemistry, Mathematics, Biology or General)', 'Physics') || 'General';
  const typeInput = prompt('Type: Silly, Conceptual, Calculation or Time', 'Conceptual') || 'Conceptual';
  const types = ['Silly','Conceptual','Calculation','Time'];
  const type = types.find(item => item.toLowerCase() === typeInput.trim().toLowerCase()) || 'Conceptual';
  state.mistakes.push({ id: makeId(), title: title.trim(), note: note.trim(), subject: subject.trim(), type, date: todayKey(), reviewed: false });
  saveState(); renderPage(); showToast('Mistake saved for your next review.');
}
function toggleTask(id) {
  const task = state.tasks.find(item => item.id === id);
  if (!task) return;
  task.done = !task.done;
  saveState(); renderPage();
}
function toggleChapter(id, step, checked) {
  if (!state.chapters[id] || !['lecture','practice','revision'].includes(step)) return;
  state.chapters[id][step] = checked;
  saveState();
  const scrollTop = window.scrollY;
  renderPage();
  window.scrollTo({ top: scrollTop, behavior: 'instant' });
}
function toggleMistake(id) {
  const item = state.mistakes.find(mistake => mistake.id === id);
  if (!item) return;
  item.reviewed = !item.reviewed;
  saveState(); renderPage();
}
function exportData() {
  const blob = new Blob([JSON.stringify({ app: 'Daymark', version: 1, exportedAt: new Date().toISOString(), state }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `daymark-backup-${todayKey()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('Your backup file is ready.');
}
async function importDataFile(file) {
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const incoming = parsed.state || parsed;
    if (!incoming || !incoming.profile || !incoming.chapters || !Array.isArray(incoming.tasks)) throw new Error('That file does not look like a Daymark backup.');
    state = {
      ...createDefaultState(), ...incoming,
      profile: { ...createDefaultState().profile, ...(incoming.profile || {}) },
      chapters: { ...createDefaultState().chapters, ...(incoming.chapters || {}) },
      tasks: incoming.tasks || [], tests: incoming.tests || [], mistakes: incoming.mistakes || [], sessions: incoming.sessions || [],
      timer: { ...createDefaultState().timer, ...(incoming.timer || {}), running: false }
    };
    saveState();
    $('#settings-dialog').close();
    renderPage();
    showToast('Backup restored in this browser.');
  } catch (error) {
    showToast(error.message || 'Could not read that backup file.');
  }
}
function openSettings() {
  $('#setting-name').value = state.profile.name || '';
  $('#setting-exam').value = state.profile.exam || 'JEE Main';
  $('#setting-year').value = state.profile.year || '2027';
  $('#setting-target').value = state.profile.dailyTarget || 180;
  $('#settings-dialog').showModal();
}
function saveSettings() {
  state.profile.name = $('#setting-name').value.trim() || 'Aspirant';
  state.profile.exam = $('#setting-exam').value;
  state.profile.year = $('#setting-year').value;
  state.profile.dailyTarget = Math.max(15, Math.min(900, safeNumber($('#setting-target').value, 180)));
  if (state.profile.exam === 'NEET') subjectFilter = 'All';
  saveState();
  $('#settings-dialog').close();
  renderPage();
  showToast('Your workspace has been updated.');
}

// One delegated listener keeps actions working when each page is re-rendered.
document.addEventListener('click', event => {
  const target = event.target.closest('[data-action], [data-page]');
  if (!target) return;
  if (target.matches('[data-page]')) {
    setPage(target.dataset.page);
    return;
  }
  const action = target.dataset.action;
  switch (action) {
    case 'page': setPage(target.dataset.page); break;
    case 'focus': setPage('focus'); break;
    case 'add-task': addTask(); break;
    case 'add-task-date': addTask(target.dataset.date); break;
    case 'add-chapter': addChapter(); break;
    case 'add-test': addTest(); break;
    case 'add-mistake': addMistake(); break;
    case 'complete-task': toggleTask(target.dataset.id); break;
    case 'toggle-mistake': toggleMistake(target.dataset.id); break;
    case 'filter-subject': subjectFilter = target.dataset.subject; renderPage(); break;
    case 'filter-class': classFilter = target.dataset.grade; renderPage(); break;
    case 'theme-toggle': toggleTheme(); break;
    case 'timer-mode':
      clearInterval(timerInterval); timerInterval = null; state.timer.running = false;
      state.timer.mode = target.dataset.mode; state.timer.remaining = timerSettings(); saveState(); renderPage(); break;
    case 'timer-reset': resetTimer(); break;
    case 'timer-toggle': startTimer(); break;
    case 'export': exportData(); break;
  }
});

document.addEventListener('change', event => {
  const target = event.target;
  if (target.matches('[data-action="toggle-task"]')) toggleTask(target.dataset.id);
  if (target.matches('[data-action="chapter-check"]')) toggleChapter(target.dataset.id, target.dataset.step, target.checked);
  if (target.matches('[data-action="select-focus-task"]')) { state.timer.taskId = target.value; saveState(); }
  if (target.id === 'test-filter') { testFilter = target.value; renderPage(); }
  if (target.id === 'import-file') importDataFile(target.files?.[0]);
});

document.addEventListener('input', event => {
  if (event.target.id !== 'syllabus-search') return;
  const start = event.target.selectionStart;
  syllabusSearch = event.target.value;
  const scrollTop = window.scrollY;
  renderPage();
  const input = $('#syllabus-search');
  input?.focus();
  input?.setSelectionRange(start, start);
  window.scrollTo({ top: scrollTop, behavior: 'instant' });
});

$('#quick-focus').addEventListener('click', () => setPage('focus'));
$('#open-settings').addEventListener('click', openSettings);
$('#mobile-menu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$('#save-settings').addEventListener('click', saveSettings);
$('#export-data').addEventListener('click', exportData);
$('#import-data').addEventListener('click', () => $('#import-file').click());
$('#reset-data').addEventListener('click', () => {
  if (!confirm('Reset Daymark on this browser? Export a backup first if you want to keep your data.')) return;
  clearInterval(timerInterval); timerInterval = null;
  state = createDefaultState(); saveState(); $('#settings-dialog').close(); renderPage(); showToast('Workspace reset. Fresh page.');
});

window.addEventListener('beforeunload', () => {
  if (state.timer.running) {
    state.timer.running = false;
    saveState();
  }
});

// Keep the date and top-level counts accurate if the tab stays open overnight.
setInterval(() => {
  if (Date.now() - lastSavedAt > 5000) updateFrame();
}, 60000);

applyTheme();
updateFrame();
renderPage();
