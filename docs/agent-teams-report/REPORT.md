# dsh-agent-teams 插件能力 与 本项目 skill 配合方案

> 汇总版报告。底稿与逐条证据见同目录 `01`–`04` 四份文档；本报告所有结论已通过独立核验（122 项核对：94 passed / 0 wrong），并已按核验修正项 M1–M8 更正。
> **底稿时间基线：2026-10-14 工作树**（`skills/lignting/command/review.md` 有会话前既存的未提交改动，行号以此工作树为准）。

---

## 结论速览

1. **插件已生效**：`@nanmicoder/dsh-agent-teams` **v0.1.23**，以 `link:D:/project/github/dsh-agent-teams` 本地链接方式装入 web profile —— **改插件源码即生效**。
2. **它给的是「持久多智能体小队」**：14 个 `agent_teams_*` 工具（captain 10 / 成员 4）+ 共享任务板 + 质量门 + 依赖 DAG 调度 + Web 两阶段审批 + 失败自愈修复回路。
3. **与现有 subagent 机制不冲突，是分工关系**：探索/一次性审查用 `subagent_explore` / `subagent`；**≥2 个独立子任务或需要「独立验证门」时**改用建队。
4. **最自然的接入点**：`/ltp`「计划确认后才编码」与插件的 `approval=required` 两阶段**同构** —— 分轮计划落成 staged DAG，Web 批准即触发 `/ltw`。
5. **三个坑插件不兜底**（必须靠 skill 的流程与合同约束）：实现者≠验证者只是提示词、`reviewPolicy.requiredReviewers` 是死配置、成员默认不过滤文件写入。
6. **一处必须立刻记住的硬规则**：本项目同时挂载了宿主实验团队包，**两套工具面并存**。skill 必须固定只用 `agent_teams_*` 那套（详见下节 A1）。

---

## 一、插件能力（它到底能做什么）

### 1. 工具面：14 个 `agent_teams_*`

- **captain 独占 10 个**：`create`、`approve`、`edit_plan`、`add_member`、`remove_member`、`create_task`、`reassign_task`、`amend_task`、`resume`、`delete`。
- **成员可用 4 个**：`claim_task`、`update_task`、`send_message`、`status`。
- 斜杠入口 `/agent-teams` 是**闭合命名空间**，与本项目 16 个 `/lt*` 命令**零冲突**（已实测）。
- ⚠️ **A1 硬规则（M1）**：插件**不**提供 `team_task_*`；那是宿主 `@deepseek-ai/dsh-experimental-tool-agent-team` 提供的另一套（含 `spawn_teammate`/`send_message`/`wait_agent`/`interrupt_agent`）。本项目**两套并存**（我作为 captain 实测两族工具同时可见）。skill 文本必须写死：**只用 `agent_teams_*`；发消息用 `agent_teams_send_message`，不要用宿主 `send_message`；不要用 `spawn_teammate`/`wait_agent`/`interrupt_agent`。**

### 2. 任务模型与质量门

- 任务种类 7 种：`work`（无门禁）+ 6 个质量类 `requirements` / `implementation` / `verification` / `review` / `repair` / `integration`；**写类只有 `implementation` 和 `repair`**。
- **建任务强校验**：质量类必须 `objective` + ≥1 条 `acceptance`；写类还必须 `inScope` + `verify`；`review` 必须 `reviewedTaskId`；写类 `inScope` 无依赖重叠直接拒。
- **完成强校验**：`verify` 有失败项**必须** failed；`changedPaths` 每条必须落在 `inScope` 内；`review`/`requirements` 只能以 `verdict=pass` 完成，`pass` 不得遗留 high/blocker finding。
- 路径一律 **workspace 相对 POSIX**；`.git`/`.dsh`/`.agent-teams`/`.env*`/`secrets`/`id_rsa*` 是任何合同都不能主张的默认排除项。

### 3. 调度与生命周期

- 依赖**全部 completed** 才能认领；captain 建图、成员自领。
- **失败自愈内建**：`needs_revision` → 自动开 `repair-round-N` + 下一轮 review，并改线仍 pending 的下游；`reject` 不自动修复，直接 `escalated` 交人。
- 默认档位：`requirementsMinRounds=1`、`codeMaxRounds=3`、`maxRepairAttempts=2`。→ **skill 不要自己再写「失败后手动重建修复任务」的流程。**
- `halted` 必须显式 resume；`amend_task` 可改 5 个合同字段，但已有 pass 的合同被冻结。

### 4. 成员、工具可见性与规模

- `tool_policy` 是**唯一**可配置的成员工具可见性途径：owner 在 profile 的 `toolPolicies` 里声明策略，成员按 id 引用；**模型永远不能提交原始 allow/deny**。
- 未选策略时，生效过滤只有 `captain-only deny ∪ ['subagent','send_message']` → **codegraph 工具默认可见、文件写入工具默认全在**。
- `memberMaxDepth` 默认 **0**（成员不能再委派）、`maxMembers` 默认 **8**。

### 5. 审批、存储与 UI

