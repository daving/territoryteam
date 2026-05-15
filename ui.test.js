import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('script.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

test('frontend uses Bootstrap 5.3 CDN assets', () => {
  assert.match(html, /bootstrap@5\.3\.3\/dist\/css\/bootstrap\.min\.css/);
  assert.match(html, /bootstrap@5\.3\.3\/dist\/js\/bootstrap\.bundle\.min\.js/);
});

test('sections remain card based and mobile-first', () => {
  assert.match(html, /<section class="col-12 app-section" data-section="user">/);
  assert.match(html, /class="card shadow-sm h-100"/);
  assert.match(html, /row-cols-1 row-cols-md-2 row-cols-xl-3/);
  assert.match(css, /\.app-section \{ display: none; \}/);
});

test('task cards render status badge and task type label', () => {
  assert.match(js, /Task Type: \$\{task\.type \|\| 'Task'\}/);
  assert.match(js, /Current task status/);
});

test('task type help stores full description safely for modal rendering', () => {
  assert.match(js, /data-help-text="\$\{encodeURIComponent\(task\.typeDescription\)\}"/);
  assert.match(js, /decodeURIComponent\(description\)/);
});

test('confirm and help actions use Bootstrap modals', () => {
  assert.match(html, /id="confirmModal"/);
  assert.match(html, /id="helpModal"/);
  assert.match(js, /bootstrap\.Modal\.getOrCreateInstance/);
});

test('responsive sticky navbar exists', () => {
  assert.match(html, /navbar navbar-expand-lg/);
  assert.match(html, /sticky-top/);
});
