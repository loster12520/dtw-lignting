import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dshHomePath } from '@deepseek-ai/dsh-home-paths';
import { createUserMessage } from '@deepseek-ai/dsh-llm';

/**
 * lignting 命令体验层（DSH 侧薄壳，仓库版）。
 * 逻辑全部在 skill 文件里（事实源，其他 agent 也可用）：优先读用户级
 * ~/.dsh/skills/lignting/（可编辑、可跨 agent 共享）；缺失时回退到本包内置的
 * skills/lignting/（dsh plugin add 装完即用，无需手工复制）。
 * 本插件只负责把小阿卡那体系（/lts /ltc /ltp /ltw）与独立运维命令（/lt-plan /lt-check
 * /lt-review）定向到对应文件，让模型读取并执行。全称、简称、兼容别名映射到同一个
 * command/*.md。
 */
const name = 'lignting-commands';
const inject = ['commands'];

const COMMANDS = {
  // 小阿卡那体系（主流程）：想法 → 方向文档 → 阶段表 → 分轮计划 → 代码 + 汇报
  'lts':            { file: 'lts.md',         hint: '<想法/需求描述>' },
  'lt-swords':      { file: 'lts.md',         hint: '<想法/需求描述>' },
  'lt-discussion':  { file: 'lts.md',         hint: '<想法/需求描述>' },
  'ltds':           { file: 'lts.md',         hint: '<想法/需求描述>' },
  'ltc':            { file: 'ltc.md',         hint: '<方向文档路径>' },
  'lt-cups':        { file: 'ltc.md',         hint: '<方向文档路径>' },
  'ltp':            { file: 'ltp.md',         hint: '<阶段表路径> <阶段号>' },
  'lt-pentacles':   { file: 'ltp.md',         hint: '<阶段表路径> <阶段号>' },
  'ltw':            { file: 'ltw.md',         hint: '<详细计划路径>' },
  'lt-wands':       { file: 'ltw.md',         hint: '<详细计划路径>' },
  // 独立运维命令：不参与小阿卡那递进链条
  'lt-plan':        { file: 'plan.md',        hint: '<需求描述>' },
  'ltpl':           { file: 'plan.md',        hint: '<需求描述>' },
  'lt-check':       { file: 'check.md',       hint: '<bug 描述>' },
  'ltck':           { file: 'check.md',       hint: '<bug 描述>' },
  'lt-review':      { file: 'review.md',      hint: '[level] [scope 描述]' },
  'ltrv':           { file: 'review.md',      hint: '[level] [scope 描述]' },
};

/** 需要先做 codegraph 前置检查的命令（小阿卡那里的 lts 例外：讨论常常先于代码）。 */
const NEEDS_CODEGRAPH = new Set(['ltc', 'ltp', 'ltw', 'lt-plan', 'ltpl', 'lt-check', 'ltck', 'lt-review', 'ltrv']);

/** 解析 skill 目录：用户级（~/.dsh/skills/lignting）优先，包内内置回退。 */
function resolveSkillDir() {
  const userDir = dshHomePath('skills', 'lignting');
  if (existsSync(join(userDir, 'SKILL.md'))) return userDir;
  const bundledDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'lignting');
  if (existsSync(join(bundledDir, 'SKILL.md'))) return bundledDir;
  return userDir;
}

function apply(ctx) {
  ctx.effect(function* () {
    const skillDir = resolveSkillDir();
    for (const [cmd, { file, hint }] of Object.entries(COMMANDS)) {
      yield ctx.commands.register({
        name: cmd,
        description: `lignting 命令：${file.replace('.md', '')}（流程见 ${join(skillDir, 'command', file)}）`,
        input: { hint },
        handler: ({ agent, rawInput }) => {
          const target = join(skillDir, 'command', file);
          const input = rawInput.trim();
          const text = [
            `用户请求执行 lignting 命令 /${cmd}。`,
            input ? `输入内容：\n${input}` : '',
            `请先用 read 工具读取 ${target}，严格按其中流程执行。`,
            NEEDS_CODEGRAPH.has(cmd) ? '开始前先做公共约束里的 codegraph 前置检查（codegraph_status）。' : '',
          ].filter(Boolean).join('\n\n');
          agent.steer(createUserMessage({
            content: [{ type: 'text', text }],
            source: { kind: 'user' },
          }));
          return { kind: 'success', text: `已启动 /${cmd}（lignting），流程在对话中继续。` };
        },
      });
    }
  }, 'lignting commands lifecycle');
}

export { apply, inject, name };
