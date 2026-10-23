# 02 · 本项目 skill 的子 agent 下发机制与 profile 委派配置盘点

> 盘点对象：`dsh-lignting` 仓库内 skill（`skills/lignting/**`）、同名用户级副本（`~/.dsh/skills/lignting/**`、`~/.dsh/skills/codegraph/SKILL.md`）、web profile 的委派/子代理配置（`~/.dsh/profiles/web/cordis.patch.yml`）。
> 目的：为「让本项目 skill 与 `@nanmicoder/dsh-agent-teams` 配合」提供事实底稿。
> 取证方式：逐文件通读 + SHA256 逐文件比对 + 关键结论回查插件实现（`@deepseek-ai/dsh-tool-subagent`、`@deepseek-ai/dsh-subagent`）。
> 盘点日期：2026-10-14。

---

## 0. 结论速览

1. **只有 `lignting` 一个项目 skill 会下发子 agent**，且只用了两种工具：`subagent_explore`（探索，`plan.md` / `check.md` / `SKILL.md` 强制）与 `subagent`（`review.md` 审查，1/3/8 路并行）。**`workflow` / `subagent_fork` 在 skill 层从未出现**（虽然 profile 两个都挂着）。
2. 子代理的**并行**已经是硬约定（`SKILL.md:109-110`、`plan.md:26`、`check.md:22`、`review.md:42/116-117`）；但**独立性**只做到"子代理不下结论 / 审查角色不改代码"这一层，**没有任何 verdict / 质量门 / 作用域（写入范围）契约**。
3. 用户级 `~/.dsh/skills/lignting/**` 与仓库版**当前逐文件完全一致（11/11 字节相同）**，子 agent 相关段落零差异；差异风险不在内容，而在**同步靠手动**（`scripts/verify.mjs:80-120` 只做检查不自动复制），且 `codegraph` skill **只存在于用户级**，仓库内没有副本（该项目无 `skills/codegraph/`），`verify.mjs` 不覆盖它。
4. profile 的委派配置**已经为 lignting 量身定制**：`tool-subagent-lignting-explore`（`subagent_explore`，只放行 9 个 codegraph 工具、快速模型、`maxDepth: 1`、固定 persona、强制同步）；顶层 `id: subagent` 把默认 `maxDepth 1 / maxActiveSubagents 8` 抬到 `5 / 15`；`preset-standard` 的 `delegation` 组提供 `subagent`（continuable 后台）、`subagent_fork`、`workflow-ptc`+`workflow`、`list-agents`、`subagent-control`。
5. 与 AgentTeams 对接的**主要空缺**是结构性的（详见 C 节）：skill 层不认识 `agent_teams_*`、`subagent_explore` 的工具白名单**不含**任何团队工具、审查子代理**没有任何 toolFilter/persona/写入范围**、`review.md` 的产出是"评分报告"而不是可机读的 verdict、以及一处**已存在的硬冲突**（profile persona 要求"不下结论"，`lts.md:25-26` 却要求探索子代理下判断）。

---

## A. 各 skill 的子 agent 用法矩阵

### A.1 汇总矩阵

