# 03 · 本项目 skill 与 @nanmicoder/dsh-agent-teams 的配合方案（设计稿）

> 目的：给出「让 `dsh-lignting` 的 lignting skill 在下发子 agent 时配合 AgentTeams 插件」的可执行方案。
> 输入：`docs/agent-teams-report/01-plugin-capabilities.md`（插件能力）、`docs/agent-teams-report/02-skills-and-delegation-inventory.md`（本项目现状）。
> 本文件**不修改任何 skill 文件**或 profile 配置：第 9 节的补丁段落全部是建议文本。
> 取证：本文所有插件侧结论均已回查 `D:\project\github\dsh-agent-teams\src\**`（该目录即 `@nanmicoder/dsh-agent-teams` 0.1.23 的 link 目标），项目侧结论均已回查 `skills/lignting/**`、`src/host.js`、`C:\Users\cihu0\.dsh\profiles\web\{cordis.patch.yml,package.json}`。
> 编制日期：2026-10-14。

---

## 0. 结论表

| # | 结论 | 关键依据 | 对现状的影响 |
|---|---|---|---|
| 1 | **两套机制职责不同，不互相替代**：`subagent_explore`/`subagent` 是「命令内部的一次性算力」；AgentTeams 成员是「跨轮次、有任务板与质量门的持久角色」。判定规则应写成「广度用子代理、轮次间用成员」。 | 01 §8.1（持久成员/任务板为主插件独有）、02 §A.1 | 需要在 `SKILL.md` 公共约束里新增第 8 条，把两者写成互补而非二选一 |
| 2 | **`/ltp` → 团队 staged 计划是同构的**：lignting 已有「计划输出后等待用户确认；确认后才进入编码」（`command/plan.md:59`、`command/ltp.md:88`），AgentTeams 的 `approval=required` 两阶段（`src/types.ts:371-384`、`src/tools.ts:1255-1257`）正好是这条纪律的机器化版本。这是最自然的结合点。 | `src/types.ts:375-384`、`src/tools.ts:69`（`buildActivationDirective`） | `/ltp` 增加「团队模式」分支：把分轮计划落成 staged DAG，由 Web 批准触发 `/ltw` |
| 3 | **现有 subagent 委派缺的作用域，插件侧能补**：`implementation`/`repair` 必须有 `inScope`+`verify`，完成时 `changedPaths` 每条都必须被判为 `in_scope`，写类任务 `inScope` 之间**不得重叠**（除非有依赖）。 | `src/quality-gates.ts:410-417`、`:593-602`、`:347-361`、`:451-465` | 把 `/ltp` 的「本轮范围 / 明确不做什么」（`command/ltp.md:74-75`）直接翻译成 `inScope`/`outOfScope` |
| 4 | **`verdict=pass` 可以机读化 `/ltrv` 的评分报告**：`review`/`requirements` 只能以 `verdict=pass` 完成，`needs_revision`/`reject` 必须以 `failed` 收尾并至少附一条 finding。 | `src/quality-gates.ts:562-576` | `/ltrv` 报告需增加机读 verdict 段；`review.md:104-105` 的星级改为「描述」，不再当门禁用 |
| 5 | **「实现者 ≠ 验证者」是插件层的**软约束**，不是硬校验**：原文只出现在 captain 协议与成员 persona 文本里（"Never approve your own implementation"），源码中没有比对「review 任务的 assignee 与 reviewedTaskId 的 assignee」的检查。 | `src/index.ts:186`、`src/members.ts:830`（均为提示词文本）；`grep` 未命中此类校验 | 必须由 skill/任务结构显式保证（把 review 任务 `assignee` 指派给非实现者），不能指望插件拦 |
| 6 | **默认规划图必须串行**，否则建任务就被拒：`implementation` 在有 requirements 的队伍里必须「requirements 已 pass」或「依赖闭包内含该 requirements」。 | `src/quality-gates.ts:467-482` | 团队的 DAG 形态固定为 requirements → implementation → verification/review → integration |
| 7 | **两套状态不冲突，但要分层声明**：`.lignting/`（随 git，方案与理由）与 `.whatsnext/`（私有，进度单源）是 lignting 现状；AgentTeams 的任务板是**团队运行期**状态。skill 已硬规定「小阿卡那不写状态」（`references/whatsnext-bridge.md:22-30`），因此任务板状态**不得回写** `.lignting/` 文档。 | `references/whatsnext-bridge.md:22-30`、`src/state.ts:234-237` | 新增一条「双状态分层」规则；成员一律不碰 `.whatsnext/`，round 收尾仍由 skill 勾选 |
| 8 | **`.agent-teams/` 默认不可作为交付物**：插件把 `.agent-teams` 列为默认排除首段，任何质量合同都不能主张它（写进 `inScope` 只会让路径被判 `out_of_scope`）。且本仓库 `.agent-teams/` 未被 git 忽略。 | `src/quality-gates.ts:299-309`、`:315-325`；`git check-ignore .agent-teams/` 退出码 1 | 补丁里必须写明「不要试图把状态目录写进 inScope」，并建议把 `.agent-teams/` 加进忽略 |
| 9 | **`tool_policy` 与 `toolFilter` 不是同一层**：`toolFilter`（profile 的 `tool-subagent-lignting-explore`）是**单次子代理实例**的白名单；`tool_policy` 是**团队成员**的、由 owner 在 `toolPolicies` 声明、成员只能按 id 选择的可复用策略，明文禁止 captain 提交原始 allow/deny。两者作用对象不同，可共存。 | `profiles/web/cordis.patch.yml:31-41`；`src/tool-policies.ts:5-8`、`:205-218`、`src/index.ts:181` | 配置层要新增 `toolPolicies:` 与 `profiles:` 两块，二者与既有 `delegation` 组互不冲突 |
| 10 | **命令路由无冲突（已实测）**：`/agent-teams` 是闭合命名空间（正则 `^/agent-teams(?=$|[\t\n\r ])`，profile 别名只走 `agent-teams-<key>`）；lignting 16 个命令全在 `/lt*` 前缀下，交集为空。宿主 `@deepseek-ai/dsh-experimental-tool-agent-team` 与 `...-client-ui-agent-team` 两个包**不注册任何斜杠命令**（`grep` `commands\.register|registerCommand|slashCommand` 均 0 命中）。 | `src/command.ts:8-9`、`:17`、`:25-35`；`src/host.js:19-38` | 无需做路由仲裁；只需在补丁里禁止给团队 profile 起 `lt*` 之类的名字 |
| 11 | **「仅用户显式要求时才建队」当前没有 skill 侧约束**：插件自身有这条规则（激活指令要求 `approval="required"`、`staged` 阶段不 spawn 不调度），但 lignting 三个 skill 文件里 `/agent-teams`、`agent_teams_*` 命中 0。 | `src/command.ts:66-85`、`src/types.ts:375-384`；02 §C2/§C11 | 补丁必须显式给出「禁止自行建队」的硬规则，否则自然语言触发会绕过用户的显式意图 |
| 12 | **`/ltw` 的自证可以变成不可伪造的证据**：`update_task` 完成质量类任务时 `acceptanceResults` 必须覆盖全部 `acceptance` 且全 `passed`、`commandsRun` 必须覆盖全部 `verify` 且全 `passed`，`verify` 有失败项时**禁止** `completed`。 | `src/quality-gates.ts:580-592` | `/ltw` 的「四段式汇报」第 2 段表格字段名改为与 `acceptance`/`verify` 条目一一对应 |
| 13 | **`reviewPolicy.requiredReviewers` 是死配置**：schema 接受（`src/index.ts:160`）、解析校验（`src/profiles.ts:423-440`）都有，但除解析处外**全仓库无消费点**（`grep` 仅命中解析与注释）。不要拿它当「必须有 N 个审查者」的保障。 | `grep requirementsMaxRounds|codeMaxRounds|maxRepairAttempts` 对比：后三者有消费点（`src/quality-gates.ts:228-234`、`:951`、`:985`），`requiredReviewers` 无 | 方案里用「多建几个 `review` 任务」来表达多路审查（`review.md:61`/`:78-90` 的 3/8 路），不依赖该字段 |
| 14 | **成本上界是明确的，但不能按 8 路满配默认开**：`maxMembers` 默认 8，服务级 `maxActiveSubagents: 15`（`profiles/web/cordis.patch.yml:412-416`），成员是 **continuable 持久子会话**（跨 harness 重启存活）；且压缩策略对本项目探索模型降阈值到 0.5。 | `src/index.ts:172`、`profiles/web/cordis.patch.yml:415-416`、`src/types.ts:262-307`、`profiles/web/cordis.patch.yml:330-336` | 默认团队规模压到 3-4 人；每名成员显式给 `model`/`reasoning_effort`，避免 8 路继承 captain 的 `high` 档 |

