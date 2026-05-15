import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('script.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

test('inbox heading is renamed to To Research', () => {
  assert.match(html, /<h2>To Research<\/h2>/);
});

test('my tasks panel title tooltip explains section visibility', () => {
  assert.match(html, /title="View all your assigned work sections and complete tasks"/);
});

test('my tasks cards render queue labels for to research and to verify', () => {
  assert.match(js, /return 'To Research';/);
  assert.match(js, /return 'To Verify';/);
});

test('panels are scrolled into view instead of hidden', () => {
  const onlyOpenBlock = js.match(/function onlyOpen\(sectionName\) \{[\s\S]*?\n\}/)?.[0] || '';
  assert.match(onlyOpenBlock, /scrollIntoView\(/);
  assert.doesNotMatch(onlyOpenBlock, /classList\.toggle\('hidden'/);
});

test('cards have a max width for desktop layouts', () => {
  assert.match(css, /max-width:44rem;/);
});