| # | skill / 文件:行号 | 触发条件 | 使用工具 | 是否并行 | 是否含独立验证 |
|---|---|---|---|---|---|
| A1 | `lignting` — `skills/lignting/SKILL.md:106-111`（公共约束「子代理规范」） | 所有命令一律生效（`SKILL.md:91`） | `subagent_explore`（探索）、`subagent`（审查） | **是**：多模块/多链路"一次并行开多个"（:109-110） | 部分：探索子代理"只输出符号/文件/调用链，不下结论"（:109-110），结论由主会话下 |
| A2 | `/lts` — `skills/lignting/command/lts.md:20-27`（局部例外） | 本层做探索时 | `subagent_explore` | 继承公共约束（本层未另提并行） | **弱化**：本层探索子代理"允许下判断"，要求回"现状约束+可疑点"并逐条标注依据强度（:25-26） |
| A3 | `/ltc` — `skills/lignting/command/ltc.md` | 不触发 | **无**（全文无 `subagent`/`workflow` 字样） | 否 | 仅文档级要求：阶段必须"能独立验证"（:34）、依赖图标出串行/可并行（:80） |
| A4 | `/ltp` — `skills/lignting/command/ltp.md` | 不触发 | **无**（全文无 `subagent`/`workflow` 字样） | 否（仅"标出不可并行的步骤"，:53） | 主会话自查：依赖闭包用 `codegraph_callers`/`codegraph_impact`（:32-33）、每步必须配"一条真能跑"的验证命令（:58-68）、验收标准展开成可执行条目供 `/ltw` 自测（:78-80） |
| A5 | `/ltw` — `skills/lignting/command/ltw.md` | 不触发 | **无**（全文无 `subagent`/`workflow` 字样） | 否 | **自证**：按计划逐条跑验收并"贴真实命令与真实输出"（:41-47、:57-61）；偏离必须显式记录（:63-71）；无第三方独立验证 |
| A6 | `/lt-plan`（`/ltpl`）— `skills/lignting/command/plan.md:22-26,28-37` | 第 2 步探索阶段，**强制**（"探索一律通过 `subagent_explore`"） | `subagent_explore` | **是**：精确模式并行定位入口/参照实现；粗略模式第一轮轻量探索、第二轮"带着结论再探索"并并行深挖（:26、:29、:34-36） | 部分：子代理"各自输出符号/文件/调用链"（:26），方案由主会话整理 |
| A7 | `/lt-check`（`/ltck`）— `skills/lignting/command/check.md:20-22` | 第 2 步静态代码走查，**必须**用 | `subagent_explore` | **是**："涉及多条链路时并行开多个"（:22） | 部分：子代理只追调用链/定位入口（:22）；假设排序与验证方法由主会话给（:45-47） |
| A8 | `/lt-review`（`/ltrv`）— `skills/lignting/command/review.md:40-47` | 第 4 步"按档位并行审查"（范围检测出可审文件后） | `subagent`（明确要求 `run_in_background: false`）；明确**不**给 `subagent_explore` 传该参数（:43-45、:116-117） | **是**：低档 1 个（:49）、中档 3 个并行（:61）、高档 8 个并行（:78-80），"同一轮内一次并行启动"（:42、:116） | **最接近独立验证**：角色为纯审查者"绝不修改任何代码"（:3、:115）；多维度交叉；综合评分"取各 agent 最低分作基准、交叉一致 +0.5 星、分歧标注"（:104-105）。但**无 verdict/通过-驳回契约**，产出仅是报告（:96-111） |
| A9 | `lignting` references — `references/whatsnext-bridge.md`、`plan-doc-format.md`、`dialogue-log-format.md` | 只影响主会话，不触发子代理 | **无** | 否 | 提供"独立可追溯"的替代物：状态单源（`whatsnext-bridge.md:22-30`）、上游路径与偏离记录（`plan-doc-format.md:8-19,33-51`）、确定度标注（`plan-doc-format.md:58-59`）、对话记录只追加（`dialogue-log-format.md:75-82`） |
| A10 | 其它 skill：`frontend-design`、`fix`、`karpathy-guidelines`、`diagnose-windows-sandbox-acl`、`figma` | 不触发 | **无**（均为"无"） | 否 | 无 |

### A.2 逐条明细（含原文口径）

**A1 公共约束「子代理规范」（`skills/lignting/SKILL.md:106-111`）**

```
### 3. 子代理规范
- 探索代码优先调用 `subagent_explore` 工具（专职探索子代理：只允许 codegraph 工具、快速模型）。
- 涉及多个模块/多条链路时，一次并行开多个 `subagent_explore`，按模块切分；子代理只输出
  符号/文件/调用链，不下结论。
- 审查类并行子代理直接使用 `subagent` 工具，prompt 按各命令文件内模板内联。
```

- 工具选择规则：**探索 → `subagent_explore`；审查 → `subagent`**。`subagent_fork` / `workflow` **零出现**。
- 并行是"一次并行开多个"，属调用侧纪律，不依赖任何编排脚本。
- 已有约定：探索子代理**不下结论**（这是本项目里唯一的"独立性"约定来源）。
- 空缺：未约定写入范围、未约定 verdict、未约定证据格式（证据只靠 `SKILL.md:91` 公共约束与 `plan-doc-format.md:58-59` 的确定度标注间接覆盖）。

**A2 `/lts` 的局部例外（`command/lts.md:22-27`）**——注意其中 :25-26 与 profile persona 直接冲突，见 C7。

**A6 `/lt-plan` 的强制措辞**：

- `plan.md:24`："探索一律通过 `subagent_explore` 工具进行（它只允许 codegraph 工具、快速模型；若它告警 codegraph 未初始化，停止并按第 0 步处理）"
- `plan.md:25-26`："涉及多个模块/多条链路时，**一次并行开多个 `subagent_explore`**，按模块切分任务，各自输出符号/文件/调用链。"

**A8 `/lt-review` 的工具参数纪律（`review.md:42-47`，与 profile 实现一致）**：

```
> 所有子代理同一轮内一次并行启动。**参数按工具区分，不要混用**：
> `subagent` 默认后台（continuable 模式），必须显式 `run_in_background: false` 才会同步等待结果；
> `subagent_explore` 的 profile 配置里是 `enableRunInBackground: false`，它的工具 schema
> **没有也不接受** `run_in_background` 参数，天然同步等待——不要对它传这个参数。
```