---

## 1. 边界说明：什么时候用成员，什么时候用子代理

### 1.1 两套机制的能力对照

| 维度 | `subagent_explore`（现有） | `subagent`（现有） | AgentTeams 成员（新增） |
|---|---|---|---|
| 身份 | 每次调用新建，一次性 | 每次调用新建（continuable，可续聊） | **持久成员**，名字/角色记在 `team.json`，跨 harness 重启存活（01 §8.1） |
| 生命周期 | 单次调用内 | 单次调用 + 手动 `send_message` 续聊 | 长期存活；idle 时挂起，被任务或邮件唤醒 |
| 工作分发 | 调用方在 prompt 里写死 | 同左 | **共享任务板 + DAG + 原子认领**（`src/scheduler.ts:202-208`） |
| 状态 | 无 | 无 | `pending/claimed/in_progress/completed/failed/cancelled` + attempt 代际 |
| 质量门 | 无 | 无 | `verdict=pass` 完成门、findings、自动 repair、交付门 |
| 写入范围 | 无（靠白名单只给 codegraph） | **无**：该行没有 `toolFilter`，子代理持有全量工具（02 §C5/§C6） | `inScope`/`outOfScope`/`changedPaths` 机器可校验（`src/quality-gates.ts:410-417`、`:593-602`） |
| 人工介入 | 无 | 无 | Web 计划审阅批准、活动面板、halt/resume |
| 配置面 | profile 行（`cordis.patch.yml:10-41`） | profile 行（`:355-361`） | `toolPolicies` + `profiles`（owner 声明） |
| 并行语义 | 调用侧「一次并行开多个」 | 调用侧并行 + `run_in_background` | 调度器按依赖就绪自动派发，每人同时只持一个未完成 attempt |
| 深度 | `maxDepth: 1` → 叶节点 | 继承服务级 `maxDepth: 5` | `memberMaxDepth` 默认 **0**（成员不得再委派） |

### 1.2 判定树（建议写进 `SKILL.md`）

```
要做的事是不是「命令内部的取数/扫读」？
├─ 是 → 用 subagent_explore（结构查询）或 subagent（按维度审查），保持现状
│        判据：结果当轮就要用；不需要跨轮次留身份；不需要别人来验收
└─ 否 → 是不是「跨多轮、要对代码动手、且需要独立验收」？
        ├─ 否（只是问一句、看一段）→ 主会话直接用 codegraph / read
        └─ 是 → 团队候选。再问一句：
                ├─ 用户是否显式要求建队 / 已批准 Web 计划？→ 是：走 AgentTeams
                └─ 否 → **不建队**，继续用 subagent 或主会话执行（补丁 A1 硬规则）
```

### 1.3 反模式（明令禁止）

| 反模式 | 为什么坏 | 正确做法 |
|---|---|---|
| 团队里再让成员 `subagent_explore` 一次 | `memberMaxDepth` 默认 0，`resolveMemberToolFilter` 把 `subagent` 加进 deny（`src/tool-policies.ts:31`、`:209-212`），实际会被拦或白付一次空转 | 成员自己用 codegraph 工具看（插件未 deny codegraph）；确需保留「不污染成员上下文」时把 `memberMaxDepth` 调 1 并显式声明 |
| 同一个文件既交 `implementation` 又交另一个 `implementation` | 写类 `inScope` 重叠会被 `validateCreateTask` 直接拒绝（`src/quality-gates.ts:451-465`） | 拆路径或加依赖串行（见第 2.2 节） |
| 用任务板状态当进度真相 | 与「小阿卡那不写状态」冲突（`references/whatsnext-bridge.md:22-30`） | 任务板只作团队运行期状态；round 收尾仍走 whatsnext（第 3.4 节） |
| 让审查成员「顺手把报告写进 `.lignting/`」而不声明范围 | 报告若要作为交付物被审计，路径必须在合同里（否则被判 `undeclared`） | 把报告路径写进该 review 任务的 `inScope`（第 3.3 节） |
| 把 `.agent-teams/` 写进 `inScope` | 默认排除首段，必被判 `out_of_scope`（`src/quality-gates.ts:299-309`） | 不要声明；状态目录永不作交付物 |

---

## 2. 映射表：lignting 命令 → AgentTeams 任务与 verdict 规则

### 2.1 标准一轮的 DAG

```
/lts   /ltc            /ltp（团队模式）                    /ltw                /ltrv
方向文档 阶段表   →   计划落成 staged DAG   →  Web 批准  → 执行   →  独立验收  →  审查门  →  集成收尾
                      ├─ requirements  t1 ─┐
                      ├─ implementation t2 ─┤ 依赖 t1
                      ├─ verification  t3 ─┤ 依赖 t2
                      ├─ review        t4 ─┤ 依赖 t2（reviewedTaskId=t2）
                      └─ integration   t5 ─┘ 依赖 t3,t4
```

### 2.2 逐步映射表

