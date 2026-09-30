import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { withProviderAccountSlot } from '../src/providers/account-slot.mjs';

test('web account requests are serialized across independent callers', async () => {
  const lockRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-free-account-slot-'));
  let releaseFirst;
  const entered = [];
  try {
    const first = withProviderAccountSlot('qwen', async () => {
      entered.push('first');
      await new Promise((resolve) => { releaseFirst = resolve; });
    }, { lockRoot, pollMs: 5 });
    while (!releaseFirst) await new Promise((resolve) => setTimeout(resolve, 1));
    const second = withProviderAccountSlot('qwen', async () => { entered.push('second'); }, { lockRoot, pollMs: 5 });
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.deepEqual(entered, ['first']);
    releaseFirst();
    await Promise.all([first, second]);
    assert.deepEqual(entered, ['first', 'second']);
  } finally {
    fs.rmSync(lockRoot, { recursive: true, force: true });
  }
});