该说法与实现一致：`@deepseek-ai/dsh-tool-subagent/lib/index.js:426` 只在 `backgroundEnabled` 为真时才把 `run_in_background` 放进工具 schema；`:356-357` 在禁用时对该参数直接抛错。**说明 profile 与 skill 文本之间存在真实的双向依赖**（skill 引用了 profile 的配置事实），改动 `cordis.patch.yml` 会直接让 skill 文本过期。

**A8 的报告产出（`review.md:96-111`）**：报告含"变更概览 / 每个子代理一节 / 修复方案 P0-P2 / 综合评分"，保存到 `.lignting/doc/review/YYYYMMDD-HHmmss-cr-report.md`（:108），并更新 `.lignting/.cr-state.json`（:111）。**没有** pass/reject 字段，也**没有**"审查者必须复核每个结论"的机器可校验约束。

### A.3 非 lignting skill：结论为「无」

会话技能目录里的其余 5 个 skill 逐一核过，**均不下发子 agent**：

| skill | 位置（事实源） | 证据 |
|---|---|---|
| `frontend-design` | `C:\Users\cihu0\.claude\skills\frontend-design\SKILL.md`（另有 `frontend-design\frontend-design\SKILL.md` 与 `C:\Users\cihu0\.agents\skills\frontend-design\`） | 全文 42 行，`subagent`/`sub-agent`/`Task`/`workflow`/`parallel` 命中 0 |
| `fix` | `C:\Users\cihu0\.claude\skills\fix\SKILL.md` | 全文 17 行，命中 0 |
| `karpathy-guidelines` | `C:\Users\cihu0\.agents\skills\karpathy-guidelines\SKILL.md` | 全文 70 行，命中 0 |
| `diagnose-windows-sandbox-acl` | `...\@deepseek-ai\dsh-sandbox-windows-acl\assets\diagnose-windows-sandbox-acl\SKILL.md` | 全文 62 行，命中 0；随包内置（含一个 PowerShell 脚本） |
| `figma` | `C:\Users\cihu0\.agents\skills\figma\SKILL.md` | 全文 42 行，命中 0。其 `agents\openai.yaml:1-14` 是**打包清单**（display_name / 图标 / 声明 figma MCP 依赖），**不是子代理定义** |

补充：`C:\Users\cihu0\.dsh\skills\codegraph\SKILL.md` 也不下发子代理，反而明确**反对**派探索子任务（:30-32）："直接回答，不要派探索子任务……另开文件读取子任务或 grep+read 循环都在重复 codegraph 已完成的索引工作"。这与 `plan.md:24` 的"一律通过 `subagent_explore`"在措辞上**相互矛盾**（见 C8）。

### A.4 用户级副本 vs 仓库版：子 agent 段落零差异

- 比对口径：对 `C:\Users\cihu0\.dsh\skills\lignting\**` 与 `D:\project\github\dsh-lignting\skills\lignting\**` 逐文件 SHA256 比对，结果 **11/11 SAME**，且无"仅用户级有"或"仅仓库有"的文件：

| 文件 | 大小 | 结果 |
|---|---|---|
| `SKILL.md` | 6910 B | SAME |
| `command/lts.md` | 8803 B | SAME |
| `command/ltc.md` | 5353 B | SAME |
| `command/ltp.md` | 4675 B | SAME |
| `command/ltw.md` | 4289 B | SAME |
| `command/plan.md` | 3136 B | SAME |
| `command/check.md` | 3403 B | SAME |
| `command/review.md` | 6688 B | SAME |
| `references/whatsnext-bridge.md` | 8021 B | SAME |
| `references/plan-doc-format.md` | 3058 B | SAME |
| `references/dialogue-log-format.md` | 3059 B | SAME |

- 加载优先级：`src/host.js:43-50` 的 `resolveSkillDir()` ——"用户级（`~/.dsh/skills/lignting`）优先，包内内置回退"；`references/whatsnext-bridge.md:58-64` 明确"两者不是软链，没有任何机制保证一致……自检见仓库 `scripts/verify.mjs`"。
- **`codegraph` skill 无仓库副本**：`D:\project\github\dsh-lignting\skills\` 下只有 `lignting/`，即 `codegraph` skill 只存在于用户级 `C:\Users\cihu0\.dsh\skills\codegraph\SKILL.md`，不在版本控制内，`verify.mjs` 也不比对它（`verify.mjs:83` 只比对 `lignting`）。

---

## B. profile 委派配置清单（配置项 → 实际效果）

事实源：`C:\Users\cihu0\.dsh\profiles\web\cordis.patch.yml`（416 行）；挂载清单 `C:\Users\cihu0\.dsh\profiles\web\package.json`；实现回查 `@deepseek-ai\dsh-tool-subagent`、`@deepseek-ai\dsh-subagent`。

### B.1 挂载与文件清单

| 项 | 位置 | 实际效果 |
|---|---|---|
| 应用顺序注释 | `cordis.patch.yml:1-7` | 本文件为最后一层 patch：`dsh-base → dsh-web-app → dsh-web-ui-all → 本文件` → 本文件里的委派行**覆盖**前面各层同名 id |
| 重启前待删的临时挂载 | `cordis.patch.yml:4-7,73-78` | `sidebar-qa` 行是"免重启"临时挂载，重启前必须删，否则同 id 重复挂载（`applyEntryPatches` 不去重） |
| 插件包挂载 | `package.json:6-23`（`dsh.profile.bundles`） | `dsh-lignting`（:10）、`whatsnext-dsh`（:15）、**`@nanmicoder/dsh-agent-teams`（:19）**、`@deepseek-ai/dsh-experimental-agent-team-profile`（:21）、`@deepseek-ai/dsh-experimental-auto-review`（:22） |
| 依赖来源 | `package.json:26-38` | `@nanmicoder/dsh-agent-teams: link:D:/project/github/dsh-agent-teams`（:29）——本地 link 安装，改源码即生效；`dsh-lignting: link:D:/project/github/dsh-lignting`（:34） |
| 仓库侧 bundle patch（另一份，勿混淆） | `D:\project\github\dsh-lignting\cordis.patch.yml:15-17` | 只有一行 `{id: lignting-commands, name: dsh-lignting}`（17 行 / 701 B），与 profile 那份（18028 B）**完全不同**；`docs/install.md:23-30` 提醒切换安装方式前要删旧行，避免重复挂载 |
| AgentTeams 的挂载入口 | `...\node_modules\@nanmicoder\dsh-agent-teams\cordis.patch.yml`（id `agent-teams`，`stateDir: .agent-teams`，`memberProvider: spawn`） | `agent_teams_*` 工具**由 bundle 层注册**，**不在**本 patch 的 `delegation` 组里 → 委派组与团队能力是两条独立挂载路径（见 C11） |

> 说明：`@deepseek-ai/dsh-experimental-agent-team-profile`、`dsh-experimental-auto-review`、`dsh-experimental-schedule-bundle` 三个包**列在 bundles 但 profile 的 `node_modules` 里不存在**；同名包实体存在于 dsh 安装目录（`...\@deepseek-ai\dsh\node_modules\@deepseek-ai\dsh-experimental-*`）。即它们由 dsh 本体提供，非 profile 依赖（见 C12）。

### B.2 `id: tool-subagent-lignting-explore`（`cordis.patch.yml:10-41`）— 探索专用子代理

| 配置项 | 行号 | 实际效果 |
|---|---|---|
| `name: '@deepseek-ai/dsh-tool-subagent'` + `provider: spawn` | :11-13 | 用 spawn 型子代理执行器；这是一个**额外的工具实例行**，与委派组里的 `tool-subagent` 并存 |
| `toolName: subagent_explore` | :14 | 暴露为独立工具名 `subagent_explore`，与 `subagent` 完全分开 |
| `enableRunInBackground: false` | :15 | 该实例**同步等待**：`run_in_background` 参数不会进 schema（实现 `dsh-tool-subagent/lib/index.js:426`），即使传了也抛错（`:356-357`）。这正是 `review.md:44-45` 描述的行为 |
| `agentOptions.provider: deepseek-official` | :23 | 绕开 pi-ai 网关路由的 `deepseek-v4-*` 影子条目：该 provider 档位 `{off,low,high,max}` 完整，避免 `UNSUPPORTED_REASONING_EFFORT`（根因记录在本文件 :112-135，含 2026-10-10 故障说明） |
| `agentOptions.model: deepseek-v4-flash` | :24 | 探索子代理跑快速模型；模型由 `id: llm-deepseek` 行（:160-181）提供定义 |
| `maxDepth: 1` | :25 | 该子代理（及其后代）**不能再往下派**：实现按"绝对深度上限"校验（`dsh-subagent/lib/index.js:400-403`）。即 `subagent_explore` 是叶节点 |
| `persona` | :26-30 | 固定系统提示："第一步必须调用 `codegraph_status`……未初始化立即结束并告警……输出只含符号、文件路径、调用链，**不下结论**" |
| `toolFilter.allow`（9 个） | :31-41 | 白名单**只有** codegraph MCP 工具：`codegraph_status/context/explore/search/node/callers/callees/impact/files`。实际效果——**没有** `read`/`grep`/`glob`/shell，探索只能靠 codegraph；**也没有**任何 `agent_teams_*` 工具（见 C5/C6） |

### B.3 顶层 `id: subagent`（`cordis.patch.yml:412-416`）— 服务级预算

| 配置项 | 行号 | 实际效果 |
|---|---|---|
| `name: '@deepseek-ai/dsh-subagent'` | :413 | 服务级子代理管理器（所有子代理工具行共用它） |
| `maxDepth: 5` | :415 | 覆盖插件默认 `1`（`dsh-subagent/lib/types/index.js:76`、`:2822`）：子代理链最深 5 层 |
| `maxActiveSubagents: 15` | :416 | 覆盖默认 `8`（同上 `:77`、`:2823`）：并发活跃子代理上限 15。`review.md:78-90` 的高档 8 路并行在此预算内，**留有余量但非无限** |

> 注意 patch 语义：`cordis.patch.yml:206-208` 自述"patch 行会整体替换 config"。因此 :412-416 是**整行替换**，未列出的字段回落插件默认，不能假定还有其他保留字段。

### B.4 `preset-standard` 的 `delegation` 组（`cordis.patch.yml:345-395`）— 主会话可见的委派工具面

| id | 行号 | 关键 config | 实际效果（供 lignting 使用的方式） |
|---|---|---|---|
| `delegation`（组） | :345-350 | `isolate.workflowEngine: true` | workflow 引擎在隔离 realm 内 |
| `tool-subagent-control` | :351-352 | — | 提供 `interrupt_agent`/`send_message` 类控制能力（"继续对话/中断"） |
| `tool-subagent-list-agents` | :353-354 | — | 提供 `list_agents`：可枚举自己启动的子代理及状态 |
| `tool-subagent` | :355-361 | `provider: spawn`、`toolName: subagent`、`modelSelectionSettings: true`、`backgroundMode: continuable` | **审查子代理走这一行**。continuable → 默认后台、返回 id、可用 `send_message` 续聊（实现 `dsh-tool-subagent/lib/index.js:372,400`），故 `review.md:43` 要求显式 `run_in_background: false` 才同步。**未配置 `agentOptions`** → 走主会话默认 provider/model（`agent-default-model` 行 :87-92：`deepseek/deepseek-flash/reasoningEffort: high`）；**未配置 `toolFilter`/`persona`/`maxDepth`** → 审查子代理持有全量工具（含写文件）、继承服务级 `maxDepth 5`（见 C6/C4） |
| `tool-subagent-fork` | :362-367 | `provider: fork`、`toolName: subagent_fork`、`backgroundMode: continuable` | 存在"继承上下文的 fork 子代理"，但 **lignting 全部命令文本零引用** |
| `tool-subagent-codex` | :368-375 | `disabled: true` | 不可用 |
| `tool-subagent-claude-code` | :376-383 | `disabled: true` | 不可用 |
| `workflow-ptc` | :384-387 | `provider: spawn` | workflow 引擎的 spawn 语义 |
| `tool-workflow` | :388-389 | — | 暴露 `workflow` 工具（大规模扇出编排）；**lignting 未使用**（`SKILL.md:106-111` 只给 `subagent_explore`/`subagent` 两条硬规则） |
| `tool-ralph` | :390-395 | `disabled: true`、`subagentProvider: spawn`、`maxRounds: 64` | 不可用（但配置里保留了 spawn provider 与轮次上限） |

其余与委派相邻的既有挂载（影响子代理可见能力，但不属委派组）：

| id | 行号 | 效果 |
|---|---|---|
| `mcp-codegraph` | :44-54 | codegraph MCP 以 stdio 启动，`--path D:\studio_frontend\studio_frontend` → **索引固定指向另一个项目**，当前 workspace 不是它（见 C9） |
| `mcp-figma` | :60-71 | node + mcp-remote 代理 `https://mcp.figma.com/mcp`，`toolCallTimeoutMs: 120000` |
| `compaction`（组） | :317-344 | `modelPolicies` 把 `deepseek-exact(deepseek-flash)` 与 `deepseek-official/deepseek-v4-flash` 阈值降到 0.5（:330-336）——探索子代理所用模型正是后者，压缩更早触发 |
| `planning`（组） | :256-316 | plan mode 插件与长指令；子代理继承的工具目录在模式间保持一致（:283-289） |