| # | lignting 步骤（文件:行） | 归属 | AgentTeams 对应 | 必填合同字段 | 通过条件 |
|---|---|---|---|---|---|
| 1 | `/lt-plan` 第 0-2 步：codegraph 前置 + `subagent_explore` 并行探索（`command/plan.md:6-9, 22-37`） | **留在 skill 内** | 无任务；结果进入 `plan.md:50-57` 的计划正文 | — | 探索子代理「不下结论」（`SKILL.md:109-110`），结论由主会话下 |
| 2 | `/lt-plan` 第 3-4 步：提问 + 输出计划并等确认（`command/plan.md:39-59`） | **留在 skill 内** | 用户确认后，若用户要求建队，再由 captain 落 staged 计划 | — | `plan.md:59` 的「确认后才编码」= `staged` 阶段不 spawn（`src/types.ts:375-384`） |
| 3 | `/ltck` 第 1-3 步：信息收割、`subagent_explore` 走查、插桩计划（`command/check.md:11-43`） | **留在 skill 内** | 可用 `kind=work` 任务做「仓库审计/复现定位」——README 明确把外部仓库审计归 `work`（`src/tools.ts:1461`、`:1484`） | `objective`+`acceptance` 仅在质量类必需；`work` 无门禁 | `work` 类无 verdict 门；排查结论回主会话 |
| 4 | `/ltck` 第 5 步：修复方案（含修复代码），用户确认后改（`command/check.md:51-53`） | **外派为团队任务**（若已建队） | `kind=implementation`（可挂 requirements，见 `src/quality-gates.ts:467-482`） | `objective`/`acceptance`/`inScope`/`verify` | `changedPaths ⊆ inScope`、`verify` 全 passed（`:593-602`、`:580-584`） |
| 5 | `/ltp` 第 2 步：依赖闭包校验（`command/ltp.md:28-37`） | **留在 skill 内**（captain 做） | 产出直接变成 DAG 的 `dependencies` | — | 依赖必须存在、`review`/`repair` 不得依赖 failed/cancelled（`:440-449`） |
| 6 | `/ltp` 第 3-4 步：分轮 + 顺序 + 每步三件套（`command/ltp.md:39-68`） | **变成任务图** | 每轮 = 一组 `implementation` 任务；「验证命令」→ `verify`；「明确不做」→ `outOfScope` | `inScope`（POSIX 相对路径） | 相邻写类任务路径不重叠 |
| 7 | `/ltp` 第 5 步：输出计划文档（`command/ltp.md:70-84`） | **留在 skill 内** | 文档路径进 `deliverables`（仅登记，不作改动主张） | `deliverables` 可选（`src/tools.ts:1482`） | — |
| 8 | `/ltw` 第 1-2 步：执行前确认、按序执行（`command/ltw.md:17-28`） | **外派为团队任务** | `implementation`（成员先 `claim_task` 拿 `attempt_id`） | `inScope`/`verify` | 只改 `inScope` 内路径 |
| 9 | `/ltw` 第 3 步：偏离处理（`command/ltw.md:30-39`） | **留在 skill 内**（captain 裁定） | 成员用 `send_message(to=captain)` 报偏离；captain 用 `amend_task` 改合同（仅非终态、pass 后冻结） | — | `src/quality-gates.ts:751-804` |
| 10 | `/ltw` 第 4 步：自测（`command/ltw.md:41-47`） | **外派为团队任务** | `kind=verification`（独立任务，**由非实现者承担**） | `acceptance`（全部验收条目）+ `commandsRun` | `acceptanceResults`/`commandsRun` 全 passed（`:586-592`） |
| 11 | `/ltw` 第 5 步：四段式汇报（`command/ltw.md:49-77`） | **一半留、一半外派** | 第 1/2 段 → `output` + `changedPaths` + `acceptanceResults`/`commandsRun`；第 3/4 段 → `evidence_note`/邮件 | — | 终态后只能 append（`src/tools.ts:1954-1968`） |
| 12 | `/ltw` 第 6 步：同步 whatsnext（`command/ltw.md:79-88`） | **留在 skill 内**（round 收尾，captain/主会话） | 不建团队任务；成员一律不碰 `.whatsnext/` | — | 见第 3.4 节双状态分层 |
| 13 | `/ltrv` 第 2-3 步：范围检测 + 状态目录初始化（`command/review.md:21-38`） | **留在 skill 内** | 审查范围 → `review` 任务的 `reviewedTaskId` 解析来源 | `reviewedTaskId` 必填（`:418-425`） | 只对 `implementation`/`repair` 开 review；仓库审计走 `kind=work`（`src/tools.ts:1484`） |
| 14 | `/ltrv` 第 4 步：按档位并行审查（`command/review.md:40-90`，low/middle/high = 1/3/8） | **外派为多个团队任务** | low → 1 个 `review`；middle → 3 个 `review`（维度各一）；high → 8 个 | 每个 review 都要 `objective`+`acceptance`，`reviewedTaskId` 指向同一实现 | 每个 review 独立给 verdict；**不打折**：任一 `reject` 即升级 |
| 15 | `/ltrv` 第 5 步：报告合并与保存（`command/review.md:92-111`） | **拆开** | 报告文件由**一名 integration/captain** 合并写（避免多写者争同一路径）；`.lignting/.cr-state.json` 由 captain 统一更新 | 报告路径可入 review 的 `inScope`（若由该 review 自己写） | 见第 3.3 节 |
| 16 | 收尾集成（当前**没有**对应命令） | **新增团队任务** | `kind=integration`，依赖 verification + review | `acceptance`（端到端条目） | 交付门 `canDeclareDelivery` 全绿（`:1624-1684`） |

### 2.3 哪些必须留在 skill 内

- **一切与用户对话的步骤**：提问（`SKILL.md:113-118`）、计划确认（`command/plan.md:59`）、`/lts` 的四种相与判断（`command/lts.md:41-61`）。成员不面向用户，只面向任务。
- **一切触及 `.lignting/` 方案文档与 `.whatsnext/` 的写入**：事实源要单一作者（第 3.4 节）。团队模式下 captain 仍是这些文件的唯一写者。
- **一切「方向级判断」**：`/lts` 的方向文档、`/ltc` 的阶段划分。这些是人的决策，不外包。
- **`/ltpl` 的精确/粗略模式判定**（`command/plan.md:11-20`）：这是对用户表述的解读，不是可并行的工作。

### 2.4 哪些应当外派为团队任务

- 需要**动代码**且每步能独立验收的：`implementation`。
- 需要**独立于实现者**的验收：`verification`。
- 需要**多维度并行**且要给出结论的：`review`（按 `review.md` 的 1/3/8 维度切）。
- 需要**跨轮次保留上下文**的探索（同一模块连续几轮都在改）：把该模块交给一个持久成员，而不是每轮新开 `subagent_explore`。
- 需要**端到端复跑**的收尾：`integration`。

---

## 3. 作用域纪律：用 inScope 补上现有空缺

### 3.1 路径写法（硬约束，来自 `src/quality-gates.ts:259-291`）

| 规则 | 说明 |
|---|---|
| 一律 **workspace 相对 POSIX 路径**，反斜杠会被转 `/` | `normalizeWorkspacePath` |
| 禁止：空串、`~` 前缀、Windows 盘符、`/` 开头绝对路径、任何 `..` 片段 | 违反即 `illegal`，完成时直接拒绝 |
| 目录用**尾斜杠**（`skills/lignting/`）或 `.`；否则按**精确文件**匹配 | `pathMatchesScope` |
| 默认排除（任何合同都不可主张）：`.git`、`.dsh`、`.agent-teams` 首段；`.env`/`.env.*`；任一段含 `secrets`；`id_rsa*` | `:299-309` |
| `outOfScope` 与 `inScope` 冲突时会被拒绝 | `:862-867` |

**本项目映射**：`/ltp` 的「本轮范围」→ `inScope`；「明确不做什么」（`command/ltp.md:74`）→ `outOfScope`；`/ltw` 的「只做本轮范围内的改动」（`command/ltw.md:39`）→ 由 `changedPaths` 校验兜底。

### 3.2 一个可抄的合同模板

```yaml
kind: implementation
subject: "Phase 1 Round 1 —— 抽取 XXX 适配层"
objective: >-
  按 .lignting/<feature>/phase-1/round-1.md 第 3 节改动顺序，完成步骤 1-4，
  保持中间态可编译（命令见 verify）。
inScope:
  - skills/lignting/command/ltw.md        # 单文件：精确匹配
  - src/host.js
  - skills/lignting/references/           # 目录：尾斜杠前缀匹配
outOfScope:
  - skills/lignting/command/review.md     # 本轮明确不动
acceptance:
  - "npm run check 退出码为 0"                     # 与 /ltp 验收条目编号一一对应
  - "node --check src/host.js 无语法错误"
verify:
  - "npm run check"
deliverables:
  - ".lignting/<feature>/phase-1/round-1.md"       # 只登记，不作改动主张
nonGoals:
  - "不重构 /ltrv 的档位判定"
dependencies: [t1]                                  # requirements 必须先 pass
```

> **注意**：`deliverables` 与 `inScope` 是两件事。`deliverables` 只是「预期交付物路径/名称」的登记（`src/tools.ts:1482`），完成门的强校验只看 `acceptanceResults`/`commandsRun`/`changedPaths`（`:586-602`）。别把「计划文档路径」塞进 `inScope` 来试图让它变成被改文件。

### 3.3 lignting 各类文档作 deliverables 的落点

