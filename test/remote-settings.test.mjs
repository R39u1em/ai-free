import test from 'node:test';
import assert from 'node:assert/strict';
import { remoteSettingsInput, remoteSettingsResponse } from '../src/window-app/remote-settings.mjs';

test('remote settings can update agent command permissions without accepting secrets', () => {
  assert.deepEqual(remoteSettingsInput({
    allowedCommands: ['node'],
    commandPermissions: { allowShell: true, allowExternalWrites: true },
    ui: { memoryDefault: true },
    telegram: { botToken: 'synthetic-token' },
    openAICompat: { apiKeys: { deepseek: 'synthetic-key' } },
  }), {
    allowedCommands: ['node'],
    commandPermissions: { allowShell: true, allowExternalWrites: true },
    ui: { memoryDefault: true },
  });
});

test('remote settings response redacts Telegram credentials', () => {
  const visible = remoteSettingsResponse({
    allowedCommands: ['node'], commandPermissions: {}, ui: {},
    telegram: { enabled: true, botToken: 'synthetic-token', chatId: 'synthetic-id' },
  });
  assert.deepEqual(visible.telegram, { enabled: true, botToken: '', chatId: '' });
});
