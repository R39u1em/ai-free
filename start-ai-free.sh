#!/bin/bash
# AI Free — скрытый запуск без консоли (macOS/Linux).
# Приложение уходит в фон (nohup), PID пишется в .ai-free.pid
# (для остановки: kill "$(cat .ai-free.pid)").
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1
nohup npm start > /dev/null 2>&1 &
echo $! > .ai-free.pid