（现状路径见 `skills/lignting/references/dialogue-log-format.md:28-40`）

| 文档 | 现状路径（`references/dialogue-log-format.md:28-40`） | 团队模式下的归属 | `inScope` 建议 |
|---|---|---|---|
| 方向文档 | `.lignting/<feature>/direction.md` | captain/主会话唯一写者（`/lts`） | 不进任何写类任务 |
| 阶段表 | `.lignting/<feature>/phases.md` | captain（`/ltc`） | 不进任何写类任务 |
| 分轮计划 | `.lignting/<feature>/phase-<n>/round-<m>.md` | captain（`/ltp`），**在批准前写完** | 只入 `deliverables` |
| 对话记录 | `*.dialogue.md`（**只追加**，`dialogue-log-format.md:75-82`） | captain | **绝不**给成员写：多成员并发追加同一文件会让「轮次只增不改」失真 |
| 执行汇报 | `.lignting/<feature>/phase-<n>/round-<m>.report.md` | **首次由 skill 定义落点**：captain 在 integration 任务里汇总写；成员只回 `output`/邮件 | 若一定要成员写，则给**每成员独立文件名**并写进该任务 `inScope` |
| 审查报告 | `.lignting/doc/review/YYYYMMDD-HHmmss-cr-report.md`（`command/review.md:108`） | **由 captain 合并写**（`review.md:94` 的合并步骤天然在 captain） | 不分配；若分配给单个 integration 任务则写 `inScope` |
| 审查状态 | `.lignting/.cr-state.json`（`command/review.md:111`） | captain 单一写者 | 不给多个 review 任务（并发写同一 JSON 必冲突） |

**为什么报告不交给每个 review 成员写**：`workspace-audit` 会把「被记录的 artifact 路径」纳入审计（`src/workspace-audit.ts:31-53`），且审计有 gap 即阻塞交付（`src/quality-gates.ts:1675-1682`）。路径写得越多、写者越分散，越容易触发「面板绿、模型红」之外的另一种失真——审计枚举上限。**少而确定的路径 > 多而分散的路径。**

### 3.4 双状态分层（必须写进 skill）

```
.whatsnext/     ← 进度真相（人看的、跨对话的、任务级）        只有 skill / 用户在写
.lignting/      ← 方案与理由（随 git、无状态字段）            captain 一个写者
.agent-teams/   ← 团队运行期状态（任务板 + 邮箱，可丢弃）      插件自己写，人只读面板
```

规则：
1. 成员**不读也不写** `.whatsnext/`（`.lignting/` 同理），只碰任务板与自己 `inScope` 内的文件。
2. `.lignting/` 文档**继续不含状态字段**（`references/plan-doc-format.md:56-57`）——任务板状态不回写。
3. round 收尾仍按 `command/ltw.md:79-88` 勾 whatsnext 复选框，**由 captain 在 integration 完成后做一次**。
4. `.agent-teams/` 当前**未被 git 忽略**（`git check-ignore .agent-teams/` 退出码 1，`.gitignore` 只有 6 行）；建议补一行，避免团队状态进版本库（补丁 D1）。

---

## 4. DAG 形态约束（建任务前必须知道，否则会被拒）

| 约束 | 后果 | 依据 |
|---|---|---|
| 质量类（除 `work`）必须有 `objective` + ≥1 条 `acceptance` | 直接建任务失败 | `src/quality-gates.ts:402-409` |
| 写类（`implementation`/`repair`）还必须有 `inScope` + `verify` | 直接建任务失败 | `:410-417` |
| `review` 必须给 `reviewedTaskId` 且任务存在 | 直接失败 | `:418-425` |
| `review`/`repair` 不得依赖 failed/cancelled 任务 | 直接失败 | `:440-449` |
| 写类 `inScope` 重叠（且无依赖） | 直接失败，提示「serialize or split」 | `:451-465` |
| 有 requirements 且未 pass 时，`implementation` 必须依赖闭包含 requirements | 直接失败 | `:467-482` |
| 完成时 `verify` 有失败项 | **不得 completed，必须 failed** | `:580-584` |
| `changedPaths` 任一条不是 `in_scope` | 拒绝完成 | `:593-602` |
| `review`/`requirements` 非 `verdict=pass` 要 completed | 拒绝 | `:562-576` |
| `needs_revision`/`reject` 不附 finding | 拒绝 | 同上 |
| 已经 pass 过的合同 | 冻结，`amend_task` 被拒 | `:797-804` |
| `reject` | **不自动修复，直接 `escalated`** 并留给人 | `src/quality-gates.ts:937-946` | 
| `needs_revision` | 自动建 `repair-round-N` + `review-round-N`；同一 source+finding 去重；超 `maxRepairAttempts=2` 升级 | `:984-1046` |

**给 `/ltp` 的直接推论**：
- 「只细化即将执行的那一轮」（`command/ltp.md:6-8`）与 `requirementsMinRounds=1 / requirementsMaxRounds=4 / codeMaxRounds=3 / maxRepairAttempts=2` 的策略是兼容的——**一轮一个 `implementation`，每轮各自 requirements→implementation→verification→review**，不要给整条链建一个大 requirements。
- **每一条 `acceptance` 的措辞要与 `/ltp` 的「验收标准细化」条目逐字对应**（`command/ltp.md:78-80`）。覆盖判定接受「同长度且全 passed」的结构化报告，但仍要求命令证据独立存在（`:528-544`），逐字一致最省事。

---

## 5. 配置层：toolFilter 与 tool_policy 的共存

### 5.1 两者的定位差异

| | `toolSubagent.toolFilter`（profile 行） | AgentTeams `toolPolicies` + `tool_policy` |
|---|---|---|
| 作用对象 | **一次子代理实例**（`subagent_explore`） | **一个团队成员**（持久） |
| 声明者 | profile 作者（`profiles/web/cordis.patch.yml:31-41`） | deployment owner（插件 config `toolPolicies`） |
| 选择方式 | 由该行固定，调用方不能改 | 成员按 **id** 选择；captain 只能选已有 id，**永不能提交原始 allow/deny**（`src/index.ts:181`、`src/tool-policies.ts:5-8`） |
| 强制内容 | 无 | ① captain-only 工具永远 deny，策略无法抵消；② 四个协调工具永远可用、不得 deny；③ allow 型自动补协调工具；④ 生效 deny = 策略 deny ∪ captain-only deny（`src/tool-policies.ts:16-24`） |
| 不可用名字 | 传错参数直接抛错（`dsh-tool-subagent/lib/index.js:356-357`） | 未知 id 报错并列出可用 id（`:181-194`）；owner 声明的 deny 名**永不放宽**（`:150-171`） |
| 性质 | 工具可见性 | 工具可见性（**不是 OS 沙箱**，`src/tool-policies.ts:14`） |

**共存方式**：两者互不干扰、也不需要改写彼此。`subagent_explore` 继续只有 9 个 codegraph 工具；团队成员走自己的 `tool_policy`。

### 5.2 成员默认能看见什么（重要）

成员**未选策略**时，生效过滤只有 `captain-only deny ∪ 深度 deny`（`src/tool-policies.ts:212`）。其中：

```
captain-only deny = 10 个 captain 工具
  agent_teams_create / approve / edit_plan / add_member / remove_member
  create_task / reassign_task / amend_task / resume / delete
深度 deny（memberMaxDepth 默认 0）= ['subagent', 'send_message']
```

推论：
1. 成员的 `agent_teams_*` 只剩四个：`claim_task`/`update_task`/`send_message`/`status`（`src/tool-names.ts:10-12`）——与成员 persona 的四件套一致。
2. **codegraph MCP 工具默认对成员可见**（不在 deny 里）。所以「成员做结构探索」是可行的，无需给它们 `subagent_explore`。
3. 成员的**文件写入工具默认全在**（没有 OS 沙箱）。「成员不许改代码」只能靠 `inScope` + `changedPaths` 硬校验，而不是靠工具白名单。

