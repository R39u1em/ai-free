import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AUTH_DIR } from '../config.mjs';

function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (error) { return error?.code === 'EPERM'; }
}

function reapDeadOwner(lockPath) {
  const ownerPath = path.join(lockPath, 'owner.json');
  let stat;
  try { stat = fs.statSync(lockPath); } catch { return; }
  let owner = null;
  try { owner = JSON.parse(fs.readFileSync(ownerPath, 'utf8')); } catch {}
  if (Date.now() - stat.mtimeMs < 15_000) return;
  if (owner && alive(Number(owner.pid))) return;
  // A dead process cannot release its slot. A fresh holder's heartbeat keeps
  // mtime current, so only the abandoned directory is reclaimed.
  try { fs.rmSync(lockPath, { recursive: true, force: true }); } catch {}
}

export async function withProviderAccountSlot(provider, fn, { lockRoot = path.join(AUTH_DIR, 'account-slots'), pollMs = 250 } = {}) {
  if (!/^[a-z0-9-]+$/i.test(provider)) throw new Error('Invalid provider slot');
  fs.mkdirSync(lockRoot, { recursive: true, mode: 0o700 });
  const lockPath = path.join(lockRoot, `${provider}.lock`);
  const ownerPath = path.join(lockPath, 'owner.json');
  const token = randomUUID();
  for (;;) {
    try {
      fs.mkdirSync(lockPath, { mode: 0o700 });
      fs.writeFileSync(ownerPath, JSON.stringify({ pid: process.pid, token }), { mode: 0o600 });
      break;
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      reapDeadOwner(lockPath);
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  }
  const heartbeat = setInterval(() => {
    try { fs.utimesSync(lockPath, new Date(), new Date()); } catch {}
  }, 5_000);
  heartbeat.unref?.();
  try {
    return await fn();
  } finally {
    clearInterval(heartbeat);
    try {
      const current = JSON.parse(fs.readFileSync(ownerPath, 'utf8'));
      if (current.token === token) fs.rmSync(lockPath, { recursive: true, force: true });
    } catch {}
  }
}
