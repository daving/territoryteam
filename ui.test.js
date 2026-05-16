import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('script.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

test('frontend uses Bootstrap 5.3 CDN assets', () => {
  assert.match(html, /bootstrap@5\.3\.3\/dist\/css\/bootstrap\.min\.css/);
  assert.match(html, /bootstrap@5\.3\.3\/dist\/js\/bootstrap\.bundle\.min\.js/);
  assert.match(html, /cdn\.jsdelivr\.net\/npm\/marked\/marked\.min\.js/);
  assert.match(html, /cdn\.jsdelivr\.net\/npm\/dompurify@3\.1\.6\/dist\/purify\.min\.js/);
});

test('sections remain card based and mobile-first', () => {
  assert.match(html, /<section class="col-12 app-section" data-section="user">/);
  assert.match(html, /class="card shadow-sm h-100"/);
  assert.match(html, /row-cols-1 row-cols-md-2 row-cols-xl-3/);
  assert.match(css, /\.app-section \{ display: none; \}/);
});

test('task cards render status badge and task type label', () => {
  assert.match(js, /Task Type: \$\{task\.type \|\| 'Task'\}/);
  assert.match(js, /Current task status shown in app/);
  assert.match(js, /const statusLabel = task\.status === 'Done' \? 'Needs verification' : task\.status/);
});

test('task type help stores full description safely for modal rendering', () => {
  assert.match(js, /data-help-text="\$\{encodeURIComponent\(task\.typeDescription\)\}"/);
  assert.match(js, /decodeURIComponent\(description \|\| ''\)/);
  assert.match(js, /function renderHelpMarkdown\(input\)/);
  assert.match(js, /window\.marked\?\.parse/);
  assert.match(js, /\$\('helpDescription'\)\.innerHTML = sanitized/);
  assert.match(js, /function sanitizeHelpHtml\(input\)/);
  assert.match(js, /window\.DOMPurify/);
  assert.match(js, /ALLOWED_TAGS: \['p', 'br', 'ul', 'ol', 'li', 'em', 'strong', 'b', 'i', 'a', 'code', 'pre', 'blockquote', 'hr'\]/);
});

test('confirm and help actions use Bootstrap modals', () => {
  assert.match(html, /id="confirmModal"/);
  assert.match(html, /id="helpModal"/);
  assert.match(js, /bootstrap\.Modal\.getOrCreateInstance/);
});


test('completion confirmation includes notes field and guidance text', () => {
  assert.match(html, /id="confirmNotes"/);
  assert.match(html, /id="confirmNotesGroup"/);
  assert.match(html, /for="confirmNotes"/);
  assert.match(js, /Are you sure\? Add notes below if you want\./);
  assert.match(js, /Status: 'Done'/);
  assert.match(js, /Status: 'Verifying'/);
  assert.match(js, /task\.status === 'Verifying'/);
  assert.match(js, /'research notes': notes/);
  assert.match(js, /'checker notes': notes/);
});

test('verify inbox excludes level 2 users from their own researched tasks', () => {
  assert.match(js, /t\.status === 'Done' && \(state\.me\.level > 2 \|\| t\.researcherId !== state\.me\.id\)/);
});

test('claim confirmation does not show notes field', () => {
  assert.match(js, /confirmNotesGroup\.classList\.toggle\('d-none', !showNotes\)/);
  assert.match(js, /confirmAction\('Claim this research task\?', \{ showNotes: false \}\)/);
  assert.match(js, /confirmAction\('Claim this verification task\?', \{ showNotes: false \}\)/);
  assert.match(js, /Checker: \[state\.me\.id\], Status: 'Verifying'/);
});


test('to verify cards show pink Research Notes button when research notes exist', () => {
  assert.match(js, /const showResearchNotes = hasResearchNotes && \(action === 'claim-verify' \|\| queueLabel === 'To Verify'\)/);
  assert.match(js, /data-action=\"show-research-notes\"/);
  assert.match(js, /showTypeHelp\('Research Notes', btn\.dataset\.notes \|\| ''\)/);
  assert.match(css, /\.btn-pink \{/);
});

test('responsive sticky navbar exists', () => {
  assert.match(html, /navbar navbar-expand-lg/);
  assert.match(html, /sticky-top/);
});

test('app version is visible in the navbar and wired to config', () => {
  assert.match(html, /id="appVersion"/);
  assert.match(html, /v1\.2\.2/);
  assert.match(js, /const APP_VERSION = '1\.2\.2';/);
  assert.match(js, /\$\('appVersion'\)\.textContent = `v\$\{APP_VERSION\}`/);
  assert.match(js, /window\.__appConfig = \{ BASE_ID, API_ROOT, STORAGE_KEY, APP_VERSION \};/);
});
