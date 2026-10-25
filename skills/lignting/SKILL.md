---
name: lignting
description: >-
  lignting 命令中枢。小阿卡那（Minor Arcana）体系：/lts（宝剑·想法讨论）、
  /ltc（圣杯·方案细化）、/ltp（星币·细节敲定）、/ltw（权杖·具体执行）；
  独立运维命令：/lt-plan、/ltpl、/lt-check、/ltck、/lt-review、/ltrv。
  （/lt-discussion、/ltds 是 /lts 的兼容别名。）
  当用户输入上述斜杠命令，或表达"讨论想法/聊架构/方案讨论""规划需求/做个计划"
  "排查 bug/查一下这个报错""审查代码/review 一下""开始实现/执行这一轮"等意图时加载本 skill，
  按路由表读取 command/ 下对应文件并严格执行。
metadata:
  commands:
    - name: lts
      aliases: [lt-swords, lt-discussion, ltds]
      file: command/lts.md
      purpose: 宝剑层·想法讨论（分相讨论 → 方向文档）
    - name: ltc
      aliases: [lt-cups]
      file: command/ltc.md
      purpose: 圣杯层·方案细化（方向文档 → 阶段表 + 核心验收标准）
    - name: ltp
      aliases: [lt-pentacles]
      file: command/ltp.md
      purpose: 星币层·细节敲定（阶段 → 分轮详细计划）
    - name: ltw
      aliases: [lt-wands]
      file: command/ltw.md
      purpose: 权杖层·具体执行（详细计划 → 代码 + 四段汇报）
    - name: lt-plan
      aliases: [ltpl]
      file: command/plan.md
      purpose: 需求规划（精确/粗略两档，小阿卡那之外的轻量入口）
    - name: lt-check
      aliases: [ltck]
      file: command/check.md
      purpose: Bug 排查（多轮信息收割 + 有计划的插桩）
    - name: lt-review
      aliases: [ltrv]
      file: command/review.md
      purpose: 代码审查（low/middle/high 三档）
user-invocable: true
---

# lignting

lignting 是一组开发流程命令的中枢 skill。所有命令的具体流程都在本 skill 目录的 `command/` 子目录下，
本文件只负责路由与公共约束。

## 小阿卡那体系（主流程）

从「一个还没成形的想法」到「代码写完并汇报」的四层递进。**每层的产物是下一层唯一的输入**，
不跨层引用。命名取自小阿卡那（Minor Arcana）四组牌的性格：风（思辨）→ 水（愿景）→
土（务实）→ 火（行动）。

> 另有一份跨层的 `.lignting/<feature>/roadmap.md`：**人读总计划视图，不是任何命令的输入**；
> 细节从各层源文档派生，冲突时以源文档为准。格式见
> [references/roadmap-format.md](references/roadmap-format.md)。

| 层 | 命令（全称/简称） | 输入 → 产物 | 不可替代的判断力 | 目标文件 |
|---|---|---|---|---|
| 宝剑 | `/lts`、`/lt-swords` | 想法 → 方向文档 | 分相讨论；区分开放问题与分叉决策 | `command/lts.md` |
| 圣杯 | `/ltc`、`/lt-cups` | 方向文档 → 阶段表 + 核心验收标准 | 阶段划分；指出最核心、必须覆盖的能力 | `command/ltc.md` |
| 星币 | `/ltp`、`/lt-pentacles` | 阶段表 + 阶段号 → 分轮详细计划 | 改动顺序（中间态坏得最少）；依赖闭包；回滚点 | `command/ltp.md` |
| 权杖 | `/ltw`、`/lt-wands` | 详细计划 → 代码 + 四段汇报 | 计划与现实的偏离必须明说 | `command/ltw.md` |

**跳层是正常用法**，不是违规：

- 需求已经清楚、只需排期 → 直接 `/ltc`
- 已有阶段表、只需细化某一轮 → 直接 `/ltp`
- 单点小改动 → 不用小阿卡那，走 `/ltpl`

**跨对话**：小阿卡那与 `whatsnext` 插件（`/wn*`）配合，用 `.lignting/`（随 git）存方案、
用 `.whatsnext/`（私有）存任务状态。分工与接续规则见
[references/whatsnext-bridge.md](references/whatsnext-bridge.md)，各层都会引用它。
各层共用的格式定义见 [references/](references/)：
`dialogue-log-format.md`（对话记录）、`plan-doc-format.md`（方案文档）、
`roadmap-format.md`（总计划 `roadmap.md`，人读视图，不是命令输入）。

