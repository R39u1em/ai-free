import test from 'node:test';
import assert from 'node:assert/strict';
import { filterRemoteMemoryItems, prefixUiPaths, resolveUiRequestPath } from '../src/window-app/base-path.mjs';

test('UI paths stay within ai-free prefix', () => {
  const html = '<script>fetch("/api/state"); const page="/embed/browser";</script>';
  assert.equal(prefixUiPaths(html, '/ai-free'), '<script>fetch("/ai-free/api/state"); const page="/ai-free/embed/browser";</script>');
  assert.equal(resolveUiRequestPath('/ai-free/api/state', '/ai-free'), '/api/state');
  assert.equal(resolveUiRequestPath('/ai-free', '/ai-free'), '/');
  assert.equal(resolveUiRequestPath('/ai-free-other/api/state', '/ai-free'), null);
});

test('remote memory shows only entries for the selected workspace', () => {
  const items = [
    { workspace: '', content: 'global' },
    { workspace: '/allowed', content: 'selected' },
    { workspace: '/other', content: 'other' },
  ];
  assert.deepEqual(filterRemoteMemoryItems(items, '/allowed'), [items[1]]);
});
