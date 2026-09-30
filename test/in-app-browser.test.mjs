import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  IN_APP_BROWSER_PROFILE,
  IN_APP_BROWSER_VIEWPORT,
  getInAppBrowserLaunchLabel,
} from "../src/window-app/in-app-browser.mjs";
import { CHATGPT_BROWSER_PROFILE } from "../src/providers/chatgpt/config.mjs";
import { preferredBrowserTab, renderEmbedBrowserHtml } from "../src/window-app/embed-browser.mjs";
import { renderEmbedAppBrowserLiveHtml } from "../src/window-app/app-browser-live.mjs";

describe("in-app-browser", () => {
  it("shares profile with ChatGPT browser for persistent session", () => {
    assert.equal(IN_APP_BROWSER_PROFILE, CHATGPT_BROWSER_PROFILE);
  });

  it("uses panel-sized viewport for MJPEG stream", () => {
    assert.equal(IN_APP_BROWSER_VIEWPORT.width, 580);
    assert.equal(IN_APP_BROWSER_VIEWPORT.height, 900);
  });

  it("defaults to Camoufox launch label", () => {
    assert.equal(getInAppBrowserLaunchLabel(), "camoufox");
  });
});

it("starts the browser stream after warm-up and retries a failed first frame", () => {
  const html = renderEmbedAppBrowserLiveHtml();
  assert.match(html, /<img id="live" alt="Web live"/);
  assert.match(html, /function scheduleStreamRetry\(/);
  assert.match(html, /\.then\(\(data\) => \{[\s\S]*?restartStream\(\)/);
});

describe("embedded browser provider selection", () => {
  it("opens the shared Web browser for DeepSeek and Qwen", () => {
    assert.equal(preferredBrowserTab("deepseek"), "web");
    assert.equal(preferredBrowserTab("qwen"), "web");
    assert.match(renderEmbedBrowserHtml({ defaultTab: preferredBrowserTab("deepseek") }), /let currentTab = "web"/);
  });

  it("opens ChatGPT's own browser for a ChatGPT conversation", () => {
    assert.equal(preferredBrowserTab("chatgpt"), "chatgpt");
  });
});
