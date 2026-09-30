import test from 'node:test';
import assert from 'node:assert/strict';
import { remoteUiRouteDenied } from '../src/window-app/remote-route-policy.mjs';

test('protected web UI can use its agent and plugin controls', () => {
  for (const [method, path] of [
    ['PATCH', '/api/pipeline'], ['PUT', '/api/settings'],
    ['POST', '/api/browser/warm'], ['POST', '/api/plugins/install'],
    ['GET', '/api/diagnostics'], ['GET', '/api/memory'],
    ['POST', '/api/memory'], ['DELETE', '/api/memory/synthetic-id'],
  ]) assert.equal(remoteUiRouteDenied(path, method), false, `${method} ${path}`);
});

test('remote app lifecycle and API credential operations stay outside the UI route', () => {
  for (const [method, path] of [
    ['POST', '/api/shutdown'], ['POST', '/api/update/run'],
    ['POST', '/api/settings/openai-key'], ['GET', '/v1/models'],
    ['POST', '/api/settings'],
  ]) assert.equal(remoteUiRouteDenied(path, method), true, `${method} ${path}`);
});
