import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCodeTask } from '../src/code-agent/run.mjs';

test('code agent retries a broken model stream without repeating a tool', async () => {
  let calls = 0;
  const client = { async complete() {
    calls += 1;
    if (calls === 1) throw new Error('empty stream');
    return { text: '{"tool":"finish","message":"done"}' };
  }};
  const result = await runCodeTask(client, {}, process.cwd(), 'finish', null, {
    requestDelay: { minMs: 0, maxMs: 0 },
    retryDelaysMs: [0],
  });
  assert.equal(result.message, 'done');
  assert.equal(calls, 2);
});

test('a browser navigation race is retried inside the same code task', async () => {
  let calls = 0;
  const client = { async complete() {
    calls += 1;
    if (calls === 1) throw new Error('page.evaluate: Execution context was destroyed, most likely because of a navigation.');
    return { text: '{"tool":"finish","message":"done"}' };
  }};
  const result = await runCodeTask(client, {}, process.cwd(), 'finish', null, {
    providerId: 'navigation-race-test', requestDelay: { minMs: 0, maxMs: 0 }, retryDelaysMs: [0],
  });
  assert.equal(result.message, 'done');
  assert.equal(calls, 2);
});

test('request spacing is randomized per model request, including retry', async () => {
  const waits = [];
  let calls = 0;
  const client = { async complete() {
    calls += 1;
    if (calls === 1) throw new Error('network timeout');
    return { text: '{"tool":"finish","message":"done"}' };
  }};
  await runCodeTask(client, {}, process.cwd(), 'finish', null, {
    providerId: 'spacing-test',
    requestDelay: { minMs: 5000, maxMs: 15000, random: () => 0.5, sleep: async (ms) => waits.push(ms) },
    retryDelaysMs: [0],
  });
  assert.equal(waits.length, 1);
  assert.ok(waits[0] >= 9900 && waits[0] <= 10000);
});

test('auth failure pauses without retrying', async () => {
  let calls = 0;
  const client = { async complete() { calls += 1; const error = new Error('unauthorized'); error.status = 401; throw error; }};
  await assert.rejects(() => runCodeTask(client, {}, process.cwd(), 'finish', null, {
    requestDelay: { minMs: 0, maxMs: 0 }, retryDelaysMs: [0],
  }), /unauthorized/);
  assert.equal(calls, 1);
});

test('truncated tool JSON is retried and never executed', async () => {
  let calls = 0;
  const client = { async complete() {
    calls += 1;
    return calls === 1
      ? { text: '{"tool":"write_file","path":"oops' }
      : { text: '{"tool":"finish","message":"done"}' };
  }};
  const result = await runCodeTask(client, {}, process.cwd(), 'finish', null, {
    providerId: 'truncated-json-test', requestDelay: { minMs: 0, maxMs: 0 }, retryDelaysMs: [0],
  });
  assert.equal(result.message, 'done');
  assert.equal(calls, 2);
});

test('provider quota text keeps the same agent task alive', async () => {
  let calls = 0;
  const client = { async complete() {
    calls += 1;
    return calls <= 4
      ? { text: 'rate limit: too many requests' }
      : { text: '{"tool":"finish","message":"done"}' };
  }};
  const result = await runCodeTask(client, {}, process.cwd(), 'finish', null, {
    providerId: 'quota-text-test', requestDelay: { minMs: 0, maxMs: 0 }, retryDelaysMs: [0],
  });
  assert.equal(result.message, 'done');
  assert.equal(calls, 5);
});

test('a saved text-tool checkpoint resumes without repeating a completed write', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-free-text-resume-'));
  let calls = 0;
  let checkpoint;
  let toolCount = 0;
  const client = { async complete() {
    calls += 1;
    if (calls === 1) return { text: '{"tool":"write_file","path":"result.txt","content":"once"}', lastAssistantMessageId: 'parent-1' };
    if (calls === 2) { const error = new Error('unauthorized'); error.status = 401; throw error; }
    return { text: '{"tool":"finish","message":"done"}', lastAssistantMessageId: 'parent-2' };
  }};
  try {
    await assert.rejects(() => runCodeTask(client, {}, root, 'write result.txt', null, {
      onCheckpoint: (value) => { checkpoint = value; },
      onTool: () => { toolCount += 1; },
    }), /unauthorized/);
    assert.equal(fs.readFileSync(path.join(root, 'result.txt'), 'utf8'), 'once');
    assert.equal(toolCount, 1);
    const result = await runCodeTask(client, {}, root, 'write result.txt', null, {
      resumeState: checkpoint,
      onTool: () => { toolCount += 1; },
    });
    assert.equal(result.message, 'done');
    assert.equal(toolCount, 1);
    assert.equal(result.toolLogs.length, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Stop while a provider is answering prevents a late tool call', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-free-stop-late-'));
  const controller = new AbortController();
  let answer;
  const client = { complete: () => new Promise((resolve) => { answer = resolve; }) };
  try {
    const run = runCodeTask(client, {}, root, 'write result.txt', null, { signal: controller.signal });
    while (!answer) await new Promise((resolve) => setTimeout(resolve, 1));
    controller.abort();
    answer({ text: '{"tool":"write_file","path":"result.txt","content":"bad"}' });
    const result = await run;
    assert.equal(result.stopped, true);
    assert.equal(fs.existsSync(path.join(root, 'result.txt')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