### B.5 skill 文本 ↔ profile 配置的既有耦合（改动风险点）

| skill 文本 | 引用的 profile 事实 | 风险 |
|---|---|---|
| `skills/lignting/command/review.md:44-45` | `enableRunInBackground: false` 与工具 schema 行为 | 改 `cordis.patch.yml:15` 会让该条文失真 |
| `skills/lignting/command/plan.md:24`、`SKILL.md:108` | `subagent_explore` 存在且"只允许 codegraph 工具、快速模型" | 删/改 `tool-subagent-lignting-explore` 行会让该条失效（工具名不存在时无降级说明） |
| `skills/lignting/SKILL.md:93-104` | `mcp-codegraph` 的可用性与 `--path` | 探索子代理的 persona 会强制 `codegraph_status`，MCP 指向别的项目时它仍"成功"，结论却是错的（C9） |

---

## C. 现有约定的空缺（每条附路径 + 行号）

### C1 缺**持久成员**与成员身份

- 事实：skill 层只有一次性 spawn 语义——`SKILL.md:106-111` 规定"探索用 `subagent_explore`、审查用 `subagent`"，`review.md:42` 要求"同一轮内一次并行启动"。profile 侧对应行是 `cordis.patch.yml:355-361`（`provider: spawn`）与 `:362-367`（`provider: fork`）。
- 空缺：**没有任何 skill/profile 文本描述成员名、角色、常驻身份、邮箱**。每次调用都是新子代理；`list_agents`（`cordis.patch.yml:353-354`）只能列出本次会话自建的孩子，不是团队成员表。
- 影响：AgentTeams 的"captain + 持久成员"模型在 skill 层没有对应概念，需要在新方案里显式定义"哪个 AgentTeams 成员承担 `/ltp` 的计划、哪个承担 `/ltw` 的执行、哪个承担 `/ltrv` 的审查"。