- `approval=required` 建**暂存队**：批准前不 spawn、不调度；批准来自 Web「Approve & Run」或用户在**新回合**的明示批准。
- 状态落盘 `.agent-teams/<team>`；配套 Web 计划编辑器（StagingPlanEditor）、团队卡片、活动监控。
- ⚠️ 本仓库 `.gitignore`（仅 6 行）**未忽略 `.agent-teams/`**。

---

## 二、怎么让项目 skill 的子 agent 配合这个插件

### 1. 现状（已核实）

- 项目内**只有 lignting** 下发子代理，且只用两种工具：
  - `subagent_explore`：`plan.md` 强制、`check.md` 必须、`SKILL.md` 公共约束、`lts.md` 局部例外；
  - `subagent`：仅 `review.md` 用，按 low/middle/high = **1/3/8 路并行**，并要求显式 `run_in_background:false`。
- `workflow` 与 `subagent_fork` 在 skill 层**零出现**（尽管 profile 两者都挂着）。
- 委派缺三样硬约束：**无写入作用域**、**无 verdict 门**（review 只给评分）、**无「实现者≠验证者」强制**。

### 2. 边界：什么时候用哪个

| 场景 | 用 |
|---|---|
| 单点代码探索、一次性信息补充 | `subagent_explore`（codegraph-only 叶节点） |
| 单次/少量并行审查，无需审阅与留档 | `subagent` |
| ≥2 个独立子任务、跨角色协作 | **AgentTeams** |
| 需要「独立验证门」、需要用户看计划再放行 | **AgentTeams（`approval=required`）** |
| 需要并行写代码且必须限定写入范围 | **AgentTeams（`inScope`/`outOfScope` 硬校验）** |

### 3. lignting 命令 → AgentTeams 任务映射（要点）

| 现有命令/步骤 | 映射到 |
|---|---|
| `/lt-plan` 规划需求 | `requirements` 任务（objective + acceptance，`verdict=pass`） |
| `/ltp` 计划确认 | 建 **staged** 队 + `approval=required`，Web 批准即启动 |
| `/ltw` 执行 | `implementation`（必须 `inScope` + `verify`） |
| `/ltck` 自查 | `verification` 任务 |
| `/ltrv` 审查 | `review` 任务（`reviewedTaskId` + `verdict` + `findings`） |
| 收尾/集成 | `integration` 任务 |

### 4. 插件不兜底、必须由 skill 补的三处（关键）

1. **实现者≠验证者**：源码没有任何 assignee 比对逻辑，只在提示词里 → 必须靠**任务结构**（不同成员、review 独立）保证。
2. **多路审查**：`requiredReviewers` 是**死配置**（只有接受/校验，无消费点）→ 只能**多建 N 个 review 任务**。
3. **写入纪律**：成员工具过滤**不限制写入** → 只能靠 `inScope` + `changedPaths` 硬校验，skill 必须写具体路径。

### 5. 落地建议（9 条补丁详见 `03-integration-design.md` §9）

- A1（硬规则）：skill 文本声明「只用 `agent_teams_*` 一套」；
- A2：`/ltp` 分轮计划 → staged DAG + `approval=required`；
- B1–B4：把 `objective`/`acceptance`/`verify`/`inScope` 写成可核验的命令与路径；
- C1：review 任务的多路审查结构；
- D1/D2：收尾集成与状态留档。
- **落地注意**：补丁全部是「建议文本」，真正实施需另开任务；改完必须 `npm run check`，**并复制到 `~/.dsh/skills/lignting/`**（用户级优先加载，不同步等于没改）。

---

## 三、风险与注意事项

| # | 风险 | 说明 |
|---|---|---|
| R1 | **探索「成功但答错」** | `mcp-codegraph --path` 固定指向 `D:\studio_frontend\studio_frontend`（另一个项目）→ 每个任务/成员必须显式声明 codegraph 目标项目 |
| R2 | **persona 冲突** | profile 要求探索代理「不下结论」，`lts.md` 却要求它下判断；profile 注入优先，需在 skill 里明确优先级 |
| R3 | **口径冲突** | 全局 codegraph skill「不要派探索子任务」vs `plan.md`「探索一律 subagent_explore」 |
| R4 | **两套工具面并存** | 必须靠 A1 硬规则收口，否则易误用宿主 `send_message`/`spawn_teammate` |
| R5 | **`.agent-teams/` 未被忽略** | 建议 `.gitignore` 补一行 |
| R6 | **副本同步手工** | 仓库 `skills/` 与 `~/.dsh/skills/` 当前工作树 11/11 一致，但同步靠手动；仓库内无 `codegraph` skill 副本 |

---

## 四、证据与核验

- `01-plugin-capabilities.md`（411 行）：插件 8 维能力，逐条 `文件:行号`。
- `02-skills-and-delegation-inventory.md`（273 行）：skill 子代理用法矩阵 + profile 委派配置。
- `03-integration-design.md`（649 行）：边界、16 行映射表、作用域纪律、R1–R12、9 条建议补丁。
- `04-verification.md`（356 行）：**122 项核验（94 passed / 0 wrong / 5 抽样未覆盖）**、修正项 M1–M8、37 条安全结论。
- 已按核验更正：M1 两套并存结案并升为硬规则；M2 生效时间基线；M3/M4 行号勘误；M5/M6/M7 措辞收紧；M8 git HEAD 更新。