### 5.3 建议声明的 toolPolicies（写入插件 config）

```yaml
toolPolicies:
  # 只读审查/验证：去掉写入与执行能力，保留 codegraph 与只读文件工具
  # ⚠️ 非 codegraph 的工具名请按本机实测结果填（见下方警告 3）
  lignting-readonly:
    allow:
      - mcp__codegraph__codegraph_status
      - mcp__codegraph__codegraph_context
      - mcp__codegraph__codegraph_explore
      - mcp__codegraph__codegraph_search
      - mcp__codegraph__codegraph_node
      - mcp__codegraph__codegraph_callers
      - mcp__codegraph__codegraph_callees
      - mcp__codegraph__codegraph_impact
      - mcp__codegraph__codegraph_files
      - read
      - grep
      - glob
  # 探索：与现有 subagent_explore 的 9 个工具对齐（成员版）
  lignting-explore:
    allow:
      - mcp__codegraph__codegraph_status
      - mcp__codegraph__codegraph_context
      - mcp__codegraph__codegraph_explore
      - mcp__codegraph__codegraph_search
      - mcp__codegraph__codegraph_node
      - mcp__codegraph__codegraph_callers
      - mcp__codegraph__codegraph_callees
      - mcp__codegraph__codegraph_impact
      - mcp__codegraph__codegraph_files
```

**实现者不要配策略**：`implementation` 成员需要全量写入工具，但其写入范围由任务合同（`inScope` + `changedPaths`）约束——这是 `src/quality-gates.ts:593-602` 的硬校验，比工具白名单更精确。

> ⚠️ **三条硬约束/坑**：
> 1. 四个协调工具（`agent_teams_claim_task`/`update_task`/`send_message`/`status`）**不得写进 deny**——`normalizeToolPolicy` 在挂载期直接抛错（`src/tool-policies.ts:106-111`）。
> 2. `run_code` 是保留名，不能出现在 allow/deny 里（`:102-105`、`:34`）。
> 3. **owner 声明的名字不做可用性校验**：只有内置的 captain-only 与深度 deny 会按 `knownTools` 过滤（`:209-211`），owner 写的 allow/deny 原样传给宿主。写错一个工具名**不会报错**——allow 里写错 = 该工具被静默隐藏；deny 里写错 = 该名字**永不放宽**（`:150-171`），成员可能因此生不下来。所以第 5.3 节的两份白名单**上线前必须实测一次**（建一个成员，看它的工具目录）。

### 5.4 `memberMaxDepth` / `maxActiveSubagents` 与团队规模

| 参数 | 当前值 | 位置 | 与团队的关系 |
|---|---|---|---|
| `memberMaxDepth` | 插件默认 **0** | `src/index.ts:171-172` | 成员不能再派子代理。**建议保持 0**：团队成员自己用 codegraph 工具就够；开 1 会把「谁在跑」变复杂，且每次嵌套都吃一个 `maxActiveSubagents` 名额 |
| `maxMembers` | 插件默认 8 | `src/index.ts:172` | 团队人数上限；**建议配 3-4**（captain + 实现 + 验证/审查 + 集成），不要一上来 8 |
| `maxActiveSubagents` | profile 设 **15** | `profiles/web/cordis.patch.yml:415-416` | 服务级并发上限，**主会话的 `subagent`/`subagent_explore` 与团队成员共用这个池子** |
| `maxDepth`（服务级） | profile 设 **5** | 同上 | 主会话子代理链深 5 层；团队成员被 `memberMaxDepth` 单独拦住 |
| 活动面板轮询 | 1000ms | `src/client/activity-monitor.ts:184-194` | 面板开着时有稳定轮询开销 |

**并发配比建议**（`/ltrv high` 8 路是峰值场景）：

```
团队成员（建议 3-4）      3-4
同时开着的主会话子代理     1-2（探索/审查）
余量                      ≥8（供 high 档临时 8 路并行）
─────────────────────────────
合计                       ≤15  → 团队 4 人时余 11，high 档可行；团队 8 人时余 7，high 档会饿
```

**结论**：**团队规模与 `/ltrv` 档位是同一笔预算**。要跑 `high`（8 路）时团队压到 ≤4 人；要 8 人团队时把 `/ltrv` 降到 `low`/`middle`，或临时把 `maxActiveSubagents` 抬到 24（注意这不是免费的）。

---

## 6. 冲突与风险清单

| # | 风险 | 现状事实 | 判定 | 处置 |
|---|---|---|---|---|
| R1 | 斜杠命令路由冲突：`/agent-teams` vs lignting 命令 | `src/command.ts:8-9,17`（闭合命名空间）、`:25-35`（别名仅 `agent-teams-<key>`）；`src/host.js:19-38`（16 个 `/lt*` 命令） | **无冲突**（前缀不交） | 加一条禁令：团队 profile 名不得取 `lt`/`lt*` 形态，避免生成 `/agent-teams-ltpl` 造成语义混淆 |
| R2 | 两个包同时注册 `/agent-teams` | 宿主 `dsh-experimental-tool-agent-team` 与 `...-client-ui-agent-team` 均**不注册命令**（grep 0 命中）；本机 profile 的 `bundles` 里两个团队包同时存在（`profiles/web/package.json:19,21`） | **无命令冲突**；但**工具集**是否同时可见仍**未确认**（01 §8.3 遗留项，我在成员侧看不到 `team_task_*`/`spawn_teammate`） | 建队前先调一次 `agent_teams_status` + 看一眼工具目录；若两套同时可见，**只用一套**（本方案只用 nanmicoder 那套，因为它有质量门） |
| R3 | skill 自动加载 vs「仅用户显式要求时才建队」 | 插件侧本来就有这条纪律（`src/command.ts:69`：只有无队伍时才以 `approval="required"` 建队）；但 lignting 三个 skill 文件里 `agent_teams_*` 命中 **0**，没有反向约束 | **真实风险**：自然语言触发 + 模型「并行更好」的倾向 → 用户只是想问一句，却被建了 staged 队伍，然后**卡在等 Web 批准** | 补丁 A1（硬规则 1/4）：⑴ 非显式要求不得建队；⑵ 用户未批准就回到单会话执行，不得空等 |
| R4 | `approval=required` 与 plan mode 的关系 | staged 阶段：不 spawn、不调度（`src/types.ts:375-384`）；批准只能来自**新的用户回合**或 Web 动作（`src/tools.ts:1255-1257`）；plan mode 是宿主另一套机制（profile `planning` 组，`cordis.patch.yml:256-316`） | **两者是两道独立闸门，不互相满足**：plan mode 批准 ≠ 团队计划批准 | 写清楚：团队模式下**批准动作在 Web 计划页**（或 `/agent-teams` 之后的明确「批准」回合）；skill 的「计划确认」（`command/plan.md:59`）仍照旧执行，不能替代 |
| R5 | 成本与并发上限 | 成员是 continuable 持久子会话（`src/types.ts:262-307`）；`maxMembers` 默认 8；`maxActiveSubagents: 15`；`reasoning_effort` 省略时**同一 provider+model 才继承** captain 档位（`src/members.ts:525-537`）；压缩阈值对本项目探索模型降到 0.5（`profiles/web/cordis.patch.yml:330-336`） | 8 人 × 持久上下文 × 继承 `high` 档 = 成本放大且不可控 | 每名成员显式给 `model` + `reasoning_effort`（如 `deepseek-official/deepseek-v4-flash` + `low`）；团队压到 3-4 人（第 5.4 节） |
| R6 | `.agent-teams/` 进版本库 | `.gitignore` 只有 6 行、无 `.agent-teams`；`git check-ignore .agent-teams/` 退出码 1；`git status` 显示 `?? .agent-teams/` | 团队状态、邮箱会被 git 看到 | 补丁 D1：`.gitignore` 追加 `.agent-teams/` |
| R7 | 「实现者 ≠ 验证者」无硬校验 | 只有提示词文本（`src/index.ts:186`、`src/members.ts:830`）；源码无比对逻辑 | 可能被实现者自己关掉 review 门 | 由任务结构保证：review/verification 任务的 `assignee` 显式给非实现者；captain 建任务时不得把 review 指派给 reviewedTaskId 的 assignee |
| R8 | `requiredReviewers` 是死配置 | 仅解析校验，无消费点（见结论表 #13） | 误以为配了就有 N 路审查 | 用「多建 3/8 个 review 任务」表达，别信配置 |
| R9 | 探索子代理「不下结论」与 `/lts` 要求下判断冲突（既有） | persona（`cordis.patch.yml:26-30`）vs `command/lts.md:25-26` | 团队化会放大：成员 persona 也可能与 skill 局部例外打架 | 团队模式下不要用「成员替代 `/lts` 的讨论」；讨论留在主会话（第 2.3 节） |
| R10 | codegraph MCP 指向别的项目 | `--path D:\studio_frontend\studio_frontend`（`cordis.patch.yml:44-54`） | 成员/子代理会「成功但答错」 | 建队前由 captain 校验 `codegraph_status` 指向的路径；不匹配时**不得**把结构探索交给成员（02 §C9） |
| R11 | 双写状态漂移 | `.whatsnext/` 私有、`.lignting/` 随 git、`.agent-teams/` 第三处 | 三处状态易漂移 | 第 3.4 节分层规则 + 成员禁止触碰前两处 |
| R12 | 交付门可能长期阻塞 | 审计 gap 即 blocker（`src/quality-gates.ts:1675-1682`）；artifact 不可读也算 gap（`src/workspace-audit.ts:44-48`） | 交付结论可能一直出不来 | 交付前确认：所有 `changedPaths` 可读、无超枚举；别在 `deliverables` 里登记易失文件 |