## 独立运维命令（不参与小阿卡那体系）

用于临时维护与救火，不参与上述递进链条：

| 命令（全称/简称） | 用途 | 目标文件 |
|---|---|---|
| `/lt-plan`、`/ltpl` | 单点小改动的需求规划（精确/粗略两档），轻量入口 | `command/plan.md` |
| `/lt-check`、`/ltck` | Bug 排查（信息收割 + 有计划的插桩） | `command/check.md` |
| `/lt-review`、`/ltrv` | 代码审查（low/middle/high 三档） | `command/review.md` |

> `/ltpl` 与 `/ltp` 只差一个字母，注意区分：**`/ltpl` 是轻量规划，`/ltp` 是星币层细化。**

## 执行方式

收到任一命令后，**第一步用 read 工具读取对应文件**（本 skill 目录即 `resourceBase`，
文件路径 = `<resourceBase>/command/<file>`；若拿到了绝对路径指令则直接读），
然后严格按文件内流程执行，不得跳步、不得自创流程。
**读完后先看文件开头的《空输入处理》**：无文字且无附件时先按该节输出教程，不要直接进入第 0 步。

## 公共约束（所有命令一律生效）

### 1. codegraph 前置检查

- 任何代码探索开始前，先确认 codegraph 指向**当前项目**：
  - 会话有 `codegraph_status` 就调用；
  - 没有该工具时，用 `codegraph status` CLI 或 `codegraph_explore` 带
    `projectPath=<项目根>` 做等价检查。
- **默认项目可能不是当前仓库**：所有 `codegraph_explore` / 结构查询都必须显式传
  `projectPath=<当前项目根绝对路径>`，否则会“成功但答错”。
- 若项目没有 `.codegraph/`（未初始化）：**立即停止探索**，要求用户先运行 `codegraph init -i`，
  不得用 grep/read 绕过继续探索。

### 2. 代码探索强制走 codegraph

- 结构类问题（符号定义、调用关系、影响面、文件结构）一律用 codegraph 工具；
  本会话可用 `codegraph_explore`（必须带 `projectPath`）。若环境还提供
  `codegraph_context` / `codegraph_search` / `codegraph_callers` / `codegraph_callees`，按需组合。
- 禁止用 grep 替代结构查询；不要用 grep 复核 codegraph 结果。
- 详细规则见 `codegraph` skill。

### 3. 子代理规范（Agent Teams 优先）

#### 3.1 先探工具面，整轮只选一套

下发子代理前，只看当前会话的工具表，不要调用不存在的工具试探：

- `team`：有 `wait_agent` 且 `team_task_create`；
- `explore`：有 `subagent_explore`；
- `native`：有 `subagent`。

选路：`team` → Agent Teams；否则 `explore` → `subagent_explore`；否则 `native` → `subagent`；
都没有 → 主会话自己做，不硬造委派。**同一轮只走一套，禁止混用。**

本机 Agent Teams 的工具名是 `spawn_teammate` / `send_message` / `list_agents` / `wait_agent` /
`interrupt_agent` / `team_task_create|list|get|update`。不要写或调用 `agent_teams_*`（不存在）。

#### 3.2 成员与权限

- 只有 Lead 能 `spawn_teammate`、`interrupt_agent`、`team_task_update(reassign)`；成员越权会报错。
- `spawn_teammate` 参数：`name`（lower-kebab，≤64，不能叫 `lead`，失败也永久占用）、
  `description`、`prompt`、`context`。
- `context=fresh` 不带本对话历史；`fork` 只继承 Lead **已完成**轮次（不含当前轮）。
  探索/审查默认 fresh，延续本对话才 fork。
- 成员共享同一 cwd 与文件系统；spawn 前定好目录，之后 Lead 不再切 cwd。
- 名额累计：本机成员上限 8（含失败，无踢人工具），活动任务 256。高审查 8 路正好占满，
  已有成员时先复用或分批。

#### 3.3 探索

- 按模块/链路切片，每片一个 `spawn_teammate`（fresh）；≥2 个独立切片才并行。
- 成员是通用工具面（没有 explore preset 的硬白名单），prompt 必须自包含，并写死：
  - 先做 codegraph 前置检查；未初始化就停止并原样上报；
  - 只用 codegraph 查结构（调用 `codegraph_explore` 必须带 `projectPath=<当前项目根>`；
    MCP 默认项目可能不是当前仓库）；
  - 禁止 grep/read 替代结构查询；
  - 只输出符号、文件、调用链、影响面；不下结论、不给修改方案；
  - 结果用 `send_message` 发回 lead。

