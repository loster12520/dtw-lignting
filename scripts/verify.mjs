#!/usr/bin/env node
/**
 * dsh-lignting 仓库自检：
 *  1) src/host.js 按 ESM 语法检查（node --check）；
 *  2) skills/lignting/ 关键文件齐全（SKILL.md + command/*.md + references/*.md）；
 *  3) 命令路由一致性：src/host.js 的 COMMANDS 与 SKILL.md 路由表指向同一组 command/*.md；
 *  4) 用户级副本一致性：~/.dsh/skills/lignting/ 与仓库版逐文件比对（存在才查）。
 *     注：DSH 解析 skill 时用户级优先，两份不是软链，靠本检查防漂移。
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';

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
const required = [
  'SKILL.md',
  // 小阿卡那体系（主流程）
  'command/lts.md',
  'command/ltc.md',
  'command/ltp.md',
  'command/ltw.md',
  // 独立运维命令
  'command/plan.md',
  'command/check.md',
  'command/review.md',
  // 小阿卡那各层共用格式
  'references/dialogue-log-format.md',
  'references/plan-doc-format.md',
  'references/whatsnext-bridge.md',
];
for (const f of required) {
  const ok = existsSync(join(skillsDir, f));
  console.log(`${ok ? '✓' : '✗'} skills/lignting/${f}`);
  if (!ok) fail = true;
}

// 2b) 路由表声明过的 command/*.md 必须真实存在（防路由表写了但文件没建）
const skillMdRaw = readFileSync(join(skillsDir, 'SKILL.md'), 'utf8');
const routedFiles = [...new Set([...skillMdRaw.matchAll(/`command\/([a-z-]+\.md)`/g)].map((m) => m[1]))];
for (const f of routedFiles) {
  const ok = existsSync(join(skillsDir, 'command', f));
  if (!ok) {
    console.error(`✗ SKILL.md 路由表指向不存在的文件：command/${f}`);
    fail = true;
  }
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

// 4) 用户级副本一致性（存在才查）
//    DSH 解析 skill 时「用户级优先，包内回退」，两份不是软链：改完仓库不复制过去，
//    实际加载的仍是旧副本。这里把漂移暴露出来。
const userSkillsDir = join(homedir(), '.dsh', 'skills', 'lignting');
const SKIP_DIRS = new Set(['node_modules', '.git']);

function walk(dir, base = dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) walk(abs, base, out);
    else out.push(relative(base, abs).replaceAll('\\', '/'));
  }
  return out;
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

if (!existsSync(join(userSkillsDir, 'SKILL.md'))) {
  console.log(`- 用户级副本不存在（${userSkillsDir}），跳过一致性检查；实际使用包内 skills/lignting/`);
} else {
  const repoFiles = walk(skillsDir).sort();
  const userFiles = walk(userSkillsDir).sort();
  const onlyRepo = repoFiles.filter((f) => !userFiles.includes(f));
  const onlyUser = userFiles.filter((f) => !repoFiles.includes(f));
  const changed = repoFiles.filter(
    (f) => userFiles.includes(f) && sha256(join(skillsDir, f)) !== sha256(join(userSkillsDir, f)),
  );
  if (onlyRepo.length || onlyUser.length || changed.length) {
    console.error('✗ 用户级副本与仓库不一致（DSH 实际加载用户级那份，改了不生效）：');
    if (onlyRepo.length) console.error(`    仅仓库有：${onlyRepo.join(', ')}`);
    if (onlyUser.length) console.error(`    仅用户级有：${onlyUser.join(', ')}`);
    if (changed.length) console.error(`    内容不同：${changed.join(', ')}`);
    console.error(`    修复：把 skills/lignting/ 整体复制到 ${userSkillsDir}`);
    fail = true;
  } else {
    console.log(`✓ 用户级副本一致（${repoFiles.length} 个文件）`);
  }
}

if (fail) {
  console.error('\n验证失败，请修复后重新运行 npm run verify');
  process.exit(1);
}
console.log('\n全部通过：插件逻辑完整、skill 齐全、路由一致。');