---

## 7. 建议的插件配置片段（供 owner 参考，非本次改动范围）

```yaml
# ~/.dsh/profiles/web/cordis.patch.yml 里 id: agent-teams 那一条的 config
- id: agent-teams
  name: '@nanmicoder/dsh-agent-teams'
  config:
    stateDir: .agent-teams
    memberProvider: spawn
    memberMaxDepth: 0        # 成员不得再委派（默认即 0，显式写出以防误改）
    maxMembers: 4            # 与 /ltrv 的并发预算配合，见 5.4
    toolPolicies:            # 只在这里声明；成员只能按 id 选
      lignting-readonly:
        allow: [ ...见 5.3... ]
      lignting-explore:
        allow: [ ...见 5.3... ]
    profiles:
      lignting-round:        # 一轮实现的标准队伍（taskPlanning=captain，DAG 由 captain 按轮次推）
        description: "lignting 一轮实现：星币层计划 → 实现 → 独立验收 → 审查 → 集成"
        protocol: "计划文档是唯一输入；偏离必须显式记录；不碰 .lignting/ 与 .whatsnext/"
        taskPlanning: captain
        members:
          - { name: captain }                       # 队长即主会话
          - { name: implementer, role: engineer }   # 不选策略：需要全量写入工具，靠 inScope 约束
          - { name: verifier,    role: verifier, tool_policy: lignting-readonly }
          - { name: reviewer,    role: reviewer, tool_policy: lignting-readonly }
        reviewPolicy: { codeMaxRounds: 3, maxRepairAttempts: 1 }
```

> 注：`profile` 最多 16 个、单 profile 种子任务最多 32 个、protocol 进提示词截断 240 字符（`src/profiles.ts:15-19`、`:241-248`）。`memberModel`/`memberLlmProvider` 的配对规则见 `src/members.ts:493-516`；模型归属歧义会**硬报错**而不是静默配对（issue #189）。`tool_policy` 选中的 id 必须存在于 `toolPolicies`，否则该成员创建失败（`src/tool-policies.ts:181-194`）；选中的 id 事后被删除时 spawn 会直接失败而不是退化（`:150-171`）。
>
> ⚠️ `reviewPolicy.requiredReviewers` 虽然能写，但**没有消费点**（见结论表 #13），不要指望它强制多路审查——要几路审查就建几个 `review` 任务。

---

## 8. 待确认项（本文无法从源码确认）

| # | 项 | 影响 | 建议确认方式 |
|---|---|---|---|
| 1 | 当前运行态 captain 会话里 `team_task_*` / `spawn_teammate` 是否可见 | 决定「两套团队工具会不会并存」 | 在 captain 会话里 dump 一次工具目录 |
| 2 | 宿主 `dsh-experimental-*` 各层在本 profile 的实际生效顺序 | 若实验层最后生效，它 `disabled: true` 掉的 `tool-subagent`/`tool-subagent-fork` 会影响 lignting 现用能力 | 一次 `/lt-review low` 实测 `subagent` 是否可用 |
| 3 | `.lignting/.cr-state.json` 在多 review 任务下是否会并发写坏 | 决定报告合并归属 | 观察首次团队 review |
| 4 | 非 web（headless）profile 下团队 UI 缺失行为 | 只影响可用性，不影响本方案 | 01 §8.4 已列为遗留 |
| 5 | 团队成员能否稳定读到 `.lignting/`（同一 workspace） | 若不能，「计划文档作输入」的路径要改为把计划正文塞进任务 `objective` | 首次建队时让成员读一次计划文档并回报 |

---

## 9. 落地清单：建议补丁段落（**文本建议，不修改文件**）

> 每条给：目标文件 → 建议插入位置 → 补丁文本 → 依据 → 预期收益。
> 外部 agents 使用本项目 skill 时，应把这里的规则当作 skill 契约的一部分。

### 补丁 A1 —— `skills/lignting/SKILL.md` 公共约束新增第 8 条

**位置**：`## 公共约束（所有命令一律生效）` 第 7 条「局部例外」之后（当前文件 136 行，插在 `- 例外要写明**范围**…不得静默放宽。` 之后）。

**补丁文本**：

```markdown
### 8. 与 AgentTeams 的分工（团队协作）

默认**不下发团队**。本 skill 的子代理约定（第 3 条）保持不变；团队只在下面两个条件
**同时**成立时启用：

- 用户**显式**要求建队（说了「用团队」「开个 AgentTeams」「并行开几个成员」等），或用户已在
  Web 计划页按下「Approve & Run」；
- 工作满足「跨多轮 + 要改代码 + 需要独立验收」三件套。

**硬规则**：

- **不得自行建队。** 用户没显式要求时，一律用 `subagent_explore` / `subagent` 或主会话执行；
  更不得因为「并行更快」而建队。
- 建队前先 `agent_teams_status` 看有没有现成队伍，有就接着用，不重建花名册与任务图。
- 建队必须以 `approval="required"` 走两阶段：`staged` 阶段**不 spawn、不调度**，把花名册与
  任务图一次性交给用户审阅后**停下**，不在同一回合自行批准。
- **用户一小时未批准（或明确说不建队）→ 回到单会话执行**，不得空等、不得反复催。
- 团队成员**不得**改 `.lignting/` 与 `.whatsnext/`：方案文档与进度真相各只有一个写者
  （见 [references/whatsnext-bridge.md](references/whatsnext-bridge.md) 第二节规则 1）。
- 团队成员不得改 `.agent-teams/`（那是插件状态目录），也不得把它写进任何任务的 `inScope`。
- 任务板是**团队运行期**状态，不是进度真相；一轮收尾仍由本 skill 勾 whatsnext 复选框。

协作细则（任务种类、verdict、inScope、并发预算）见各命令文件的「团队模式」小节。
```

