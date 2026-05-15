import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('script.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

test('users list no longer renders visible level label', () => {
  assert.match(js, /<strong>\$\{u\.name\}<\/strong>/);
  assert.doesNotMatch(js, /Level \$\{u\.level\}/);
});

test('complete research sets done_time timestamp', () => {
  assert.match(js, /Status: 'Done', done_time: new Date\(\)\.toISOString\(\)/);
});

test('to research lock message appears for 24-hour completion cap', () => {
  assert.match(js, /Thank you so much for completing these tasks! check back tomorrow to continue helping out\./);
  assert.match(js, /completedResearchCountLast24h/);
});

test('task type help dialog exists and type help button is conditional', () => {
  assert.match(html, /id="helpDialog"/);
  assert.match(js, /data-action="show-type-help"/);
  assert.match(js, /task\.typeDescription\s*\?/);
});

test('layout uses vertical single-active panel behavior', () => {
  assert.match(css, /flex-direction:column/);
  assert.match(css, /\.panel\.is-active \.panel-body/);
  assert.match(js, /classList\.toggle\('is-active'/);
});
