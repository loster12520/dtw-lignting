---
name: lignting
description: >-
  lignting 命令中枢。小阿卡那（Minor Arcana）体系：/lts（宝剑·想法讨论）、
  /ltc（圣杯·方案细化）、/ltp（星币·细节敲定）、/ltw（权杖·具体执行）；
  独立运维命令：/lt-plan、/ltpl、/lt-check、/ltck、/lt-review、/ltrv、/lt-discussion、/ltds。
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
各层共用的两份格式定义见 [references/](references/)：
`dialogue-log-format.md`（对话记录）、`plan-doc-format.md`（方案文档）。

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

## 公共约束（所有命令一律生效）

### 1. codegraph 前置检查

- 任何代码探索开始前，先调用 `codegraph_status` 检查索引。
- 若项目没有 `.codegraph/`（未初始化）：**立即停止探索**，要求用户先运行 `codegraph init -i`，
  不得用 grep/read 绕过继续探索。

### 2. 代码探索强制走 codegraph

- 结构类问题（符号定义、调用关系、影响面、文件结构）一律用 codegraph 工具：
  `codegraph_context` → `codegraph_explore` → `codegraph_search` → `codegraph_callers/callees`。
- 禁止用 grep 替代结构查询；不要用 grep 复核 codegraph 结果。
- 详细规则见 `codegraph` skill。

### 3. 子代理规范

- 探索代码优先调用 `subagent_explore` 工具（专职探索子代理：只允许 codegraph 工具、快速模型）。
- 涉及多个模块/多条链路时，一次并行开多个 `subagent_explore`，按模块切分；子代理只输出
  符号/文件/调用链，不下结论。
- 审查类并行子代理直接使用 `subagent` 工具，prompt 按各命令文件内模板内联。

### 4. 提问规范

- 需要向用户确认时，优先使用 `ask_user_question` 工具；每个问题给出选项，推荐项放在第一位。
- 每轮最多 6 个问题：>6 拆两轮、>12 拆三轮，以此类推（每轮 ≤6）。
- 若无法使用提问工具，改为对话提问，每次只抛一个问题（>6 时每轮两个、>12 时每轮三个），
  同样带选项与推荐项。

### 5. 输出规范

- 计划 / 报告 / 分析默认直接输出到对话，不创建文件；只有用户要求保存或流程本身要求落盘
  （如小阿卡那各层的方案文档与对话记录、review 的状态文件与报告）时才写文件。

### 6. 代码修改

- 流程产物（计划、修复方案）必须经用户确认后才动手改代码；修改遵循最小改动、不改无关代码。

### 7. 局部例外

命令文件**可以声明对本节公共约束的局部例外**（例如 `lts.md` 放宽 codegraph 前置检查、
改变提问方式）。规则：

- 例外必须写在**命令文件里**，不得写进公共约束——避免污染其他命令。
- 命令文件的例外声明**优先于**本节的通用规则。
- 例外要写明**范围**（仅本命令内生效）与**理由**，不得静默放宽。
