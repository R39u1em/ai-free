// One web-account request at a time, with a variable pause after each request.
const slots = new Map();
const lastFinished = new Map();

export function isRecoverableModelError(error) {
  const status = Number(error?.status || error?.httpStatus || 0);
  if ([401, 403].includes(status)) return false;
  const message = String(error?.message || error || '');
  if (/unauthori[sz]ed|forbidden|captcha|cloudflare|login|required|session expired|not logged in/i.test(message)) return false;
  if (status === 429 || status >= 500 || error?.retryable === true) return true;
  return /empty stream|stream.*(end|closed|abort|timeout|fail)|network|fetch failed|socket|ECONN|ETIMEDOUT|timeout|rate limit|too many requests|quota|in.progress|Execution context was destroyed|most likely because of a navigation|Target closed|Page closed|Context closed|request is finished/i.test(message);
}

export function waitFor(ms, signal, sleeper = null) {
  if (signal?.aborted) return Promise.reject(signal.reason || new Error('Task stopped'));
  if (ms <= 0) return Promise.resolve();
  if (sleeper) return sleeper(ms, signal);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(done, ms);
    function done() { signal?.removeEventListener('abort', abort); resolve(); }
    function abort() { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(signal.reason || new Error('Task stopped')); }
    signal?.addEventListener('abort', abort, { once: true });
  });
}

export async function scheduledModelRequest(providerId, request, { delay = {}, signal, backoffMs = 0 } = {}) {
  const key = String(providerId || 'default');
  const previous = slots.get(key) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => { release = resolve; });
  slots.set(key, current);
  try {
    await previous;
    if (signal?.aborted) throw signal.reason || new Error('Task stopped');
    const minMs = Math.max(0, Number(delay.minMs) || 0);
    const maxMs = Math.max(minMs, Number(delay.maxMs) || minMs);
    const random = delay.random || Math.random;
    const pause = lastFinished.has(key) ? minMs + Math.floor(random() * (maxMs - minMs + 1)) : 0;
    const waitMs = lastFinished.has(key) ? Math.max(0, lastFinished.get(key) + Math.max(pause, backoffMs) - Date.now()) : 0;
    await waitFor(waitMs, signal, delay.sleep);
    return await request();
  } finally {
    lastFinished.set(key, Date.now());
    release();
    if (slots.get(key) === current) slots.delete(key);
  }
}
