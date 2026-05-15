import test from 'node:test';
import assert from 'node:assert/strict';

function hasAssigned(userId, tasks) {
  return tasks.some((t) => (t.researcherId === userId && t.status === 'In progress') || (t.checkerId === userId && t.status === 'Done'));
}

test('hasAssigned matches both researcher and checker states', () => {
  const tasks = [
    { researcherId: 'u1', checkerId: null, status: 'In progress' },
    { researcherId: null, checkerId: 'u1', status: 'Done' }
  ];
  assert.equal(hasAssigned('u1', tasks), true);
  assert.equal(hasAssigned('u2', tasks), false);
});