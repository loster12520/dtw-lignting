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
 *
 * 命令输入支持图片/通用文件附件：注册时声明 input.attachments，handler 把已准入的
 * ImageBlock/FileBlock 按提交顺序放在 steer 消息最前面，模型才能看到它们。
 */
const name = 'lignting-commands';
const inject = ['commands'];

/** 每条命令的输入提示：按命令文件共用，16 个入口（含别名）复用同一条。 */
const HINTS = {
  'lts.md': '<这里写下你的想法或问题，支持主观性表达，譬如"我想给命令系统加图片附件，但不确定影响面，想先聊清方向"；可附图片/文件；不带参数看小教程>',
  'ltc.md': '<这里填写方向文档路径（通常 .lignting/<feature>/direction.md），也可把文档作为文件附件；可附参考图；不带参数看小教程>',
  'ltp.md': '<这里填写阶段表路径和阶段号，譬如".lignting/<feature>/phases.md Phase 1"；可附阶段表文件；不带参数看小教程>',
  'ltw.md': '<这里填写详细计划路径（通常 .lignting/<feature>/phase-1/round-1.md），也可直接附计划文件；不带参数看小教程>',
  'plan.md': '<这里填写你的需求描述，支持主观性表达，譬如"给profile页面头像旁边增加一个关注按钮，详细要求如下：xxxx"；可附图片/文件；不带参数看小教程>',
  'check.md': '<这里描述 bug 现象/报错文本/复现步骤，譬如"npm run check 报错 xxx，操作步骤：…"；可直接粘贴截图/日志；不带参数看小教程>',
  'review.md': '<这里填写审查档位和范围，譬如"middle 审查 src/host.js 的附件改造"；可附图片/文件；首次无参看教程，之后无参默认 middle>',
};

const COMMANDS = {
  // 小阿卡那体系（主流程）：想法 → 方向文档 → 阶段表 → 分轮计划 → 代码 + 汇报
  'lts':            { file: 'lts.md' },
  'lt-swords':      { file: 'lts.md' },
  'lt-discussion':  { file: 'lts.md' },
  'ltds':           { file: 'lts.md' },
  'ltc':            { file: 'ltc.md' },
  'lt-cups':        { file: 'ltc.md' },
  'ltp':            { file: 'ltp.md' },
  'lt-pentacles':   { file: 'ltp.md' },
  'ltw':            { file: 'ltw.md' },
  'lt-wands':       { file: 'ltw.md' },
  // 独立运维命令：不参与小阿卡那递进链条
  'lt-plan':        { file: 'plan.md' },
  'ltpl':           { file: 'plan.md' },
  'lt-check':       { file: 'check.md' },
  'ltck':           { file: 'check.md' },
  'lt-review':      { file: 'review.md' },
  'ltrv':           { file: 'review.md' },
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

/** 附件摘要：图片/文件各多少，写进给模型的命令说明。 */
function describeAttachments(attachments) {
  const images = attachments.filter((attachment) => attachment.type === 'image').length;
  const files = attachments.length - images;
  return [images > 0 ? `${images} 张图片` : '', files > 0 ? `${files} 个文件` : '']
    .filter(Boolean)
    .join('、');
}

function apply(ctx) {
  ctx.effect(function* () {
    const skillDir = resolveSkillDir();
    for (const [cmd, { file }] of Object.entries(COMMANDS)) {
      const hint = HINTS[file];
      yield ctx.commands.register({
        name: cmd,
        description: `lignting 命令：${file.replace('.md', '')}；${file === 'review.md' ? '不带参数：首次看小教程，之后默认 middle' : '不带参数看小教程'}（流程见 ${join(skillDir, 'command', file)}）`,
        input: { hint, attachments: true },
        handler: ({ agent, rawInput, attachments = [], signal }) => {
          const target = join(skillDir, 'command', file);
          const input = (rawInput ?? '').trim();
          const hasText = input !== '';
          const hasAttachments = attachments.length > 0;
          const empty = !hasText && !hasAttachments;

          if (signal?.aborted) {
            return { kind: 'error', text: `/${cmd}: 命令已取消，未向模型发送内容。` };
          }
          if (!existsSync(target)) {
            return { kind: 'error', text: `/${cmd}: 找不到流程文件 ${target}，请检查 skill 安装。` };
          }

          const text = [
            `用户请求执行 lignting 命令 /${cmd}。`,
            hasAttachments
              ? `随命令附带 ${describeAttachments(attachments)}，已按提交顺序放在本条消息最前面。图片可直接查看；文件是只读副本，消息中带文件名、大小和路径，需要内容时用 read 工具读取。`
              : '',
            hasText
              ? `输入内容：\n${input}`
              : hasAttachments
                ? '用户没有提供文字输入，只提供了附件；请从附件中取得执行本命令所需的上下文。'
                : '',
            empty
              ? '用户没有提供任何文字与附件；请按流程文件开头的《空输入处理》执行（该出教程就出教程，该用默认参数就继续，不要反问）。'
              : '',
            `请先用 read 工具读取 ${target}，严格按其中流程执行。`,
            NEEDS_CODEGRAPH.has(cmd) && !empty
              ? '开始前先做公共约束里的 codegraph 前置检查（见 SKILL.md §1；codegraph 默认项目不是当前仓库时，查询必须带 projectPath）。'
              : '',
          ].filter(Boolean).join('\n\n');

          agent.steer(createUserMessage({
            content: [...attachments, { type: 'text', text }],
            source: { kind: 'user' },
          }));

          return { kind: 'success', text: `已启动 /${cmd}（lignting），流程在对话中继续。` };
        },
      });
    }
  }, 'lignting commands lifecycle');
}

export { apply, inject, name };