### C2 缺**任务板**与共享状态通道（且已有两套私有状态）

- 事实 1：lignting 把状态单源交给 whatsnext：`skills/lignting/SKILL.md:67-69`、`references/whatsnext-bridge.md:22-30`（"小阿卡那不写状态"）、`:48-56`（"一个体系 = 一个 whatsnext 任务"）、`:66-84`（`.whatsnext/tasks/<任务>/index.md` + `plan.md` 复选框）；`.whatsnext/` 走 `.git/info/exclude` 私有（`:83-84`）。
- 事实 2：AgentTeams 的状态在 `<session workspace>/.agent-teams/<teamId>/`（`...\@nanmicoder\dsh-agent-teams\cordis.patch.yml`，`stateDir: .agent-teams`），本项目已有 `.agent-teams/dsh-agent-teams-capability-report/team.json` + `inbox/`。
- 空缺：**两套状态载体互不认识**——skill 里没有出现 `agent_teams_*`／任务板／inbox 的任何字样（`SKILL.md`、7 个 `command/*.md`、3 个 `references/*.md` 全文命中 0）。谁在什么条件下读/写任务板，完全未定义。
- 影响：若不显式规定优先级，会出现"`plan.md` 勾选框说做完了、任务板说 in_progress"的双源漂移，正是 `whatsnext-bridge.md:30` 警告过的失败模式。

