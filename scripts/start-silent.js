// AI Free — скрытый запуск в фоне (кроссплатформенно): `npm run start-silent`.
// Спавнит `npm start` как detached-процесс без привязки к текущему терминалу,
// пишет PID в .ai-free.pid и сразу выходит. Остановка: kill "$(cat .ai-free.pid)".

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const child = spawn('npm', ['start'], {
    cwd: rootDir,
    detached: true,
    stdio: 'ignore',
    shell: true
});

try {
    fs.writeFileSync(join(rootDir, '.ai-free.pid'), `${child.pid}\n`);
} catch {}

child.unref();
console.log('AI Free запущен в фоне. PID:', child.pid);
process.exit(0);
