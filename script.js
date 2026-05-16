const BASE_ID = 'appwHGvBZYKK19CTU';
const STORAGE_KEY = 'territoryteam.selectedUser';
const API_ROOT = 'https://territoryteam-api.daving.workers.dev/api';
const APP_VERSION = '1.2.2';
const MAX_RESEARCH_COMPLETIONS_PER_DAY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

const state = { users: [], tasks: [], taskTypes: new Map(), me: null, activeSection: 'user' };

const $ = (id) => document.getElementById(id);
const overlay = $('loadingOverlay');

function showLoading(on) { overlay.classList.toggle('d-none', !on); }

async function api(path, options = {}) {
  const res = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function onlyOpen(sectionName) {
  state.activeSection = sectionName;
  document.querySelectorAll('.app-section').forEach((section) => section.classList.toggle('is-active', section.dataset.section === sectionName));
}

function hasAssigned(userId) {
  return state.tasks.some((t) => (t.researcherId === userId && t.status === 'In progress') || (t.checkerId === userId && t.status === 'Verifying'));
}

function myTasks(userId) {
  return state.tasks.filter((t) => (t.researcherId === userId && t.status === 'In progress') || (t.checkerId === userId && t.status === 'Verifying'));
}

function completedResearchCountLast24h(userId) {
  const cutoff = Date.now() - DAY_MS;
  return state.tasks.filter((t) => t.researcherId === userId && t.doneTime && Date.parse(t.doneTime) >= cutoff).length;
}

function taskCard(task, action, disabled = false, queueLabel = '', actionLabel = 'Check Out') {
  const queue = queueLabel ? `<span class="badge text-bg-info">${queueLabel}</span>` : '';
  const typeHelp = task.typeDescription
    ? `<button type="button" class="btn btn-sm btn-outline-secondary rounded-circle" data-action="show-type-help" data-help-title="${encodeURIComponent(task.type || 'Task type')}" data-help-text="${encodeURIComponent(task.typeDescription)}" title="Show full task type instructions" aria-label="Show task type help">?</button>`
    : '';
  const statusLabel = task.status === 'Done' ? 'Needs verification' : task.status;
  const statusBadgeClass = task.status === 'Todo' ? 'text-bg-secondary' : task.status === 'In progress' ? 'text-bg-warning' : task.status === 'Done' ? 'text-bg-primary' : 'text-bg-success';
  const hasResearchNotes = Boolean((task.researchNotes || '').trim());
  const showResearchNotes = hasResearchNotes && (action === 'claim-verify' || queueLabel === 'To Verify');
  const researchNotesButton = showResearchNotes
    ? `<button class="btn btn-sm btn-pink" data-action="show-research-notes" data-notes="${encodeURIComponent(task.researchNotes)}" title="Open research notes saved by the researcher">Research Notes</button>`
    : '';
  return `<div class="col"><article class="card h-100"><div class="card-header d-flex justify-content-between align-items-center gap-2"><div class="fw-semibold">Task Type: ${task.type || 'Task'}</div>${typeHelp}</div><div class="card-body d-flex flex-column gap-2">${queue}<span class="badge ${statusBadgeClass} align-self-start" title="Current task status shown in app">${statusLabel}</span><div class="task-desc">${task.description || ''}</div>${researchNotesButton}<div class="text-body-secondary small">Territory ${task.territory}</div><button class="btn btn-outline-primary mt-auto" data-action="${action}" data-id="${task.id}" ${disabled ? 'disabled' : ''} title="${actionLabel} this task">${actionLabel}</button></div></article></div>`;
}

function pickField(fields, keys, fallback = '') {
  for (const key of keys) {
    if (fields[key] !== undefined && fields[key] !== null && fields[key] !== '') return fields[key];
  }
  return fallback;
}

async function loadData() {
  showLoading(true);
  try {
    const [users, tasks, tasktypes] = await Promise.all([api('/users'), api('/tasks'), api('/tasktypes')]);
    state.users = users.records.map((r) => ({ id: r.id, name: r.fields.Name, level: Number(r.fields.level || 1) }));
    state.taskTypes = new Map(tasktypes.records.map((r) => {
      const typeName = pickField(r.fields, ['name', 'Name'], 'Task');
      return [r.id, {
        name: typeName,
        level: Number(pickField(r.fields, ['level', 'Level'], 0)),
        description: pickField(r.fields, ['description', 'Description'], '')
      }];
    }));
    state.tasks = tasks.records.map((r) => {
      const rawType = r.fields.Type || r.fields.type || null;
      const typeId = Array.isArray(rawType) ? rawType[0] : rawType;
      const typeById = state.taskTypes.get(typeId);
      const typeByName = [...state.taskTypes.values()].find((candidate) => candidate.name === typeId);
      const type = typeById || typeByName || { name: 'Task', level: 0, description: '' };
      return {
        id: r.id,
        territory: r.fields.Territory || '',
        description: r.fields['task description'] || '',
        status: r.fields.Status || 'Todo',
        researcherId: (r.fields.Researcher || [])[0] || null,
        checkerId: (r.fields.Checker || [])[0] || null,
        type: type.name,
        typeLevel: type.level,
        typeDescription: type.description,
        doneTime: r.fields.done_time || null,
        researchNotes: r.fields['research notes'] || ''
      };
    });
  } finally {
    showLoading(false);
  }
}

function renderUsers() {
  $('userList').innerHTML = state.users.map((u) => `<div class="col"><button class="btn btn-outline-primary w-100 text-start" data-user-id="${u.id}" title="Choose ${u.name}"><strong>${u.name}</strong></button></div>`).join('');
}

function renderInbox() {
  if (!state.me) return;
  const locked = hasAssigned(state.me.id);
  const completedInLast24h = completedResearchCountLast24h(state.me.id);
  const maxedOut = completedInLast24h >= MAX_RESEARCH_COMPLETIONS_PER_DAY;

  $('inboxLock').classList.toggle('d-none', !(locked || maxedOut));
  if (locked) $('inboxLock').textContent = 'You already have a task checked out. Complete it in My tasks first.';
  else if (maxedOut) $('inboxLock').textContent = 'Thank you so much for completing these tasks! check back tomorrow to continue helping out.';

  const research = state.tasks.filter((t) => t.status === 'Todo').slice(0, 5);
  const verify = state.me.level > 1
    ? state.tasks.filter((t) => t.status === 'Done' && (state.me.level > 2 || t.researcherId !== state.me.id)).slice(0, 5)
    : [];

  const researchDisabled = locked || maxedOut;
  $('researchList').innerHTML = research.map((t) => taskCard(t, 'claim-research', researchDisabled)).join('') || '<p class="text-body-secondary small">No research tasks available.</p>';
  $('verifyList').innerHTML = verify.map((t) => taskCard(t, 'claim-verify', locked)).join('') || '<p class="text-body-secondary small">No verify tasks available.</p>';
}

function renderMyTasks() {
  if (!state.me) return;
  const queueLabelForTask = (t) => {
    if (t.researcherId === state.me.id && t.status === 'In progress') return 'To Research';
    if (t.checkerId === state.me.id && t.status === 'Verifying') return 'To Verify';
    return '';
  };

  $('myTasksList').innerHTML = myTasks(state.me.id).map((t) => taskCard(t, 'complete', false, queueLabelForTask(t), 'Complete')).join('') || '<p class="text-body-secondary small">No assigned tasks.</p>';
}

function showMe() { $('currentUserLabel').textContent = state.me ? state.me.name : 'No user'; }

function confirmAction(message, options = {}) {
  return new Promise((resolve) => {
    const modalEl = $('confirmModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const notesLabel = options.notesLabel || 'Notes';
    const showNotes = options.showNotes !== false;
    const confirmNotes = $('confirmNotes');
    const confirmNotesLabel = document.querySelector('label[for="confirmNotes"]');
    const confirmNotesGroup = $('confirmNotesGroup');

    $('confirmText').textContent = message;
    confirmNotesGroup.classList.toggle('d-none', !showNotes);

    if (showNotes) {
      confirmNotesLabel.textContent = notesLabel;
      confirmNotes.value = options.defaultNotes || '';
      confirmNotes.placeholder = options.notesPlaceholder || 'Optional notes';
    } else {
      confirmNotes.value = '';
    }

    $('confirmOk').onclick = () => { modal.hide(); resolve({ confirmed: true, notes: confirmNotes.value.trim() }); };
    $('confirmCancel').onclick = () => { resolve({ confirmed: false, notes: '' }); };
    modal.show();
    if (showNotes) confirmNotes.focus();
    else $('confirmOk').focus();
  });
}

function showTypeHelp(title, description) {
  $('helpTitle').textContent = decodeURIComponent(title);
  const parsed = decodeURIComponent(description || '');
  const markdownHtml = renderHelpMarkdown(parsed);
  const sanitized = sanitizeHelpHtml(markdownHtml);
  $('helpDescription').innerHTML = sanitized;
  const modal = bootstrap.Modal.getOrCreateInstance($('helpModal'));
  modal.show();
}

function sanitizeHelpHtml(input) {
  if (window.DOMPurify) {
    return window.DOMPurify.sanitize(String(input || ''), {
      ALLOWED_TAGS: ['p', 'br', 'ul', 'ol', 'li', 'em', 'strong', 'b', 'i', 'a', 'code', 'pre', 'blockquote', 'hr'],
      ALLOWED_ATTR: ['href', 'target', 'rel']
    });
  }

  const template = document.createElement('template');
  template.innerHTML = String(input || '');
  const allowedTags = new Set(['P', 'BR', 'UL', 'OL', 'LI', 'EM', 'STRONG', 'B', 'I', 'A', 'CODE']);

  const walk = (node) => {
    [...node.children].forEach((child) => {
      if (!allowedTags.has(child.tagName)) {
        child.replaceWith(document.createTextNode(child.textContent || ''));
        return;
      }

      [...child.attributes].forEach((attr) => {
        if (child.tagName === 'A' && attr.name === 'href') {
          const href = child.getAttribute('href') || '';
          const isSafeHref = /^https?:\/\//i.test(href) || href.startsWith('mailto:');
          if (!isSafeHref) child.removeAttribute('href');
          else {
            child.setAttribute('target', '_blank');
            child.setAttribute('rel', 'noopener noreferrer');
          }
          return;
        }
        child.removeAttribute(attr.name);
      });

      walk(child);
    });
  };

  walk(template.content);
  return template.innerHTML;
}

function renderHelpMarkdown(input) {
  const raw = String(input || '');
  if (window.marked?.parse) {
    return window.marked.parse(raw, { breaks: true, gfm: true });
  }

  return raw
    .split(/\n{2,}/)
    .map((chunk) => `<p>${chunk.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

async function patchTask(id, fields) {
  showLoading(true);
  try {
    await api(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ fields }) });
    await loadData();
  } finally {
    showLoading(false);
  }
}

async function boot() {
  await loadData();
  $('appVersion').textContent = `v${APP_VERSION}`;
  renderUsers();
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) state.me = state.users.find((u) => u.id === saved) || null;
  showMe(); renderInbox(); renderMyTasks();
  if (!state.me) onlyOpen('user'); else onlyOpen(hasAssigned(state.me.id) ? 'tasks' : 'inbox');
}

document.addEventListener('click', async (event) => {
  const btn = event.target.closest('button');
  if (!btn) return;

  if (btn.id === 'resetBtn') {
    localStorage.removeItem(STORAGE_KEY);
    state.me = null;
    showMe();
    renderUsers();
    onlyOpen('user');
    return;
  }

  const section = btn.dataset.open;
  if (section) { onlyOpen(section); return; }

  if (btn.dataset.action === 'show-type-help') {
    showTypeHelp(btn.dataset.helpTitle || 'Task type', btn.dataset.helpText || '');
    return;
  }

  if (btn.dataset.action === 'show-research-notes') {
    showTypeHelp('Research Notes', btn.dataset.notes || '');
    return;
  }

  const userId = btn.dataset.userId;
  if (userId) {
    state.me = state.users.find((u) => u.id === userId) || null;
    localStorage.setItem(STORAGE_KEY, userId);
    showMe(); renderInbox(); renderMyTasks();
    onlyOpen(hasAssigned(userId) ? 'tasks' : 'inbox');
    return;
  }

  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (!action || !id || !state.me) return;

  if (action === 'claim-research') {
    const { confirmed } = await confirmAction('Claim this research task?', { showNotes: false });
    if (confirmed) {
      await patchTask(id, { Researcher: [state.me.id], Status: 'In progress' });
      onlyOpen('tasks');
    }
  }

  if (action === 'claim-verify') {
    const { confirmed } = await confirmAction('Claim this verification task?', { showNotes: false });
    if (confirmed) {
      await patchTask(id, { Checker: [state.me.id], Status: 'Verifying' });
      onlyOpen('tasks');
    }
  }

  if (action === 'complete') {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;

    if (task.status === 'In progress') {
      const { confirmed, notes } = await confirmAction('Are you sure? Add notes below if you want.', { notesLabel: 'Notes' });
      if (confirmed) await patchTask(id, { Status: 'Done', done_time: new Date().toISOString(), 'research notes': notes });
    } else if (task.status === 'Verifying') {
      const { confirmed, notes } = await confirmAction('Are you sure? Add notes below if you want.', { notesLabel: 'Notes' });
      if (confirmed) await patchTask(id, { Status: 'Verified', 'checker notes': notes });
    }

    onlyOpen(hasAssigned(state.me.id) ? 'tasks' : 'inbox');
  }

  renderInbox();
  renderMyTasks();
});

boot().catch((err) => {
  console.error(err);
  alert('Failed to load data from API proxy. Check worker deployment and env vars.');
});

window.__appConfig = { BASE_ID, API_ROOT, STORAGE_KEY, APP_VERSION };
