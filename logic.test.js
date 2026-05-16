import test from 'node:test';
import assert from 'node:assert/strict';

function hasAssigned(userId, tasks) {
  return tasks.some((t) => (t.researcherId === userId && t.status === 'In progress') || (t.checkerId === userId && t.status === 'Verifying'));
}

function verifyTasksForUser(user, tasks) {
  if (!user || user.level <= 1) return [];
  return tasks.filter((t) => t.status === 'Done' && (user.level > 2 || t.researcherId !== user.id));
}

function completedResearchCountLast24h(userId, tasks, now) {
  const cutoff = now - (24 * 60 * 60 * 1000);
  return tasks.filter((t) => t.researcherId === userId && t.doneTime && Date.parse(t.doneTime) >= cutoff).length;
}

test('hasAssigned matches both researcher and checker states', () => {
  const tasks = [
    { researcherId: 'u1', checkerId: null, status: 'In progress' },
    { researcherId: null, checkerId: 'u1', status: 'Verifying' }
  ];
  assert.equal(hasAssigned('u1', tasks), true);
  assert.equal(hasAssigned('u2', tasks), false);
});

test('verify queue excludes own researched tasks for level 2 users only', () => {
  const tasks = [
    { id: 't1', researcherId: 'u2', status: 'Done' },
    { id: 't2', researcherId: 'u3', status: 'Done' }
  ];
  const level2 = verifyTasksForUser({ id: 'u2', level: 2 }, tasks);
  const level3 = verifyTasksForUser({ id: 'u2', level: 3 }, tasks);

  assert.deepEqual(level2.map((t) => t.id), ['t2']);
  assert.deepEqual(level3.map((t) => t.id), ['t1', 't2']);
});

test('completedResearchCountLast24h counts only last day completions by researcher', () => {
  const now = Date.parse('2026-05-15T12:00:00.000Z');
  const tasks = [
    { researcherId: 'u1', doneTime: '2026-05-15T11:59:00.000Z' },
    { researcherId: 'u1', doneTime: '2026-05-14T12:01:00.000Z' },
    { researcherId: 'u1', doneTime: '2026-05-14T11:59:00.000Z' },
    { researcherId: 'u2', doneTime: '2026-05-15T11:00:00.000Z' }
  ];
  assert.equal(completedResearchCountLast24h('u1', tasks, now), 2);
});