**依据**：插件侧两阶段与批准语义（`src/types.ts:371-384`、`src/command.ts:66-85`、`src/tools.ts:1255-1257`）；`.agent-teams` 默认排除（`src/quality-gates.ts:299-309`）；lignting 状态单源（`references/whatsnext-bridge.md:22-30`）。

**收益**：把结论表 #11（无反向约束）消掉；避免「问一句就被建队、然后卡着等人批准」的体验事故。

### 补丁 A2 —— `skills/lignting/SKILL.md` 第 3 条「子代理规范」增补边界

**位置**：`### 3. 子代理规范` 的三个 bullet 之后（当前 106-111 行）。

**补丁文本**：

```markdown
- 判定顺序：只在本命令内用一次的探索/审查 → 子代理；要跨轮次保留身份、要别人来验收、
  要机器校验写入范围 → 才考虑团队（见第 8 条）。
- 团队成员**不需要** `subagent_explore`：插件的成员策略默认放行 codegraph 工具，成员可以
  自己查结构；只有为了不污染成员上下文时才把 `memberMaxDepth` 调到 1。
```

**依据**：成员默认过滤只 deny captain-only 与 `subagent`/`send_message`（`src/tool-policies.ts:31`、`:209-212`），codegraph 不在 deny 内。

**收益**：消除「团队里再套一层子代理」的空转（第 1.3 节反模式 1）。

### 补丁 B1 —— `skills/lignting/command/plan.md` 增补「团队模式」小节

**位置**：第 4 步「输出计划」之后、文件末尾（当前 59 行后）。

**补丁文本**：

```markdown
## 团队模式（仅当用户显式要求建队时）

第 4 步的计划输出照旧，**额外**做两件事：

1. 把计划落成 **staged 任务图**（不 spawn、不调度）。任务图最小形态：
   `requirements` → `implementation` → `verification` / `review` → `integration`。
   - 每个任务必须给 `subject`；质量类必须给 `objective` + ≥1 条 `acceptance`；
     `implementation`/`repair` 还必须给 `inScope` + `verify`，且 `inScope` 用
     **workspace 相对 POSIX 路径**（跨平台斜杠统一 `/`），目录以 `/` 结尾。
   - `implementation` 必须依赖 requirements（或在 requirements pass 之后建）。
   - 相邻写类任务的 `inScope` **不得重叠**；重叠就拆路径或加依赖串行。
   - 批准前就在计划里点明「实现者 ≠ 审查者」：review/verification 的 assignee 不是实现者。
2. 把计划展示给用户并要求在 **Web 计划页** 批准（或明确回一句「批准」）；
   **本回合不得自行批准**。用户拒绝或超时未批 → 按单会话模式执行第 4 步的计划。
```

**依据**：`validateCreateTask` 的六条强校验（`src/quality-gates.ts:402-482`）；`staged` 不调度（`src/types.ts:375-384`）；批准只在新回合或 Web（`src/tools.ts:1255-1257`）。

**收益**：把 `command/plan.md:59` 的「确认后才编码」变成机器可校验的两阶段，同时一次建图避免「反复补任务」的回合浪费。

### 补丁 B2 —— `skills/lignting/command/ltp.md` 增补「团队模式」

**位置**：第 5 步「输出计划文档」与「落盘与收尾」之间（当前 84 行前后）。

**补丁文本**：

```markdown
## 团队模式（把本轮计划变成任务图）

只细化**本轮**的规则不变。团队模式额外要求：

1. **`inScope` 来源**：第 5 节「本轮范围」逐条转成路径模式；「明确不做什么」转成 `outOfScope`。
   禁止出现 `..`、盘符、以 `/` 开头的绝对路径、`~`；禁止把 `.git` / `.agent-teams` / `.env*`
   写进去（这些路径任何合同都不能主张）。
2. **`verify` 来源**：第 4 节的「验证命令」照抄，**必须是能跑通的命令**——
   完成时若有任何一条 `verify` 失败，任务只能以 `failed` 收尾，会连带阻塞整条下游。
   如果某条命令当前必然失败，先改合同（`amend_task`，仅队长、仅未终态），不要硬建任务。
3. **`acceptance` 措辞**：与第 5 节「验收标准细化」的条目**逐字对应**（编号→条目），
   方便实现者提交 `acceptanceResults` 时一一覆盖。
4. **偏离通道**：计划里的错误假设不要现场改计划文档；让成员用
   `agent_teams_send_message(to=captain)` 报，队长裁定后用 `edit_plan` 批量改
   （一次性原子提交，先改下游引用再删任务）。pass 过的合同会被冻结，改不动。
```

**依据**：路径规范化与默认排除（`src/quality-gates.ts:259-309`）；`verify` 失败不得 completed（`:580-584`）；`edit_plan` 的原子批量语义与全量替换（`src/tools.ts:1131-1133`、`:2068`）；`amend_task` 的冻结条件（`:797-804`）。

**收益**：把 `command/ltp.md:74-80` 已有的范围/验证/验收三段，一次翻译成机器可校验字段——正是 02 §C5 指出的最大空缺。

### 补丁 B3 —— `skills/lignting/command/ltw.md` 增补「团队模式」与汇报字段对齐

**位置**：第 1 步之前加一小节；第 5 步的表格后加字段说明（当前 17 行前、61 行后）。

**补丁文本**：

```markdown
## 团队模式（本轮由团队成员执行时）

- 成员先 `agent_teams_claim_task` 拿到本次执行的 `attempt_id`；**之后每次**
  `agent_teams_update_task` 都必须带同一个 `attempt_id`，否则陈旧 attempt 会被拒。
- **只改 `inScope` 里的路径**。完成时必须给 `changedPaths`，且每一条都会被判定为
  `in_scope` 才允许 `completed`——多改一个文件就关不了单。
- 自测完成后**立刻**上报（`update_task`），不要等队长确认，也不要「再多探索一会儿」。

### 汇报字段对齐（第 5 步第 2 段表格）

| 四段式汇报 | 上报字段 |
|---|---|
| 做了什么（文件清单） | `changedPaths` + `output` |
| 验证结果（逐条验收 → 命令 → 结果） | `acceptanceResults`（覆盖全部 `acceptance`，逐条 passed/failed）+ `commandsRun`（覆盖全部 `verify`） |
| 与计划的偏离 | `output` 里的偏离节 + （若影响合同）`send_message(to=captain)` |
| 影响后续轮次的问题 | 同上；终态后也可以用 `evidence_note` 追加（只追加，不改结论） |

**失败的条目必须如实报 failed**：任何一条 `verify` 失败都只能以 `failed` 收尾，
不许粉饰成 completed——那会被完成门直接拒绝，而且会拖住整条下游。
```

**依据**：attempt 与陈旧校验（`src/state.ts:182-227`、`src/tools.ts:1950-1952`）；`changedPaths` 全覆盖 `in_scope`（`src/quality-gates.ts:593-602`）；`acceptanceResults`/`commandsRun` 覆盖（`:586-592`）；append-only 补充证据（`src/tools.ts:1954-1968`）；成员四件套 persona（`src/members.ts:814-830`）。

**收益**：29 行原文的「贴真实命令与真实输出」（`command/ltw.md:57-61`）从**文本要求**升级为**机读门禁**（结论表 #12）。

### 补丁 B4 —— `skills/lignting/command/review.md` 增补「团队模式 / verdict 契约」

**位置**：第 5 步之后、「注意事项」之前（当前 112 行前）。

**补丁文本**：

