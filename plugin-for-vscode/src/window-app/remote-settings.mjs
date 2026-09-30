export function remoteSettingsInput(body = {}) {
  return {
    allowedCommands: body.allowedCommands,
    commandPermissions: body.commandPermissions,
    ui: body.ui,
  };
}

export function remoteSettingsResponse(saved) {
  return {
    allowedCommands: saved.allowedCommands,
    commandPermissions: saved.commandPermissions,
    ui: saved.ui,
    telegram: {
      enabled: saved.telegram?.enabled === true,
      botToken: "",
      chatId: "",
    },
  };
}
