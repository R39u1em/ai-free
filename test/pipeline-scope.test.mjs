import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeVisiblePipeline, projectPipeline } from '../src/window-app/pipeline-scope.mjs';

test('remote pipeline view contains only visible conversations', () => {
  const pipeline = { mainAgentId: 'hidden', edges: [{ from: 'a', to: 'b' }, { from: 'a', to: 'hidden' }] };
  assert.deepEqual(projectPipeline(pipeline, new Set(['a', 'b'])), {
    mainAgentId: null, edges: [{ from: 'a', to: 'b' }],
  });
});

test('remote pipeline edit preserves edges involving hidden conversations', () => {
  const existing = { mainAgentId: 'hidden', edges: [{ from: 'a', to: 'old' }, { from: 'hidden', to: 'other' }] };
  const patch = { mainAgentId: 'a', edges: [{ from: 'a', to: 'b' }] };
  assert.deepEqual(mergeVisiblePipeline(existing, patch, new Set(['a', 'b'])), {
    mainAgentId: 'a', edges: [{ from: 'a', to: 'old' }, { from: 'hidden', to: 'other' }, { from: 'a', to: 'b' }],
  });
});