#### 3.4 审查

- 路数沿用 `review.md` 的 low/middle/high = 1/3/8 路；每路一个 fresh 成员。
- 每路 prompt 从 `review.md` 模板内联，写清审查范围、只读、输出格式
  （PASS/FAIL + 文件:行 + 分级 findings）；审查者≠实现者。
- 多路审查 = 多成员；结果用 `send_message` 回 lead。
- high 档 8 路正好达到本机成员上限；已有成员时先复用或合并维度，不要硬 spawn 第 9 个。

#### 3.5 执行（并行写）

- 需要并行写时，用 `team_task_create` 建任务：`subject`、`description`（目标 + 验收 +
  输出格式）、`blocked_by`、`write_scopes`（workspace 相对 POSIX 前缀）。
- 有先后依赖写 `blocked_by`；成员 `team_task_list` → `team_task_get` →
  `team_task_update(claim, expected_revision=当前 revision)` → 执行 → `complete`。
- 一个任务一个 owner；并行任务的 `write_scopes` 不重叠。`write_scopes` 只是重叠告警，不是锁。
- 成员直接在共享工作区改文件；Lead 负责最终 diff 与测试，不把最终验证交给实现者。

#### 3.6 等待与汇总

- 先 `list_agents`，确认有 running/provisioning 的必需成员，再 `wait_agent`
  （默认 30s，允许 10s–1h；只观察调用后的变化）。
- 返回 `{timedOut}` 或 `{noProgress}` 后重新 `list_agents` / `team_task_list`；
  `noProgress` 表示没人可跑，先 `send_message` 唤醒再等，不要空转轮询。
- 任务更新必须带当前 `expected_revision`；旧 revision 会被拒，不要覆盖。
- 必需任务全部 completed、且无 running/provisioning 的必需成员，才能给最终答复；
  按 task id/owner/status 汇总结果与遗留风险，失败项必须显式报告。

#### 3.7 回退 native（仅 Team 不可用；整轮不混用）

- 探索：有 `subagent_explore` 就优先用；否则用 `subagent`，prompt 写全 codegraph 规则与项目根。
- 审查/执行：用 `subagent`；需要继承本对话已完成轮次时用 `subagent_fork`。
- `subagent` / `subagent_fork` 参数：`prompt`、`description`、可选 `cwd`；
  **不传** `run_in_background`。
- 调用立即返回 child id，结果以**完成通知**回到对话；追问用
  `send_message({agent_id, message})`，中断用 `interrupt_agent({agent_id})`。
- 注意：Team 可用时，Team 版 `send_message`/`interrupt_agent`/`list_agents` 会遮蔽 native
  同名工具；不要在同一轮里先用 native、再用 Team 版追问。

#### 3.8 禁止事项

- 禁止调用不存在的 `agent_teams_*`；禁止混用 Team 与 native 两套工具面。
- 禁止 teammate 调 `spawn_teammate` / `interrupt_agent`；禁止把 `write_scopes` 当锁或写
  绝对路径/盘符/`..`。
- 禁止跳过 `expected_revision` 覆盖任务；禁止把 `send_message` 当同步调用；禁止轮询
  `wait_agent`。
- 禁止审查者=实现者；禁止未收齐必需成员结果就给最终答复。

### 4. 提问规范

#### 4.1 通用（所有命令）

- **每个问题先给背景**：向用户提问前，先用 1–3 句交代它从哪来、前提是什么
  （哪条已定结论、哪个被否决的方案、哪段讨论）。用户手里没有你的上下文，
  没有背景的问题等于让用户猜。
- 引用**前文出现过的术语、结论、代号**时，**必须**带上可点击的回指链接
  （写法与锚点规则见 [references/dialogue-log-format.md](references/dialogue-log-format.md)
  的「回指链接」一节）。
- 需要向用户确认时，优先使用 `ask_user_question` 工具；背景写在 `question` 里，
  选项跟在后面，推荐项放在第一位。
- **非讨论层命令**（`/lt-plan`、`/lt-check`、`/lt-review`）仍按每轮最多 6 题：
  >6 拆两轮、>12 拆三轮，以此类推。