### C3 缺**质量门 / verdict 契约**

- 事实：`review.md:3` 定义"纯审查角色，不修改任何代码"，`:96-111` 定义报告模板与保存路径，`:104-105` 的综合规则是"取各 agent 最低分作基准；交叉验证一致 +0.5 星；有分歧标注"。
- 空缺：**没有** `pass / needs_revision / reject` 之类的结构化结论，**没有**"审查通过才允许进入下一环"的门禁，**没有** evidence/commandsRun 字段要求。`review.md:118-120` 只要求"范围在报告开头标注"、"必须更新 `.cr-state.json`"。
- 影响：AgentTeams 的质量门（verdict + findings + acceptanceResults）无法从 lignting 现有产物机读出来，需要新增"审查产物的结构化字段"约定，或把 `/ltrv` 的输出映射成任务板的质量门字段。

### C4 缺"**实现者 ≠ 验证者**"的强制

- 事实：`/ltw` 的验证是**自证**——`ltw.md:41-47`（按计划逐条跑验收、失败不粉饰）、`:57-61`（贴真实命令与真实输出）；`review.md` 是独立角色但**由主会话自行发起**（`review.md:21-27` 范围检测），并非流程强制环节：`SKILL.md:48-59` 的四层递进链里**没有** `/ltrv` 位置，`:73-83` 明确把 `/lt-review` 划为"独立运维命令，不参与小阿卡那体系"。
- 空缺：没有"实现完成后必须由独立 member 复核"的规则，也没有"审查者不得审查自己产出"的声明。
- 影响：AgentTeams 里必须明确"实现与验证由不同 member 承担"，并把它写回 skill（否则 `/ltw` 的自证会被当作已验证）。

### C5 缺**机器可校验的作用域（写入范围）声明**

