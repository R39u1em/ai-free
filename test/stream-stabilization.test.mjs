// Тесты стабилизации стрима: idle-таймаут SSE (Задача 4) и human-like задержки (Задача 2).

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { Readable } from "node:stream";

// До импорта модулей почистим env, чтобы дефолты читались детерминированно.
delete process.env.DSCLI_STREAM_IDLE_TIMEOUT_MS;
delete process.env.AI_FREE_HUMAN_DELAY_MS;

const { streamSse, resolveDeepSeekStreamIdleTimeoutMs } = await import("../src/providers/deepseek/sse.mjs");
const { resolveHumanDelayMs } = await import("../src/code-agent/run.mjs");

function stalledResponse(firstChunk, stallChunk) {
  // Первый чанк отдаётся сразу; второй — только через 10 c (гарантированно
  // позже watchdog на 3 c), поэтому тест не зависит от скорости CI-машины.
  const readable = new Readable({ read() {} });
  readable.push(firstChunk);
  const timer = setTimeout(() => { try { readable.push(stallChunk); } catch {} }, 10_000);
  return {
    response: { body: { getReader: () => readable.getReader() } },
    cleanup: () => {
      clearTimeout(timer);
      try { readable.destroy(); } catch {}
    },
  };
}

describe("resolveDeepSeekStreamIdleTimeoutMs", () => {
  it("defaults to 20s", () => {
    assert.equal(resolveDeepSeekStreamIdleTimeoutMs({}), 20_000);
  });

  it("0 disables the watchdog", () => {
    assert.equal(resolveDeepSeekStreamIdleTimeoutMs({ DSCLI_STREAM_IDLE_TIMEOUT_MS: "0" }), 0);
  });

  it("parses custom values and clamps them", () => {
    assert.equal(resolveDeepSeekStreamIdleTimeoutMs({ DSCLI_STREAM_IDLE_TIMEOUT_MS: "5000" }), 5_000);
    assert.equal(resolveDeepSeekStreamIdleTimeoutMs({ DSCLI_STREAM_IDLE_TIMEOUT_MS: "999999999" }), 600_000);
    assert.equal(resolveDeepSeekStreamIdleTimeoutMs({ DSCLI_STREAM_IDLE_TIMEOUT_MS: "abc" }), 20_000);
  });
});

describe("streamSse idle timeout", () => {
  it("aborts a stalled stream with STREAM_IDLE_TIMEOUT", async () => {
    process.env.DSCLI_STREAM_IDLE_TIMEOUT_MS = "300";
    const { response, cleanup } = stalledResponse(
      'data: {"v":"hello"}\n\n',
      'data: {"v":"never"}\n\n',
    );
    try {
      await assert.rejects(
        () => streamSse(response, false),
        (error) => {
          assert.match(error.message, /stalled/i);
          assert.equal(error.code, "STREAM_IDLE_TIMEOUT");
          assert.equal(error.isTransientStreamError, true);
          return true;
        },
      );
    } finally {
      delete process.env.DSCLI_STREAM_IDLE_TIMEOUT_MS;
      cleanup();
    }
  });

  it("reads a healthy stream fully when watchdog is on", async () => {
    process.env.DSCLI_STREAM_IDLE_TIMEOUT_MS = "20000";
    try {
      const result = await streamSse(new Response('data: {"v":"Hello "}\n\ndata: {"v":"world"}\n\n'), false);
      assert.equal(result.text, "Hello world");
    } finally {
      delete process.env.DSCLI_STREAM_IDLE_TIMEOUT_MS;
    }
  });
});

describe("resolveHumanDelayMs", () => {
  it("defaults to 3000ms base", () => {
    assert.equal(resolveHumanDelayMs({}), 3_000);
  });

  it("0 or negative disables anti-ban pauses", () => {
    assert.equal(resolveHumanDelayMs({ AI_FREE_HUMAN_DELAY_MS: "0" }), 0);
    assert.equal(resolveHumanDelayMs({ AI_FREE_HUMAN_DELAY_MS: "-5" }), 0);
  });

  it("clamps absurd values", () => {
    assert.equal(resolveHumanDelayMs({ AI_FREE_HUMAN_DELAY_MS: "120000" }), 60_000);
    assert.equal(resolveHumanDelayMs({ AI_FREE_HUMAN_DELAY_MS: "not-a-number" }), 3_000);
  });
});
