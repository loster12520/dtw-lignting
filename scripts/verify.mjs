#!/usr/bin/env node
/**
 * dsh-lignting 仓库自检：
 *  1) src/host.js 按 ESM 语法检查（node --check）；
 *  2) skills/lignting/ 关键文件齐全（SKILL.md + command/*.md）；
 *  3) 命令路由一致性：src/host.js 的 COMMANDS 与 SKILL.md 路由表指向同一组 command/*.md。
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let fail = false;

// 1) ESM 语法
const r = spawnSync(process.execPath, ['--check', resolve(root, 'src/host.js')], { stdio: 'inherit' });
if (r.status !== 0) {
  console.error('✗ src/host.js: ESM 语法错误');
  fail = true;
} else {
  console.log('✓ src/host.js: ESM 语法 OK');
}

// 2) skill 文件完整性
const skillsDir = join(root, 'skills', 'lignting');
const required = ['SKILL.md', 'command/plan.md', 'command/check.md', 'command/review.md', 'command/discussion.md'];
for (const f of required) {
  const ok = existsSync(join(skillsDir, f));
  console.log(`${ok ? '✓' : '✗'} skills/lignting/${f}`);
  if (!ok) fail = true;
}

// 3) 路由一致性
const skillMd = readFileSync(join(skillsDir, 'SKILL.md'), 'utf8');
const hostJs = readFileSync(resolve(root, 'src/host.js'), 'utf8');
const hostFiles = [...hostJs.matchAll(/\{ file: '([a-z-]+\.md)'/g)].map((m) => m[1]);
const routeFiles = [...skillMd.matchAll(/`command\/([a-z-]+\.md)`/g)].map((m) => m[1]);
const uniqueHost = [...new Set(hostFiles)].sort();
const uniqueRoute = [...new Set(routeFiles)].sort();
const missing = uniqueHost.filter((f) => !uniqueRoute.includes(f));
const extra = uniqueRoute.filter((f) => !uniqueHost.includes(f));
if (missing.length || extra.length) {
  console.error(`✗ 路由不一致 host=${JSON.stringify(uniqueHost)} skill=${JSON.stringify(uniqueRoute)}`);
  fail = true;
} else {
  console.log(`✓ 路由一致：${uniqueHost.join(', ')}`);
}

if (fail) {
  console.error('\n验证失败，请修复后重新运行 npm run verify');
  process.exit(1);
}
console.log('\n全部通过：插件逻辑完整、skill 齐全、路由一致。');
