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

test('task card territory label is prefixed with Territory', () => {
  assert.match(js, /Territory \$\{task\.territory\}/);
  assert.doesNotMatch(js, /Untyped task/);
});

test('layout uses vertical single-active panel behavior', () => {
  assert.match(css, /flex-direction:column/);
  assert.match(css, /\.panel\.is-active \.panel-body/);
  assert.match(js, /classList\.toggle\('is-active'/);
  assert.match(css, /grid-template-columns:repeat\(auto-fit, minmax\(260px, 1fr\)\)/);
});

test('task type fallback handles Airtable field name variations', () => {
  assert.match(js, /pickField\(r\.fields, \['name', 'Name'\], 'Task'\)/);
  assert.match(js, /rawType = r\.fields\.Type \|\| r\.fields\.type \|\| null/);
});


test('inbox and my tasks hint copy updated for checkout and complete flow', () => {
  assert.match(html, /These are some of the tasks that need to be done for territories\. Click the checkout button on a task and get started!/);
  assert.match(html, /These are your in progress tasks\./);
});

test('task cards render explicit action buttons and blank descriptions when absent', () => {
  assert.match(js, /class=\"task-action\"/);
  assert.match(js, /actionLabel = 'Check Out'/);
  assert.match(js, /taskCard\(t, 'complete', false, queueLabelForTask\(t\), 'Complete'\)/);
  assert.match(js, /task\.description \|\| ''/);
});


test('welcome copy is shown in top bar and includes help guidance tooltip', () => {
  assert.match(html, /Hi! Thanks for helping with the territories\./);
  assert.match(html, /ask me \(davin\) or ask the Territories WhatsApp group\./);
  assert.match(html, /title="Need help\? Ask Davin or the Territories WhatsApp group\."/);
});

test('help popup supports long task type descriptions with scrolling', () => {
  assert.match(css, /#helpDescription \{ max-height:50vh; overflow:auto; white-space:pre-wrap; \}/);
});

test('task cards no longer force square aspect ratio so single my-task card does not fill viewport', () => {
  assert.match(css, /\.task-card \{ width:100%;/);
  assert.doesNotMatch(css, /\.task-card, \.user-btn[^\n]*aspect-ratio:1\/1/);
});
