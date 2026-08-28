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
 * 本插件只负责把 /lt-plan /ltpl /lt-check /ltck /lt-review /ltrv /lt-discussion /ltds
 * 定向到对应文件，让模型读取并执行。全称与简称映射到同一个 command/*.md。
 */
const name = 'lignting-commands';
const inject = ['commands'];

const COMMANDS = {
  'lt-plan':        { file: 'plan.md',        hint: '<需求描述>' },
  'ltpl':           { file: 'plan.md',        hint: '<需求描述>' },
  'lt-check':       { file: 'check.md',       hint: '<bug 描述>' },
  'ltck':           { file: 'check.md',       hint: '<bug 描述>' },
  'lt-review':      { file: 'review.md',      hint: '[level] [scope 描述]' },
  'ltrv':           { file: 'review.md',      hint: '[level] [scope 描述]' },
  'lt-discussion':  { file: 'discussion.md',  hint: '<大需求描述>' },
  'ltds':           { file: 'discussion.md',  hint: '<大需求描述>' },
};

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
            '开始前先做公共约束里的 codegraph 前置检查（codegraph_status）。',
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