- 若无法使用提问工具，改为对话提问，非讨论层每次只抛一个问题（>6 时每轮两个、
  >12 时每轮三个），同样带背景、带选项与推荐项。

#### 4.2 讨论层（`/lts`、`/ltc`、`/ltp`）

- **先判断后提问**：每次回复先给“我的判断 + 依据 + 还没定的”，再问；不要先甩结论
  让用户做决策，也不要只给结论不给判断。
- **每次 3–4 个核心问题，硬上限 4**：真正阻塞的问题不足 3 个时不凑数；超过 4 个取
  最核心的 3–4 个，其余列“待问清单”（只列标题）下一轮再问。
- **每个问题四段式**（顺序固定，缺一不可）：
  1. **背景**：1–3 句，从哪来、依赖哪条已定结论/被否决方案，带回指链接；
  2. **问题**：一行一个问句，一问只做一个决策；
  3. **为什么这么考虑**：推理链、依据、不确定点、不同回答会改变什么；
  4. **推荐答案**：明确推荐一个答案 + 理由 + 选错的代价。
- **开放问题**（还在长、不是互斥选择）：普通对话直接问，不给选项；推荐答案写
  “我倾向 X，因为…”，不写成 A/B/C。
- **分叉决策**（两边都通 + 只能选一 + 选错返工）：用 `ask_user_question`；选项
  推荐项第一；四段写进 `question` 字段；一次最多 4 个。
- **无工具时**：仍在一回复里编号列 3–4 个四段式问题；不再退回“一次只问一个”；
  用户只答部分时只追问未答项，不重复已答、不替用户选。
- **对外不播报层级/相**：不写“当前层 / 当前相 / 相变：X→Y / 退回 X 相”；讨论重点
  变化用自然过渡（“先对一下我的判断…目前站得住的…还没定的…所以这轮…”），保留
  已定结论、未定、本轮要做什么。文档头部的 `> 层级：` 元数据保留；对话记录不写相名。

### 5. 输出规范

- 计划 / 报告 / 分析默认直接输出到对话，不创建文件；只有用户要求保存或流程本身要求落盘
  （如小阿卡那各层的方案文档、总计划 roadmap、对话记录与执行报告，review 的状态文件与报告）
  时才写文件。

### 6. 代码修改

- 流程产物（计划、修复方案）必须经用户确认后才动手改代码；修改遵循最小改动、不改无关代码。

### 7. 局部例外

命令文件**可以声明对本节公共约束的局部例外**（例如 `lts.md` 放宽 codegraph 前置检查、
改变提问方式）。规则：

- 例外必须写在**命令文件里**，不得写进公共约束——避免污染其他命令。
- 命令文件的例外声明**优先于**本节的通用规则。
- 例外要写明**范围**（仅本命令内生效）与**理由**，不得静默放宽。

### 8. 输入、附件与空输入

#### 8.1 输入格式

- 所有命令都接受**图片**和**通用文件**附件（DSH 命令入口；其他 agent 工具按其
  图片输入能力处理）；附件是输入的一部分，不要让用户“再发一次/再贴一次”。
- 图片进入模型上下文后可直接查看；文件在消息里以“文件名/大小/只读路径”形式出现，
  需要内容时用 `read` 读取。
- 用户在文字里给出绝对路径但没有作为附件时：图片用 `read_image`，其他文件用 `read`。
- 只有附件、没有文字也算有效输入，按附件内容执行正式流程。

#### 8.2 空输入

“空输入” = **没有文字且没有附件**。此时不要进入正式流程，按命令文件开头的
《空输入处理》执行：

1. 输出一篇小教程；教程由模型按当前项目重新组织，不能照抄种子、不能编造。
2. 教程必须包含：用途与适用/不适用、输入怎么给（文字/图片/文件/空参）、分步流程与
   判断标准、产物与默认落盘路径、一个用当前项目真实文件/模块走通的例子、别名与
   下一层命令、3–5 条常见坑。
3. 生成教程前先花 ≤3 步确认项目：README/package.json/最近 `git log`/目录结构；
   结构查询用 codegraph 且带 `projectPath`。
4. 教程直接输出到对话；不写文件、不建 `.lignting/`/`.whatsnext/` 目录、不提问
   “要不要开始”。

`/ltrv` 例外：先看 `<项目根>/.lignting/.cr-state.json`——不存在（首次）输出教程；
存在则直接 `level=middle` + 自动范围进入审查，**禁止反问或要求用户重敲
`/ltrv middle`**。