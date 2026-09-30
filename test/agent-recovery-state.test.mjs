import test from 'node:test';
import assert from 'node:assert/strict';
import { agentPauseReason, recoverableAgentRuns, pausedAuthAgentRuns } from '../src/window-app/agent-recovery.mjs';

test('restart resumes safe checkpoints and pauses uncertain tool effects', () => {
  const safe = { id: 'safe', messages: [{ agentRun: { task: 'a', status: 'running', checkpoint: { prompt: 'next' } } }] };
  const uncertain = { id: 'uncertain', messages: [{ agentRun: { task: 'b', status: 'running', toolInFlight: { tool: 'write_file' } } }] };
  const stopped = { id: 'stopped', messages: [{ agentRun: { task: 'c', status: 'stopped' } }] };
  const result = recoverableAgentRuns([safe, uncertain, stopped]);
  assert.deepEqual(result.map(([conversation]) => conversation.id), ['safe']);
  assert.equal(uncertain.messages[0].agentRun.status, 'needs_review');
});

test('successful provider login selects only its paused auth tasks', () => {
  const qwen = { id: 'q', provider: 'qwen', messages: [{ agentRun: { task: 'a', status: 'paused', pauseReason: 'auth' } }] };
  const deepseek = { id: 'd', provider: 'deepseek', messages: [{ agentRun: { task: 'b', status: 'paused', pauseReason: 'auth' } }] };
  const fatal = { id: 'f', provider: 'qwen', messages: [{ agentRun: { task: 'c', status: 'paused', pauseReason: 'other' } }] };
  assert.deepEqual(pausedAuthAgentRuns([qwen, deepseek, fatal], 'qwen').map(([c]) => c.id), ['q']);
});

test('authentication failure is distinguishable from other provider failures', () => {
  assert.equal(agentPauseReason(new Error('Qwen login timeout (300s): no valid JWT')), 'auth');
  assert.equal(agentPauseReason(new Error('Execution context was destroyed')), 'error');
});
