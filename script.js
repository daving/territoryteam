const BASE_ID = 'appwHGvBZYKK19CTU';
const STORAGE_KEY = 'territoryteam.selectedUser';
const API_ROOT = 'https://territoryteam-api.daving.workers.dev/api';

const state = { users: [], tasks: [], taskTypes: new Map(), me: null };

const $ = (id) => document.getElementById(id);
const overlay = $('loadingOverlay');

function showLoading(on) { overlay.classList.toggle('hidden', !on); }

async function api(path, options = {}) {
  const res = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function onlyOpen(sectionName) {
  document.querySelectorAll('.panel').forEach((el) => {
    el.classList.toggle('hidden', el.dataset.section !== sectionName);
  });
}

function hasAssigned(userId) {
  return state.tasks.some((t) => (t.researcherId === userId && t.status === 'In progress') || (t.checkerId === userId && t.status === 'Done'));
}

function myTasks(userId) {
  return state.tasks.filter((t) => (t.researcherId === userId && t.status === 'In progress') || (t.checkerId === userId && t.status === 'Done'));
}

function taskCard(task, action, disabled = false) {
  return `<button class="task-btn" data-action="${action}" data-id="${task.id}" ${disabled ? 'disabled' : ''}><span class="task-title">${task.type}</span>${task.description}<div class="meta">${task.territory}</div></button>`;
}

async function loadData() {
  showLoading(true);
  try {
    const [users, tasks, tasktypes] = await Promise.all([api('/users'), api('/tasks'), api('/tasktypes')]);
    state.users = users.records.map((r) => ({ id: r.id, name: r.fields.Name, level: Number(r.fields.level || 1) }));
    state.taskTypes = new Map(tasktypes.records.map((r) => [r.id, { name: r.fields.name || 'Unknown', level: Number(r.fields.level || 0) }]));
    state.tasks = tasks.records.map((r) => {
      const typeId = (r.fields.Type || [])[0];
      const type = state.taskTypes.get(typeId) || { name: 'Unknown', level: 0 };
      return {
        id: r.id,
        territory: r.fields.Territory || '',
        description: r.fields['task description'] || '',
        status: r.fields.Status || 'Todo',
        researcherId: (r.fields.Researcher || [])[0] || null,
        checkerId: (r.fields.Checker || [])[0] || null,
        type: type.name,
        typeLevel: type.level
      };
    });
  } finally {
    showLoading(false);
  }
}

function renderUsers() {
  $('userList').innerHTML = state.users.map((u) => `<button class="user-btn" data-user-id="${u.id}"><strong>${u.name}</strong><div class="meta">Level ${u.level}</div></button>`).join('');
}

function renderInbox() {
  if (!state.me) return;
  const locked = hasAssigned(state.me.id);
  $('inboxLock').classList.toggle('hidden', !locked);
  $('inboxLock').textContent = locked ? 'You already have a task checked out. Complete it in My tasks first.' : '';

  const research = state.tasks.filter((t) => t.status === 'Todo' && t.typeLevel <= state.me.level).slice(0, 5);
  const verify = state.me.level > 1 ? state.tasks.filter((t) => t.status === 'Done').slice(0, 5) : [];

  $('researchList').innerHTML = research.map((t) => taskCard(t, 'claim-research', locked)).join('');
  $('verifyList').innerHTML = verify.map((t) => taskCard(t, 'claim-verify', locked)).join('');
}

function renderMyTasks() {
  if (!state.me) return;
  $('myTasksList').innerHTML = myTasks(state.me.id).map((t) => taskCard(t, 'complete')).join('') || '<p class="meta">No assigned tasks.</p>';
}

function showMe() {
  $('currentUserLabel').textContent = state.me ? state.me.name : 'No user';
}

function confirmAction(message) {
  return new Promise((resolve) => {
    const dialog = $('confirmDialog');
    $('confirmText').textContent = message;
    dialog.showModal();
    $('confirmOk').onclick = () => { dialog.close(); resolve(true); };
    $('confirmCancel').onclick = () => { dialog.close(); resolve(false); };
  });
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
  renderUsers();

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) state.me = state.users.find((u) => u.id === saved) || null;

  showMe();
  renderInbox();
  renderMyTasks();

  if (!state.me) onlyOpen('user');
  else onlyOpen(hasAssigned(state.me.id) ? 'tasks' : 'inbox');
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

  const userId = btn.dataset.userId;
  if (userId) {
    state.me = state.users.find((u) => u.id === userId) || null;
    localStorage.setItem(STORAGE_KEY, userId);
    showMe();
    renderInbox();
    renderMyTasks();
    onlyOpen(hasAssigned(userId) ? 'tasks' : 'inbox');
    return;
  }

  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (!action || !id || !state.me) return;

  if (action === 'claim-research' && await confirmAction('Claim this research task?')) {
    await patchTask(id, { Researcher: [state.me.id], Status: 'In progress' });
    onlyOpen('tasks');
  }

  if (action === 'claim-verify' && await confirmAction('Claim this verification task?')) {
    await patchTask(id, { Checker: [state.me.id] });
    onlyOpen('tasks');
  }

  if (action === 'complete' && await confirmAction('Complete this task?')) {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;
    if (task.status === 'In progress') await patchTask(id, { Status: 'Done' });
    else if (task.status === 'Done') await patchTask(id, { Status: 'Verified' });
    onlyOpen(hasAssigned(state.me.id) ? 'tasks' : 'inbox');
  }

  renderInbox();
  renderMyTasks();
});

boot().catch((err) => {
  console.error(err);
  alert('Failed to load data from API proxy. Check worker deployment and env vars.');
});

window.__appConfig = { BASE_ID, API_ROOT, STORAGE_KEY };