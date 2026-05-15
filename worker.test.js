import test from 'node:test';
import assert from 'node:assert/strict';
import { toAirtableUrl } from './worker.js';

test('maps supported routes to Airtable URLs', () => {
  const base = 'appBase';
  assert.equal(toAirtableUrl('/users', base), 'https://api.airtable.com/v0/appBase/users');
  assert.equal(toAirtableUrl('/tasks', base), 'https://api.airtable.com/v0/appBase/tasks');
  assert.equal(toAirtableUrl('/tasktypes', base), 'https://api.airtable.com/v0/appBase/tasktypes');
  assert.equal(toAirtableUrl('/tasks/rec123', base), 'https://api.airtable.com/v0/appBase/tasks/rec123');
  assert.equal(toAirtableUrl('/nope', base), null);
});