---
name: lignting
description: >-
  lignting 命令中枢。当用户输入斜杠命令 /lt-plan、/ltpl、/lt-check、/ltck、/lt-review、/ltrv、
  /lt-discussion、/ltds，
  或表达"规划需求/做个计划""排查 bug/查一下这个报错""审查代码/review 一下"
  "讨论需求/方案讨论/把大需求详细化拆解"等意图时加载本 skill，
  按路由表读取 command/ 下对应文件并严格执行。
metadata:
  commands:
    - name: lt-plan
      aliases: [ltpl]
      file: command/plan.md
      purpose: 需求规划（精确/粗略两档）
    - name: lt-check
      aliases: [ltck]
      file: command/check.md
      purpose: Bug 排查（多轮信息收割 + 有计划的插桩）
    - name: lt-review
      aliases: [ltrv]
      file: command/review.md
      purpose: 代码审查（low/middle/high 三档）
    - name: lt-discussion
      aliases: [ltds]
      file: command/discussion.md
      purpose: 大需求详细化讨论（探索验证 → 提问敲定 → 完整方案文档）
user-invocable: true
---

# lignting

lignting 是一组开发流程命令的中枢 skill。所有命令的具体流程都在本 skill 目录的 `command/` 子目录下，
本文件只负责路由与公共约束。

## 命令路由表

| 命令（全称/简称） | 目标文件（相对本 skill 目录） |
|---|---|
| `/lt-plan`、`/ltpl` | `command/plan.md` |
| `/lt-check`、`/ltck` | `command/check.md` |
| `/lt-review`、`/ltrv` | `command/review.md` |
| `/lt-discussion`、`/ltds` | `command/discussion.md` |

收到任一命令后，**第一步用 read 工具读取对应文件**（本 skill 目录即 `resourceBase`，
文件路径 = `<resourceBase>/command/<file>`；若拿到了绝对路径指令则直接读），
然后严格按文件内流程执行，不得跳步、不得自创流程。

## 公共约束（所有命令一律生效）

### 1. codegraph 前置检查（强制）

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
  （如 review 的状态文件与报告）时才写文件。

### 6. 代码修改

- 流程产物（计划、修复方案）必须经用户确认后才动手改代码；修改遵循最小改动、不改无关代码。
