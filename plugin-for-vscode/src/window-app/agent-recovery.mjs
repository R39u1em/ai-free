export function recoverableAgentRuns(conversations) {
  const result = [];
  for (const conversation of conversations || []) {
    for (const message of conversation.messages || []) {
      const run = message.agentRun;
      if (!run || run.status !== 'running') continue;
      if (run.toolInFlight) {
        run.status = 'needs_review';
        message.streaming = false;
        message.content = `⚠️ Проверить результат ${run.toolInFlight.tool || 'инструмента'} перед продолжением: сервер перезапустился во время действия.`;
        continue;
      }
      result.push([conversation, message]);
    }
  }
  return result;
}

export function pausedAuthAgentRuns(conversations, provider) {
  const result = [];
  for (const conversation of conversations || []) {
    if (conversation.provider !== provider) continue;
    for (const message of conversation.messages || []) {
      const run = message.agentRun;
      if (run?.status === 'paused' && run.pauseReason === 'auth' && !run.toolInFlight) {
        result.push([conversation, message]);
      }
    }
  }
  return result;
}

export function agentPauseReason(error) {
  const message = String(error?.message || error || '');
  return error?.needsChatGPTLogin || /login timeout|log.?in|not logged in|session expired|сессия истекла|вход не заверш|валидного JWT|HTTP 401|unauthorized|captcha|cloudflare/i.test(message)
    ? 'auth' : 'error';
}

export function agentRequestOptions({ conversation, message, state, workspaceRoot, saveState, adapter }) {
  const run = message.agentRun;
  const persist = () => {
    message.updatedAt = new Date().toISOString();
    conversation.updatedAt = message.updatedAt;
    saveState(workspaceRoot, state);
  };
  return {
    providerId: conversation.provider || 'deepseek',
    requestDelay: { minMs: 5000, maxMs: 15000 },
    retryDelaysMs: [10_000, 30_000, 120_000, 3_600_000],
    onCheckpoint(checkpoint) {
      run.checkpoint = checkpoint;
      run.toolInFlight = null;
      if (adapter?.activeChatId) run.activeChatId = adapter.activeChatId;
      persist();
    },
    onToolIntent(checkpoint) {
      run.checkpoint = checkpoint;
      run.toolInFlight = checkpoint.tool;
      persist();
    },
    onRetry({ attempt, error }) {
      run.lastError = String(error || '').slice(0, 240);
      run.retries = attempt;
      message.content = `⏳ Восстанавливаю запрос (${attempt}). Задача продолжается автоматически.\n\n${run.task}`;
      persist();
    },
  };
}