- 事实：现有"范围"全是自然语言——`ltw.md:39`（"只做本轮范围内的改动"）、`ltw.md:102-105`、`ltp.md:74-75`（"本轮范围……明确不做什么（防顺手改无关代码）"）、`plan.md:56`（"明确不做的事"）、`plan.md:59`（"计划输出后等待用户确认；确认后才进入编码"）。
- 空缺：调用子代理时**没有任何**范围参数可供校验：`subagent`/`subagent_explore` 的工具面（`cordis.patch.yml:355-361`、`:10-41`）里没有写入范围字段，只有 `toolFilter`（按工具名放行）——而 `toolFilter` **只配在 lignting-explore 那一行**（`:31-41`），审查用的 `tool-subagent` 行完全没有。
- 影响：审查子代理（`subagent`）理论上**能写文件**，只能靠 `review.md:3,115` 的文字"绝不修改任何代码"约束；AgentTeams 的 `inScope`/`changedPaths` 契约在 skill 层没有对应物。

### C6 缺审查子代理的 **persona / 工具白名单 / provider 指定**

- 事实：`cordis.patch.yml:355-361` 的 `tool-subagent` 行**只有** `provider`/`toolName`/`modelSelectionSettings`/`backgroundMode`；没有 `agentOptions`（→ 走主会话默认 `deepseek/deepseek-flash`，见 `:87-92`）、没有 `toolFilter`、没有 `persona`、没有 `maxDepth`（→ 继承服务级 5，见 `:415`）。对照 `tool-subagent-lignting-explore` 行（`:10-41`）三样都有。
- 空缺：审查子代理缺少"只输出结论+证据、不改代码、按维度分派"的 persona 固化；也缺少显式 provider 指定——而本文件 `:112-135` 记录的故障（2026-10-10 `UNSUPPORTED_REASONING_EFFORT`）正是走主会话默认路由时会踩的坑，探索行已绕开，审查行**未显式绕开**。
- 影响：并行审查（最多 8 路，`review.md:78-90`）在默认路由下缺少同等保障；一旦网关侧条目变动，最先炸的是审查链路。

### C7 已存在的**硬冲突**：探索子代理被要求"不下结论"，`/lts` 却要求它下判断

- profile persona（`cordis.patch.yml:26-30`）："输出只含符号、文件路径、调用链，**不下结论**。"（作为子代理系统提示注入）
- skill 例外（`skills/lignting/command/lts.md:25-26`）："**`subagent_explore` 用法不同**：本层的探索子代理**允许下判断**（它不再只输出符号清单），但要求回'现状约束 + 可疑点'，并对每条标注依据强度。"
- 冲突点：persona 是 profile 层注入的**硬约束**，skill 文本无法覆盖它；`lts.md:20-27` 只在"命令文件里声明例外"这一层成立（`SKILL.md:129-136` 规定的局部例外机制），**管不到 profile persona**。实际执行时 `/lts` 的例外要求很可能被 persona 压制。
- 影响：这是"skill 约定与 profile 约定打架"的第一实例，配合 AgentTeams 时同类问题会更多——需要一层明确的**优先级声明**（profile persona > skill 例外？还是反过来？）。

### C8 口径冲突：全局 `codegraph` skill 反对派探索子任务，lignting 强制派

- `C:\Users\cihu0\.dsh\skills\codegraph\SKILL.md:30-32`："**直接回答，不要派探索子任务**：……另开文件读取子任务或 grep+read 循环都在重复 codegraph 已完成的索引工作，更贵且更慢。"
- `skills/lignting/command/plan.md:24`："探索**一律**通过 `subagent_explore` 工具进行"；`check.md:20`："静态代码走查（**必须**用 `subagent_explore`）"。
- 空缺：两条规则同时被加载（`SKILL.md:104` 要求"详细规则见 `codegraph` skill"），却给出相反动作，没有优先级或适用域说明（codegraph 那条针对主会话直接回答，lignting 那条针对成规模需求/多链路——但文本没写这层限定）。

### C9 codegraph MCP **固定指向另一个项目**，探索子代理会"成功但答错"

- 事实：`cordis.patch.yml:44-54`，`args` 里 `--path D:\studio_frontend\studio_frontend`；而探索子代理的 persona 强制"第一步必须调用 `codegraph_status`；若未初始化立即结束"（`:27-29`），`plan.md:24`、`check.md:6-9` 也把 `codegraph_status` 当门槛。
- 空缺：skill 层没有任何"当前项目 ≠ codegraph 索引项目"的检查或告警；索引**总是** initialized（因为指向的是另一个真实项目），门槛永远不会拦下，`subagent_explore` 会照着错误的图谱给出符号/调用链。
- 影响：AgentTeams 里若让探索成员承担"定位改动点"，这个坑会直接污染计划（`/ltp` 的依赖闭包 `ltp.md:28-37` 也依赖同一图谱）。**建议在新方案里显式声明每个成员/任务所依赖的 codegraph 目标项目。**

### C10 副本同步与"事实源"只有手动检查

