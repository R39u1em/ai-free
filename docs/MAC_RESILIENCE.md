# AI Free on the Mac

This deployment keeps AI Free's existing web provider and tool workflow. The
Mac runs the UI on loopback port 4317 and its OpenAI-compatible API on 4318.
`https://main.r3quiem.ru/ai-free/` reaches only the UI through the existing
client-certificate-protected Caddy route.

## Long code and browser tasks

- Each model request waits a random 5–15 seconds after the preceding request
  for that provider. Recoverable stream, network, quota, and navigation errors
  retry in the same task with increasing waits. Authentication errors pause the
  task. This pacing is operational rate limiting, not a guarantee against
  provider restrictions.
- The agent saves its next prompt and tool results in the UI state. After a
  server restart it resumes a task from the saved prompt. If the server stopped
  while a tool was running, the task requires review of that tool's effect
  before continuing; it never blindly runs the tool a second time.
- The Stop control prevents a tool call from a late model answer. Successful
  provider login resumes tasks paused for that provider's authentication.
- Provider completion requests share one account slot across the Mac UI and
  OpenAI-compatible API processes. The slot does not cover other clients using
  the same account outside these processes.

## Mac configuration

The UI LaunchAgent `com.kirill.aifree-server` runs this checkout with
`AI_FREE_BASE_PATH=/ai-free` and
`AI_FREE_REMOTE_WORKSPACES=/Users/kirill/work/repos`. Local loopback use still
supports other workspaces. The remote UI limits workspace selection to that
root, requires the expected Origin on writes, omits stored credentials from
settings responses, and blocks server administration and API-key routes.
The protected web UI can configure command permissions, plugins, diagnostics,
voice, pipeline and workspace-scoped memory. Destructive actions and writes
outside the selected workspace remain behind the existing permission review;
opening the settings page does not enable them automatically. Coder, ESP and
Pipeline are mutually exclusive when selected in a conversation, and explicit
`/code` or browser requests run their respective agent even if an older
conversation still records Pipeline mode. DeepSeek and Qwen use the shared Web
tab in the embedded browser; ChatGPT uses its own browser tab. The live Web
stream begins after browser warm-up and retries a failed first frame.
Keep the Caddy route restricted to `/ai-free` and `/ai-free/*`, with the
existing client-certificate allowlist. Do not expose port 4317 or 4318
directly to the network.

To check service health on the Mac:

```sh
launchctl print gui/$(id -u)/com.kirill.aifree-server
curl --fail http://127.0.0.1:4317/ai-free/
curl --fail http://127.0.0.1:4318/v1/models
```

After changing UI code, restart with
`launchctl kickstart -k gui/$(id -u)/com.kirill.aifree-server`.
An account login must complete in the provider's browser window. A Qwen
login timeout leaves the task paused and preserves its checkpoint; complete
the provider login from AI Free to continue it.

## Validation and limits

Run `npm test` and `npm run check:ci` in this checkout. A synthetic DeepSeek
`/code` task completed a file write and final answer through the live Mac
service on 2026-09-30. A DeepSeek browser agent reached `example.com` through
the protected web route. The UI's first browser frame recovered after a forced
HTTP 503 at desktop and mobile widths. Qwen's live task could not complete
because its login timed out without a valid session. Neither test proves that providers will
accept unlimited or prolonged use; respect provider terms and account limits.
