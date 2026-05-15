import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('script points to deployed worker API root', () => {
  const src = fs.readFileSync('script.js', 'utf8');
  assert.match(src, /const API_ROOT = 'https:\/\/territoryteam-api\.daving\.workers\.dev\/api';/);
});