- 事实：`scripts/verify.mjs:7-8`（注释说明用户级优先、不是软链、靠本检查防漂移）、`:80-120`（存在才比对；不存在则打印跳过）、`:115`（失败时提示"把 `skills/lignting/` 整体复制到用户级"）。当前状态：11/11 一致（A.4）。
- 空缺：**没有** git hook / CI / 自动复制；`npm run verify` 需人工触发。且 `verify.mjs:83` 只把 `lignting` 纳入比对——`codegraph` skill（只存在用户级）**完全在版本控制与一致性检查之外**（A.4）。
- 影响：AgentTeams 方案若要求"skill 文本即协作契约"，契约的发布路径必须是自动的，否则多成员读到不同版本。

### C11 委派组里**没有 AgentTeams 行**，skill 也感知不到团队工具

- 事实：`cordis.patch.yml:345-395` 的 `delegation` 组内 9 条行全部是 `subagent*` / `workflow*` / `ralph`，**无 `agent-teams`**；AgentTeams 的挂载在 bundle 层（`package.json:19` + 包内 `cordis.patch.yml` 的 `id: agent-teams`），并把 `memberProvider: spawn`、`stateDir: .agent-teams` 作为自己的配置。
- 事实：`tool-subagent-lignting-explore` 的 `toolFilter.allow`（`cordis.patch.yml:31-41`）只有 9 个 codegraph 工具，**没有** `agent_teams_*`；`subagent` 行无白名单，拿到的是**主会话全量工具**（含 `agent_teams_*`，但 skill 没告诉它去用）。
- 空缺：skill 文本（`SKILL.md:106-111`）与委派组配置都没有"谁读任务板、谁发消息、谁认领任务"的写入；AgentTeams 的 `memberProvider: spawn` 与 lignting 的 `subagent_explore`（另一个 spawn 实例、`maxDepth: 1`）之间也没有关系声明。

### C12 相关实验 bundle 的归属与用途未与 skill 打通（待确认）

- 事实：`package.json:21-22` 声明 `@deepseek-ai/dsh-experimental-agent-team-profile`、`@deepseek-ai/dsh-experimental-auto-review`；但 profile 的 `node_modules` 下**不存在**这两个包（`...\profiles\web\node_modules\@deepseek-ai\dsh-experimental-auto-review\package.json` 不存在），同名包实体位于 dsh 安装目录（`...\@deepseek-ai\dsh\node_modules\@deepseek-ai\dsh-experimental-auto-review`、`dsh-experimental-agent-team-profile`、`dsh-experimental-tool-agent-team`）。
- 空缺：`auto-review`（名字直指自动质量门）与 lignting 的 `/ltrv`（`review.md`）之间**没有任何交叉引用**；`agent-team-profile` 与 AgentTeams 的关系也未在本项目 skill 中出现。
- 待确认（应并入 t1/t3 的插件盘点）：这两个实验 bundle 是否已实际挂载、是否提供质量门/团队 profile 能力、是否需要与 `/ltrv` 的 verdict 契约合并——本文件只记录"它们出现在 bundles 里、且与 skill 零耦合"这一事实。

---

## 附：取证清单

| 类别 | 路径 |
|---|---|
| 项目 skill | `skills/lignting/SKILL.md`；`skills/lignting/command/{lts,ltc,ltp,ltw,plan,check,review}.md`；`skills/lignting/references/{whatsnext-bridge,plan-doc-format,dialogue-log-format}.md` |
| 用户级副本 | `C:\Users\cihu0\.dsh\skills\lignting\**`（11 文件，与仓库逐文件 SAME）；`C:\Users\cihu0\.dsh\skills\codegraph\SKILL.md`（仓库无副本） |
| 其它 skill | `C:\Users\cihu0\.claude\skills\{fix,frontend-design}\SKILL.md`；`C:\Users\cihu0\.agents\skills\{karpathy-guidelines,figma}\SKILL.md`；`...\dsh-sandbox-windows-acl\assets\diagnose-windows-sandbox-acl\SKILL.md` |
| profile 配置 | `C:\Users\cihu0\.dsh\profiles\web\cordis.patch.yml`（416 行）；`C:\Users\cihu0\.dsh\profiles\web\package.json`（39 行） |
| 仓库插件/自检 | `src/host.js`（80 行）；`scripts/verify.mjs`（126 行）；`cordis.patch.yml`（17 行）；`docs/install.md` |
| 实现回查 | `...\@deepseek-ai\dsh-tool-subagent\lib\index.js:256-269,356-360,371-372,400,426,508-519`；`...\@deepseek-ai\dsh-subagent\lib\types\index.js:76-77`（= `lib\index.js:2822-2823`）、`lib\index.js:400-403` |
| 团队插件 | `...\node_modules\@nanmicoder\dsh-agent-teams\package.json`（0.1.23）、`...\cordis.patch.yml`（`stateDir: .agent-teams`、`memberProvider: spawn`） |
