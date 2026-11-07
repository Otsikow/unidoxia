// Public, non-secret provenance for checking which build a preview serves.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
function git(...args) {
  try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return null; }
}
const status = git('status', '--porcelain');
const info = {
  commit: git('rev-parse', 'HEAD'),
  branch: git('branch', '--show-current'),
  dirty: status === null ? null : status.length > 0,
  builtAt: new Date().toISOString(),
  htmlSha256: createHash('sha256').update(readFileSync(new URL('../dist/index.html', import.meta.url))).digest('hex'),
};
writeFileSync(new URL('../dist/build-info.json', import.meta.url), `${JSON.stringify(info, null, 2)}\n`);
console.log(`Build record written (${info.commit ?? 'Git metadata unavailable'}; dirty=${info.dirty}).`);