```markdown
## 团队模式：把报告变成 verdict（质量门）

档位不变（low 1 / middle 3 / high 8），团队模式下**每个方向开一个 `review` 任务**，而不是
一个任务里跑 8 个子代理：

- 每个 `review` 任务必须有 `objective` + ≥1 条 `acceptance`，并给 `reviewedTaskId`
  指向被审的 `implementation`/`repair` 任务（其他类型不接受）。
- 结论必须是 `pass` / `needs_revision` / `reject` 三选一：
  - `pass` 才能让 review 任务 `completed`，且**不得**遗留未解决的 high/blocker finding；
  - `needs_revision` / `reject` 必须以 `failed` 收尾，并**至少给一条 finding**
    （`id` / `severity` / `problem` / `requiredFix`）。
- **`reject` 不会自动修复**：会直接升级留给人。想让它自动修，用 `needs_revision`
  （插件会自动开 `repair` 轮 + 下一轮 `review`，同一 source+finding 集合去重）。
- 原文的「取各 agent 最低分作基准」（第 5 步）改为**描述性**结论；**门禁只看 verdict**。
- 报告文件与 `.lignting/.cr-state.json` 由**队长合并写一次**，不要每个 review 任务各写一份：
  多写者会争同一路径，也会让交付审计的路径集合无谓膨胀。
- high 档 8 路与团队人数**共用并发预算**；团队 ≥8 人时把档位降到 low/middle。
```

**依据**：`verdict` 完成门与 finding 要求（`src/quality-gates.ts:562-576`）；`reject` 直接 escalate（`:937-946`）；`needs_revision` 自动 repair 与去重（`:984-1046`）；`reviewedTaskId` 必填（`:418-425`）；审计 gap 阻塞交付（`:1675-1682`）；并发预算（第 5.4 节）。

**收益**：消掉 02 §C3 的「无 verdict 契约」空缺，同时避免「8 路审查 + 8 人团队」把并发池打满。

### 补丁 C1 —— `skills/lignting/references/whatsnext-bridge.md` 增补一节

**位置**：第二节「四条硬规则」之后（当前 57 行，作为「2.5」）或第六节「常见坑」表格前。

**补丁文本**：

```markdown
### 5. 引入 AgentTeams 后的第三处状态（只读）

团队协作时会出现第三个状态目录 `<项目>/.agent-teams/<teamId>/`（任务板 + 邮箱）：

| 位置 | 谁写 | 生命周期 | 可否当进度真相 |
|---|---|---|---|
| `.whatsnext/` | 只有本 skill 与用户 | 任务级、跨对话 | **是**（唯一） |
| `.lignting/` | captain（唯一写者） | 项目演进级、随 git | 否（本就不含状态字段） |
| `.agent-teams/` | 插件自己 | 团队运行期，可整队归档/删除 | **否** |

规则：

- 成员**不读不写** `.whatsnext/` 与 `.lignting/`；只碰任务板与自己 `inScope` 内的文件。
- 一轮收尾仍按第四节勾 `plan.md` 复选框——由图外的 captain 做一次，不让成员代劳。
- `.agent-teams/` 应加入 `.gitignore`（本仓库当前未忽略），团队状态不进版本库。
```

**依据**：`stateDir: .agent-teams`（插件 `cordis.patch.yml:10-21`）；状态单源硬规则（本文件 `:22-30`）；`.agent-teams` 默认排除（`src/quality-gates.ts:299-309`）；实测 `git check-ignore .agent-teams/` 退出码 1。

**收益**：防止 02 §C2 警告的「双源漂移」在引入第三处状态后升级为三源漂移。

### 补丁 D1 —— 仓库 `.gitignore` 追加一行

**位置**：`.gitignore` 第 6 行之后。

**补丁文本**：

```gitignore
.agent-teams/
```

**依据**：`profiles/web/package.json:19` 挂载的 bundle 以 `.agent-teams` 为状态目录（插件 `cordis.patch.yml` 的 `stateDir`），而本仓库 `.gitignore` 只有 6 行；`git status` 当前已显示 `?? .agent-teams/`。

**收益**：团队状态与邮箱不进版本库；与「`.whatsnext/` 私有」的既有做法一致。

### 补丁 D2 —— profile：为 `/ltrv` 与团队共用并发池做取舍（**供 owner 决策，不改 skill**）

**位置**：`C:\Users\cihu0\.dsh\profiles\web\cordis.patch.yml:412-416`（`id: subagent`）与新增的 `id: agent-teams` 配置。

**建议**：二选一，并写进文档让用户知道当前处于哪种模式——

| 模式 | `maxMembers` | `maxActiveSubagents` | 说明 |
|---|---|---|---|
| 审查优先（默认） | 4 | 15（现状） | 保留 `/ltrv high` 的 8 路余量；团队最大 4 人 |
| 团队优先 | 8 | 24 | 允许满编团队，但并发池翻倍；`/ltrv` 应降到 low/middle |

**依据**：`maxMembers` 默认 8（`src/index.ts:172`）；`maxActiveSubagents: 15` 为本 profile 显式设置（`cordis.patch.yml:415-416`）；成员 `reasoning_effort` 继承规则（`src/members.ts:525-537`）与压缩阈值（`cordis.patch.yml:330-336`）。

**收益**：把「成本/并发」从隐性踩坑变成显式选择（结论表 #14、风险 R5）。

---

## 10. 最小落地顺序（建议）

1. **D1**（`.gitignore` 一行）——零风险，立刻可做。
2. **A1 + A2**（`SKILL.md` 两条）——把「不自行建队」的硬规则先立起来，避免误触发。
3. **C1**（`whatsnext-bridge.md` 一节）——状态分层先写清楚，再谈任务图。
4. **B1**（`plan.md` 团队模式）——建立「计划 = staged DAG」的入口。
5. **B2 + B3**（`ltp.md` / `ltw.md`）——作用域与证据字段落地，此时团队才真正可用。
6. **B4**（`review.md` verdict 契约）——质量门闭环。
7. **D2**（profile 取舍）——按实测的并发压力再定。
8. 改完**必须**同步用户级副本：`npm run check` + 复制到 `~/.dsh/skills/lignting/`（`docs/install.md:58-75`、`references/whatsnext-bridge.md:58-64`）。注意用户级优先加载，不同步等于没改。

---

## 附：本文引用的关键行号索引

| 主题 | 插件侧 | 项目侧 |
|---|---|---|
| 工具名与成员四件套 | `src/tool-names.ts:2-14` | — |
| 两阶段/批准 | `src/types.ts:371-384`、`src/command.ts:66-85` | `command/plan.md:59`、`command/ltp.md:88` |
| 任务种类与合同强校验 | `src/quality-gates.ts:402-482` | `command/ltp.md:70-84` |
| 作用域与默认排除 | `src/quality-gates.ts:259-309` | `command/ltp.md:74-75`、`command/ltw.md:39` |
| 完成门 | `src/quality-gates.ts:580-602` | `command/ltw.md:41-47,57-61` |
| verdict 门 | `src/quality-gates.ts:562-576` | `command/review.md:96-111` |
| 自动 repair / escalate | `src/quality-gates.ts:937-1046` | — |
| attempt 代际 | `src/state.ts:182-227`、`src/tools.ts:1950-1952` | — |
| 成员工具策略 | `src/tool-policies.ts:5-24,205-218` | `profiles/web/cordis.patch.yml:31-41` |
| 成员深度护栏 | `src/index.ts:171-173`、`src/members.ts:1020-1069` | — |
| 并发上限 | `profiles/web/cordis.patch.yml:412-416` | — |
| 状态单源 | 插件 `cordis.patch.yml`（`stateDir`） | `references/whatsnext-bridge.md:22-30` |
| 命令路由 | `src/command.ts:8-35` | `src/host.js:19-38` |
