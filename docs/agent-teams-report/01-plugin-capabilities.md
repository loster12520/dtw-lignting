# 01 · @nanmicoder/dsh-agent-teams 插件能力清单（事实底稿）

> 本文只记录**从源码/配置中可核实**的事实。每条结论后附「文件路径:行号」。
> 行号一律相对**插件根目录**。凡无法从代码确认的，标注「未确认」，不做推测。

## 0. 取证范围与方法

| 项目 | 值 | 来源 |
|---|---|---|
| 插件根目录（引用基准） | `C:\Users\cihu0\.dsh\profiles\web\node_modules\@nanmicoder\dsh-agent-teams` | 目录列举 |
| 实际解析目标 | 符号链接 → `D:\project\github\dsh-agent-teams` | `Get-Item ... \| Select Target` |
| 版本 | 0.1.23 | `package.json:3` |
| 对照产物 | `...@nanmicoder\dsh-agent-teams.pnpm-0.1.23.bak` → pnpm store 实体，`version` 同为 **0.1.23**，且**只有 `lib/`（编译产物），无 `src/`** | 目录列举 + 该目录 `package.json` |
| 本机 git HEAD | `e7cb21a fix: read the stored session format from the live host (#236)` | `git -C D:\project\github\dsh-agent-teams log --oneline -5` |

取证方式：逐个 `read` 插件源码文件 + 对 `src/**` 做正则检索（`grep`）。**未执行任何插件代码或测试**，因此所有结论均为「源码事实」，不含运行时行为验证。

关于「版本对比」：`.bak` 与当前链接目标版本号相同（0.1.23），差异仅是「发布产物（lib） vs 源码工作树（src，额外含 #236 提交）」，**不构成版本差异对照**，故本文不设版本对比小节。

---

## 1. package.json 与安装方式

**身份与入口**
- 包名 `@nanmicoder/dsh-agent-teams`，版本 `0.1.23`，`"type": "module"`；主入口 `lib/index.js`，类型 `lib/types/index.d.ts`：`package.json:2-7`。
- 导出映射：`.`（宿主侧）、`./client`（浏览器侧 `lib/client.js`）、`./cordis.patch.yml`、`./package.json`：`package.json:8-19`。
- Node 引擎要求 `^22.19.0 || >=24`：`package.json:59-61`。
- 发布配置 `access: public` / tag `latest`：`package.json:62-66`。
- 可执行入口 `dsh-agent-teams-doctor` → `scripts/doctor.mjs`：`package.json:251-253`。

**`dsh` 字段（宿主接入口）**
- `dsh.bundle.patch = ./cordis.patch.yml`（bundle 层挂载）：`package.json:67-70`。
- `dsh.client.platform = web`，`dsh.client.inject` 声明 8 个客户端依赖（locale / ui-conversation / ui-layout / ui-sidebar-right / ui-model-selection / api-session-controller / ui-session / ui-chat）：`package.json:71-83`。
- 注意：`dsh` 字段中**没有** `tools` / `profiles` 键；工具注册发生在运行时插件体里（见第 2 节），不在 package.json 声明。

**依赖模型**
- 依赖全部是 **peerDependencies + 逐条 optional**（`@deepseek-ai/cordis`、`dsh-agent`、`dsh-subagent`、`dsh-tools`、`dsh-system-prompt`、`dsh-commands`、`dsh-llm`、`dsh-session`、`dsh-client-ui-*`、`react`、`schemastery` 等）：`package.json:114-139`、`140-213`。
- 对宿主版本用**多版本并集**约束（`0.2.0-rc.2 || 0.1.7-rc.2 || 0.1.5-rc.3 || 0.1.5-rc.2 || 0.1.5-rc.1 || 0.1.2-rc.1 || 0.1.2-alpha.5 || 0.1.2-alpha.2`）：`package.json:116-136`。
- devDependencies 锁定 `@deepseek-ai/dsh` / 各 `dsh-*` 为 `0.2.0-rc.2`，构建工具 `tsdown` / `lightningcss` / `typescript`：`package.json:214-250`。
- 构建/校验脚本：`build`（tsc + tsdown + git 产物戳）、`verify`（超长链，含 quality-gates TDD、harness 契约、tool-policies、capabilities 等）：`package.json:85-113`。

**挂载声明**
- 插件自带 patch 行：`id: agent-teams`、`name: '@nanmicoder/dsh-agent-teams'`，配置 `stateDir: .agent-teams`、`memberProvider: spawn`：`cordis.patch.yml:10-21`。
- 注释明确安装方式为 `dsh plugin --profile <name> add <this package>`（npm 或本地路径），由 `dsh plugin` 安装并协调进 profile 的 `dsh.profile.bundles`：`cordis.patch.yml:1-9`。

**本机实际安装形态**
- 该 profile 的依赖是**本地链接**：`"@nanmicoder/dsh-agent-teams": "link:D:/project/github/dsh-agent-teams"` —— 即不是从 npm 安装 tarball，而是直接跑源码工作树：`C:\Users\cihu0\.dsh\profiles\web\package.json:29`。
- 同时登记在 bundle 列表第 19 项：`C:\Users\cihu0\.dsh\profiles\web\package.json:19`。

**插件持久化状态位置（重要纠偏）**
- 插件状态在**各自 workspace 下**的 `<workspace>/<stateDir>/<teamId>/`，由 `team.json` + `inbox/*.jsonl` 组成：`src/types.ts:3-6`、`src/state.ts:234-237`（创建 `inbox/` 与 `team.json`）。
- 本会话 workspace 实测存在 `D:\project\github\dsh-lignting\.agent-teams\dsh-agent-teams-capability-report\{team.json, inbox\}` —— 与源码一致。
- 任务书提到的 `C:\Users\cihu0\.dsh\task-board\ledger-v2.json`（`schemaVersion:3`、`tasks: []`、`scheduler.lastTickAt`）与 `scheduler-v2.json`（`{"lastTickAt":...}`）**不是本插件的状态文件**：两者均为 2026-09-02 的古老空文件，且 `src/**` 全文检索无 `task-board` / `ledger-v2` 任何引用；它们属于宿主 task-board 系列 bundle 的落盘。**（结论：与 AgentTeams 无关）**

---

## 2. 工具面

### 2.1 工具名常量

- 业务 API 共 **14 个**（注释：`exposure changes never rename these operations`）：`agent_teams_create`、`approve`、`edit_plan`、`add_member`、`remove_member`、`create_task`、`reassign_task`、`claim_task`、`update_task`、`amend_task`、`send_message`、`status`、`resume`、`delete`：`src/tool-names.ts:2-8`。
- **成员可用 4 个**：`claim_task`、`update_task`、`send_message`、`status`：`src/tool-names.ts:10-12`。
- **captain 工具** = 全体减去成员 4 个（即 10 个）：`src/tool-names.ts:14`。

### 2.2 逐个工具（注册点 + 用途）

| 工具 | 注册行 | 用途（取自 `description`） |
|---|---|---|
| `agent_teams_create` | `src/tools.ts:923-925` | 建队；`approval=required` 走两阶段（staged，成员不 spawn、任务不可认领，等 Web 审阅批准）；`automatic` 保留旧直接执行；可带 profile 或一次性 `plan{members,tasks}` |
| `agent_teams_edit_plan` | `src/tools.ts:1131-1133` | 原子批量改计划；staged 阶段可改花名册+DAG；running 阶段**只允许**对「从未开始的 pending 任务」`update_task` |
| `agent_teams_approve` | `src/tools.ts:1255-1257` | 批准并启动 staged 计划；只应在**新的用户回合**里因用户明示批准而调用；Web 的 Approve & Run 走同一 runtime |
| `agent_teams_add_member` | `src/tools.ts:1287-1289` | 加成员（idle 行不调用模型；批准后成员随首个就绪任务/消息启动并长期存活） |
| `agent_teams_remove_member` | `src/tools.ts:1391-1393` | 安全移除：撤销当前 attempt、未完成自有任务退回共享池、打断实时回合、标记 removed |
| `agent_teams_create_task` | `src/tools.ts:1450-1452` | 建任务（`kind` 默认 `work`；`review` 只能作为既有 implementation/repair 的质量门；依赖全部 completed 才可认领） |
| `agent_teams_reassign_task` | `src/tools.ts:1608-1610` | 原子重试/改派/captain 接管；先撤销旧 attempt 再打断成员；`assignee="captain"` 时 captain 同一时刻只能拥有一个未完成接管 |
| `agent_teams_claim_task` | `src/tools.ts:1739-1741` | 成员认领自己的就绪任务或读回现有 `attempt_id`；**不派活**；一个成员不能同时拥有两个未完成任务 |
| `agent_teams_update_task` | `src/tools.ts:1840-1842` | 更新状态/产出；成员必须带当前 `attempt_id`，陈旧 attempt 被拒；终态不可变但可追加补充证据 |
| `agent_teams_amend_task` | `src/tools.ts:2066-2068` | **仅 captain** 的受控合同修订（objective/acceptance/verify/inScope/outOfScope）；记入 revisions ledger；已通过 review 的合同被冻结 |
| `agent_teams_send_message` | `src/tools.ts:2147-2149` | 给 captain/队友发协调或本任务指引；运行中收件人在下一个模型步收到，空闲收件人被唤醒；消息持久保留到被读 |
| `agent_teams_status` | `src/tools.ts:2282-2284` | 团队快照（成员活跃度 + 任务状态/负责人/依赖/产出）；captain 看全部邮箱，成员只看自己 |
| `agent_teams_resume` | `src/tools.ts:2427-2429` | 显式恢复被 halt 的团队；需非空 reason；不重建已取消任务，只调度仍 pending 的工作 |
| `agent_teams_delete` | `src/tools.ts:2479-2481` | 结束并归档团队：打断成员、把任务与邮箱移出活动态；同名归档会替换上一代 |

关键参数（`create_task`）：`kind` 枚举与语义在 `src/tools.ts:1462-1466`；`objective` `1468`；`inScope` `1469`；`outOfScope` `1470`；`acceptance` `1471`；`verify` `1472`；`reviewedTaskId` `1475`；`sourceTaskId` `1476`；`sourceFindingIds` `1477`；`coverageOf` `1478`；`resume`/`resumeReason` `1479-1480`。

关键参数（`update_task`）：`attempt_id` `src/tools.ts:1845`；`status` 枚举 `in_progress|completed|failed|cancelled` `1846-1850`；`output` `1851`；`evidence_note`（仅终态）`1852`；`verdict` `1853-1857`；`findings` `1858-1874`；`changedPaths` `1875-1879`；`acceptanceResults` `1880-1892`；`commandsRun` `1893` 起。

### 2.3 `team_task_*` 系列：不存在于本插件

- 对 `src/**` 检索 `team_task`：**0 处匹配**（结论：本插件不提供）。
- 该系列由**宿主侧另一个包**提供：`C:\Users\cihu0\AppData\Local\nvm\v24.14.1\node_modules\@deepseek-ai\dsh\node_modules\@deepseek-ai\dsh-experimental-tool-agent-team\lib\index.js:367`（`team_task_create`）、`:402`（`team_task_list`）、`:446`（`team_task_get`）、`:459`（`team_task_update`）；同包还注册 `spawn_teammate:243`、`send_message:296`、`list_agents:323`、`wait_agent:332`、`interrupt_agent:354`、策略段 `team:policy:238`（说明见该包 `README.zh.md:59-64`）。
- 该包由 profile 层的 `@deepseek-ai/dsh-experimental-agent-team-profile` 挂载；该层还会 **禁用** 宿主 `tool-subagent` / `tool-subagent-fork` / `tool-subagent-control` / `tool-subagent-list-agents` 并插入 `agent-team` / `tool-agent-team` / `ui-agent-team` 三行：`...\dsh-experimental-agent-team-profile\cordis.patch.yml:4-33`。
- 本机 profile 的 `bundles` 确实包含 `@deepseek-ai/dsh-experimental-agent-team-profile`：`C:\Users\cihu0\.dsh\profiles\web\package.json:21`；但同一 profile 的 `cordis.patch.yml` 又**重新声明**了 `tool-subagent` / `tool-subagent-fork` 等行：`C:\Users\cihu0\.dsh\profiles\web\cordis.patch.yml:345-383`、`412-416`。
- **未确认**：在当前运行的 captain 会话里 `team_task_*` / `spawn_teammate` 是否实际可见。本报告只依据源码，未对运行态工具目录取证。

### 2.4 工具可见性如何被收窄（与第 6 节呼应）

- 成员身份识别后，用宿主 `agent.ctx.tools.restrict({ deny: 全部非成员工具 })` 收窄：`src/capabilities.ts:93-95`。
- 成员 spawn 时另外把不可变 `toolFilter` 交给 `startContinuable`：`src/members.ts:903`、`src/members.ts:911-936`。
- 系统提示段按身份二选一（captain 协议文本 vs 成员协议文本）：`src/capabilities.ts:101-106`。

---

## 3. 任务模型

### 3.1 状态与种类

- 任务状态：`pending | claimed | in_progress | completed | failed | cancelled`；终态集合 `['completed','failed','cancelled']`：`src/types.ts:14-23`。
- 合法状态迁移：`pending→{claimed,cancelled}`、`claimed→{in_progress,failed,cancelled}`、`in_progress→{completed,failed,cancelled}`、终态无出边：`src/state.ts:148-155`（运行时校验 `transitionError` `src/state.ts:163-169`；质量门内另有一份同义表 `src/quality-gates.ts:513-520`）。
- 质量种类 `TaskKind`：`requirements | implementation | verification | review | repair | integration | work`（缺省/未知一律按 `work`）：`src/types.ts:26-43`。
- 只用 6 个质量类参与门禁（`QUALITY_KINDS`，不含 `work`）：`src/quality-gates.ts:29-36`；其中**写类**仅 `implementation`、`repair`：`src/quality-gates.ts:38`。
- 未开始状态集合 `OPEN_STATUSES = [pending, claimed, in_progress]`：`src/quality-gates.ts:39`。

### 3.2 attempt_id 能力

- `TeamTask` 上承载一代执行：`attempt`（单调执行代数）、`attemptId`（当前 attempt 的能力票据）、`handoffId`（撤销/交接但未开始下一代的代际）、`reassigning`（交接静默期，调度不得派发）：`src/types.ts:179-188`。
- 生成/激活：`activateTaskAttempt()` 生成 `randomUUID()`、置 `claimed`、清空上一代结果：`src/state.ts:182-192`；`beginTaskAttempt()` 先 `attempt += 1`：`src/state.ts:195-198`。
- 撤销：`invalidateTaskAttempt()` 清 `attemptId`、写新 `handoffId`、回 `pending` 并清结果：`src/state.ts:215-227`；取消（不回池）：`src/state.ts:205-213`。
- 校验：`update_task` 中 `task.attemptId !== args.attempt_id` 直接抛 stale（拒绝写入）：`src/tools.ts:1950-1952`。
- 结果属于某一代：重试必须产生自己的证据（`clearAttemptResult`）：`src/state.ts:171-179`。

### 3.3 revisions ledger（合同修订台账）

- `TaskRevision`：`at / by / reason / fields / previous`：`src/types.ts:138-149`；挂在 `TeamTask.revisions?`（仅 captain、追加不改写）：`src/types.ts:252-253`。
- 可修订字段白名单：`objective / acceptance / verify / inScope / outOfScope`：`src/quality-gates.ts:728`。
- 拒绝条件：作者/reason 为空、任务已是终态、`kind=work`、未提供可修订字段、字段值非法（含 inScope/outOfScope 必须是 workspace 相对路径）、**已存在对自己 verdict=pass 的 review/requirements**（合同冻结）：`src/quality-gates.ts:751-761`、`764-796`、`797-804`。
- 列表语义是**全量替换而非增量**：`src/tools.ts:2068`（描述）与 `src/quality-gates.ts:738-739`（注释）。

### 3.4 轮次（rounds）与循环上限

- `round` 为 1 起的 review/requirements/repair 轮次：`src/types.ts:191-192`。
- 默认策略：`requirementsMinRounds=1`、`requirementsMaxRounds=4`、`codeMaxRounds=3`、`maxRepairAttempts=2`：`src/quality-gates.ts:40-48`。
- 策略来自 profile 快照（`TeamProfileSnapshot.reviewPolicy`）：`src/types.ts:349-350`；解析校验（含 `min<=max`、正整数）在 `src/profiles.ts:413-439`。
- `planQualityFollowUp` 计算下一轮并判上限：`nextRound = currentRound + 1`，`maxRounds = requirements ? requirementsMaxRounds : codeMaxRounds`，越界即 escalate：`src/quality-gates.ts:948-952`。

### 3.5 `verdict=pass` 的语义

- `ReviewVerdict = pass | needs_revision | reject`：`src/types.ts:46-48`。
- 完成门：`review`/`requirements` **必须** `verdict=pass` 才能 `completed`，且 pass 不得遗留未解决 high/blocker finding；`needs_revision`/`reject` 必须以 `failed` 收尾且**至少一条 finding**：`src/quality-gates.ts:562-576`。
- pass 是对**版本**的证据：关单时把被判定版本的 artifact 摘要绑定到 verdict：`src/quality-gates.ts:1186`（`bindReviewToRevision`），相关字段 `reviewedArtifacts / reviewedScope / verdictStartSnapshot / reviewedDuringDrift`：`src/types.ts:210-238`。
- 交付门复核 pass：`completed` 但 verdict≠pass → blocker；已完成实现若无 pass 的 review → blocker：`src/quality-gates.ts:1642-1644`、`1655-1659`。
- pass 之后合同冻结（见 3.3）。

### 3.6 补充证据（append-only）

- `TaskEvidence`（`at/by/attempt/attemptId/note/acceptanceResults/commandsRun`）挂 `supplementalEvidence`：`src/types.ts:151-160`、`205-206`。
- 写入口 `appendTaskEvidence()`：`src/quality-gates.ts:2079`。
- 终态补证路径：`update_task` 对终态任务走 append（不改 verdict），并返回 `evidence_count`：`src/tools.ts:1954-1968`；非终态传 `evidence_note` 直接报错：`src/tools.ts:1969`。

### 3.7 团队级生命周期字段

- 两阶段：`phase: 'staged' | 'running'`（缺省按 running 兼容旧数据）、`planReviewState`、`approvedAt`：`src/types.ts:371-384`。
- 人类暂停：`halted` / `haltedAt`：`src/types.ts:385-391`。
- 循环触顶：`escalated`：`src/types.ts:394-395`。
- 持久化：`team.json` 原子写 + `inbox/` 目录：`src/state.ts:234-237`；进程内按 team 串行化 `withTeamLock`：`src/state.ts:67-84`。

---

## 4. 调度

模块自述：事件驱动，不用轮询保持回合；每个 idle 边沿与每次任务图变更尝试一次原子认领并唤醒成员；成员在仍持有未完成 attempt 时进入 idle 会被 **park**，只有 captain 显式改派才能轮换该能力；自动重试仅用于冷恢复：`src/scheduler.ts:1-13`。

**依赖 DAG 与 ready 判定**
- `unsatisfiedDependencies()`：依赖必须**全部 completed**才为空：`src/state.ts:139-142`。
- `nextReadyTask()`：`status==='pending'` 且非 `reassigning` 且依赖全满足；先取「指派给自己」的，再取「无主的共享池」：`src/scheduler.ts:202-208`。
- 依赖产出会被收集并按拓扑序（依赖先于被依赖）注入派发提示，单项 2000 字符、总量 12000 字符截断：`src/scheduler.ts:41-43`、`111-149`、`152-172`。

**kick 入口与 halt/staged 语义**
- `kickTeam`：队伍缺失 / `halted===true` / `phase==='staged'` → 直接返回；否则逐个成员 `kickMember`：`src/scheduler.ts:301-311`。
- `kickMember`：同样的三重短路：`src/scheduler.ts:317-322`。
- 成员可用性：`stopping===true` 不可用；活 Agent 存在且非 `idle` 不可用：`src/scheduler.ts:191-195`。
- 已拥有未完成任务时：本进程观察过 idle 边沿的 attempt 被 park（`parkedAttempts`），只有「本进程未观察过的持久 attempt」允许一次冷恢复：`src/scheduler.ts:279`、`358-369`、`393-398`。

**派发顺序**
1. 先发邮箱积压（真实待办），投递成功才 ack，失败则释放租约：`src/scheduler.ts:326-351`。
2. 否则开票：加锁重读 → 校验 → `beginTaskAttempt` → 对**判定类**（`isVerdictKind`）任务在开始前抓 `verdictStartSnapshot`：`src/scheduler.ts:353-438`（关键：`385`、`389-392`）。
3. 用 `assignmentPrompt()` 组装派发文本：`src/scheduler.ts:210-269`、`448`；若 `contractSnapshot` 与实际字节不一致，插入「工作单已过期，先按内容锚点重读再动手」警告，并附 `contractStaleness` 结果：`src/scheduler.ts:441-448`。
4. 投递失败只回滚**自己那一票**（比对 `attemptId`）：冷恢复失败则还原原代际并保持 park，否则回 `pending`：`src/scheduler.ts:455-484`。

**成员状态边沿**
- 监听宿主 `agent/status`：`src/scheduler.ts:547-551`。
- captain 侧：captain 没有调度通道，故 captain 变 idle 时把它名下的未完成接管任务 `invalidateTaskAttempt` 退回共享池：`src/scheduler.ts:497-521`。
- 成员侧：running→working，否则 idle；idle 时按是否仍有开放 attempt 决定 park：`src/scheduler.ts:528-544`。

**halt / resume**
- halt 语义（人类叫停，团队仍在盘上、成员仍在、未完成工作取消）：`src/types.ts:385-391`；Web 路由 `/plugins/dsh-agent-teams/halt`：`src/index.ts:285-338`。
- resume 纯函数：需非空 reason；未 halt 时返回 `already_running`：`src/quality-gates.ts:1687-1703`；工具路径 `src/tools.ts:2427-2477`（resumed 后清 halted/haltedAt、写事件、`kickTeam`）。
- `escalated ≠ halted`（明确区分并提示 escalate 不要视为 halt）：`src/quality-gates.ts:2013`、`resumeTeamState` 不含 escalated 处理。

**失败后的自动 repair + 下一轮 review**
- 触发条件：任务 `failed` **且**是质量类：`src/tools.ts:2003-2010`。
- 规则（`planQualityFollowUp`）：`reject` 直接 escalate（自动修复不能代替人类决策）；`needs_revision` 才继续；`verification` 失败同样自愈；`work`/其他返回空：`src/quality-gates.ts:937-946`。
- 生成物：`repair-round-N` + 下一轮 `review-round-N`（verification 失败则生成 `verification-round-N`）；repair 的因果边写 `findingSourceTaskIds`（不能写 dependencies，因为失败任务永远不会 completed）：`src/quality-gates.ts:999-1046`；repair 的 inScope 由 finding 的 `file` 与 `requiredFix` 里出现的路径推导，并剔除默认排除项：`src/quality-gates.ts:654-682`、`989-992`。
- 去重与限流：同一 source+finding 集合已有开放 follow-up 则不再建；已达 `maxRepairAttempts` 则 escalate：`src/quality-gates.ts:984-987`。
- 改线：staged 计划里指向「故意失败的门」的**仍 pending** 下游任务，其依赖被改指向新终态门：`src/tools.ts:2752-2766`。
- 落地：`applyQualityFollowUp()` 分配真实 task id 并记录 `contractSnapshot`：`src/tools.ts:2699-2773`；成功后给 captain 邮箱发一条 follow-up 摘要（含改线信息）：`src/tools.ts:2011-2016`、`2055-2060`。

**escalated（升级）行为**
- 置位：`planned.escalated === true → team.escalated = true`：`src/tools.ts:2706`。
- 同时给 captain 邮箱写升级说明（自动修复/复审已停止，原因与「留给人处理」的 finding 列表）：`src/tools.ts:2017-2023`。
- 交付门：`escalated===true` 是 blocker：`src/quality-gates.ts:1629`。
- 状态机呈现：`describeQualityLoop` 返回 `state: 'escalated'`，并提示「团队仍在运行，不要当作 halt，也不要再造一个 needs_revision 循环」：`src/quality-gates.ts:2017-2062`（escalated 分支 `2040-2050`）。
- 冷恢复边界：只有「本进程未观察过的持久 attempt」可被自动恢复一次：`src/scheduler.ts:1-13`、`358-398`。

---

## 5. 质量门与作用域

### 5.1 建任务时的强校验（`validateCreateTask`）

- halt 期间建任务必须同时 `resume=true` 且带非空 `resumeReason`：`src/quality-gates.ts:395-400`（并会把 `halted` 清掉：`484-486`）。
- **所有质量类**必须有非空 `objective` 与至少一条 `acceptance`：`src/quality-gates.ts:402-409`。
- **写类（implementation/repair）** 还必须有非空 `inScope` 与非空 `verify`：`src/quality-gates.ts:410-417`。
- `review` 必须给 `reviewedTaskId` 且该任务存在：`src/quality-gates.ts:418-425`。
- `repair` 必须给 `sourceTaskId` + 至少一个 `sourceFindingIds`，源任务存在，且**同一源+同一 finding 集合不得重复建**：`src/quality-gates.ts:426-438`。
- 依赖必须存在；`repair`/`review` 不得依赖 failed/cancelled 任务：`src/quality-gates.ts:440-449`。
- **写类之间 inScope 不得重叠**（除非有依赖关系），否则要求串行化或拆路径：`src/quality-gates.ts:451-465`（重叠判定 `src/quality-gates.ts:347-361`）。
- `implementation` 若队里已有 requirements，则必须「requirements 已 pass」或「依赖闭包内含该 requirements 任务」：`src/quality-gates.ts:467-482`。

### 5.2 路径与作用域的规范化规则（不可绕过）

- `normalizeWorkspacePath()`：拒绝空串、`~` 前缀、Windows 盘符、绝对路径（`/` 开头）、任何 `..` 片段；反斜杠统一转 `/`：`src/quality-gates.ts:259-273`。
- `pathMatchesScope()`：模式本身若为绝对/带盘符/`~` 直接不匹配；目录模式（以 `/` 结尾或 `.`/`./`）按前缀匹配，否则精确匹配：`src/quality-gates.ts:275-291`。
- **默认排除路径**（任何质量合同都不能主张）：`.git`、`.dsh`、`.agent-teams` 为首段；`.env` / `.env.*`；任一段含 `secrets`；文件名以 `id_rsa` 开头：`src/quality-gates.ts:299-309`。
- `classifyChangedPath()` 判定顺序：非法 → 默认排除判 **out_of_scope** → outOfScope → inScope → 否则 **undeclared**：`src/quality-gates.ts:315-325`。

### 5.3 完成时的强校验（`evaluateQualityCompletion`）

- `verify` 命令有失败项时**不得 completed**（必须 failed）：`src/quality-gates.ts:580-584`。
- 四类（implementation/repair/verification/integration）完成必须：`acceptanceResults` 覆盖全部 acceptance 且全 passed：`src/quality-gates.ts:586-589`；`commandsRun` 覆盖全部 verify 且全 passed：`590-592`。
- implementation/repair 还必须给 `changedPaths`，且**每一条路径都必须被判为 `in_scope`**（out_of_scope / undeclared / illegal 一律拒绝完成）：`src/quality-gates.ts:593-602`。
- 覆盖判定的宽松点：允许「同长度且全 passed」的结构化报告匹配（容忍措辞差异），但命令证据仍独立要求：`src/quality-gates.ts:528-544`。
- 终态不可变、状态迁移受限：`src/tools.ts:1986-1991`。

### 5.4 写入作用域审计（workspace-audit）

- 单一审计入口 `auditTeamWorkspace()`：读「所有被记录的 artifact 路径」+「verdict 绑定的作用域模式当前内容」，把枚举缺口与被判定为不可读的路径都汇总为 `gaps`：`src/workspace-audit.ts:31-53`（不可读路径按 gap 记录：`44-48`）。
- 设计意图：`status` 工具、活动面板路由与任何 Web API 必须读**同一份当前字节**，否则会出现「面板仍显示绿色的 pass」：`src/workspace-audit.ts:1-15`。

### 5.5 不可绕过的交付约束（`canDeclareDelivery`）

- blocker 全集：staged 未批准、halted、**escalated**、无已完成工作、`work` 类未 completed/cancelled、全部被取消、质量类未完成、completed 却无 pass、failed 却没有 follow-up repair、已完成实现无 pass review、实现任务存在**未审计路径**、verdict 与当前字节不符：`src/quality-gates.ts:1624-1684`。
- **审计不完整即阻塞**：只要审计存在 gap（超枚举上限 / 不可读），且存在质量任务或已有 blocker 或已有 artifact 读取，就判 blocker —— 「不完整审计不是证据」：`src/quality-gates.ts:1675-1682`。
- 未解决门（failed 且无 follow-up）会被点名：`src/quality-gates.ts:1618-1622`。
- 工作单过期（`contractStaleness` / `workOrderWarnings`）会作为 warning 进入交付结果，并作为派发前置警告：`src/quality-gates.ts:1545-1595`、`1618-1684`、`src/scheduler.ts:441-448`。
- 默认质量交付图与「必须是 requirements→implementation→verification→review→integration」的规划指引（含不得把冒烟脚本写进任务、不得要求审查者故意 needs_revision）：`src/quality-gates.ts:1938-2001`、`2003-2015`。

---

## 6. 成员与配置

### 6.1 插件配置面（`Config`）

- 字段：`stateDir`、`memberProvider`、`memberModel`、`memberLlmProvider`、`executionPrompt`、`fallback`、`memberMaxDepth`、`maxMembers`、`profiles`、`toolPolicies`、`promptSectionOrder`、`slashCommand`：`src/index.ts:60-112`。
- 默认值：`stateDir='.agent-teams'`、`memberProvider='spawn'`、`memberMaxDepth=0`（**默认禁止成员再委派**）、`maxMembers=8`、`promptSectionOrder=117`、`slashCommand=true`：`src/index.ts:132-176`。
- profile 支持 `taskPlanning: 'captain' | 'seed'`、`reviewPolicy`、`members[]`（含 `tool_policy`）、`tasks[]`：`src/index.ts:139-170`。
- 挂载时一次性校验 toolPolicies（配置错误在挂载期就失败）：`src/index.ts:205-207`、`src/tool-policies.ts:124-135`。

### 6.2 成员路由（provider / model / reasoning_effort）

- 纯合成函数：优先级 **显式请求 > 插件配置 > captain 会话路由**；模型 id 原样使用（`/` 不是 provider 分隔符）；`derivedProvider` 仅在「仅配置了 model、provider 未定」时为真：`src/members.ts:113-136`。
- 解析（带 I/O 校验）：显式 provider 必须配显式 model，否则报错：`src/members.ts:493-497`；captain 当前路由取自会话请求头：`499-504`；`composeMemberRoute` 失败即报错：`508-516`。
- 只有「裸配置 memberModel」才允许从 provider 目录找归属；命名过的 provider 是权威，不会静默切换；0 个或多个归属者都硬报错并列出目录（issue #189）：`src/members.ts:517-558`、`568-589`。
- **reasoning_effort 继承规则**：省略时仅「同一 provider+model」才继承 captain 档位，路由变化则用目标默认；显式值优先；`"default"` 强制目标默认档：`src/members.ts:525-537`。参数说明见 `src/tools.ts:1295`。
- 最终路由经宿主 `ctx.llm.resolveCallConfig` 归一化后落库（provider/model/reasoningEffort/fallback）：`src/members.ts:538-557`；持久字段 `TeamMember.provider/model/reasoningEffort/fallback/active*`：`src/types.ts:269-283`。

### 6.3 成员创建（spawn）

- 能力前置校验（provider 已注册、支持 continuable、支持 persona、支持 toolFilter）：`src/members.ts:881-899`。
- 调用宿主 `ctx.subagents.startContinuable({ provider, label, request: { prompt, parent, persona, toolFilter, agentOptions } })`：`src/members.ts:903-941`；成功后写 `member.id = start.childId`：`src/members.ts:942`。
- 成员 persona 文本（含团队目标、profile protocol、执行指引、10 条工作规则）：`src/members.ts:797-831`；首轮欢迎语：`src/members.ts:839-844`。
- 冷启动/成员失败恢复：只对“本进程未观察到的”开放 attempt 做一次自动恢复（见第 4 节）。
- 已退役成员护栏（记录在 `retired-members.json`，禁止再被唤醒）：`src/members.ts:1012-1017`、`src/state.ts:56`、`src/state.ts:307-347`。

### 6.4 成员委派深度护栏

- `installMemberDelegationGuard()` 劫持 `ctx.subagents.start` / `startContinuable`，沿父链判断是否处于 AgentTeams 成员内，超出 `maxDepth` 即抛错，并要求成员未被移除/未停止、团队未 halt：`src/members.ts:1020-1069`（关键 `1041-1044`）；默认 `memberMaxDepth=0`：`src/index.ts:172`。
- 成员无 policy 时，交给 spawn 的默认过滤器是「captain-only 工具 + 深度条目（`subagent`、`send_message`）」：`src/tool-policies.ts:31`、`42`、`src/members.ts:901-903`。

### 6.5 profile（captain / seed）

- `TeamProfileConfig.taskPlanning`：`captain` = profile 只给人与护栏、DAG 由 captain 运行时推；`seed` = 保留固定模板任务流：`src/profiles.ts:64-69`；解析默认 `seed`：`src/profiles.ts:233-235`。
- 上限：最多 16 个 profile：`src/profiles.ts:15`、`126-149`；单 profile 最多 32 个种子任务：`src/profiles.ts:17`；protocol 进提示词截断 240 字符：`src/profiles.ts:19`、`241-248`。
- profile 快照冻结进团队（name/description/protocol/executionPrompt/fallback/taskPlanning/reviewPolicy）：`src/types.ts:341-351`。
- 提示词侧列出已配置 profile：`src/profiles.ts:156-166`；激活文本里解析 `--profile` / `profile=`：`src/profiles.ts:177`。

### 6.6 owner 声明的 tool_policy 机制（成员工具可见性的合法调节口）

设计契约（文件头注释）：owner 在 `toolPolicies` 声明可复用策略，成员只能**按 id 选择**；captain 模型**永远不能提交原始 allow/deny 列表**或在运行时发明策略：`src/tool-policies.ts:5-8`。

四条不变式：① captain-only 拒绝清单始终生效且不可被策略抵消；② 四个成员协调工具始终可用、策略不得 deny；③ allow 型策略会自动补上这四个工具；④ 生效 deny = 策略 deny ∪ captain-only deny：`src/tool-policies.ts:16-24`。

- 校验：空策略、空 allow/deny、deny 了协调工具、命名保留传输 `run_code` 都会被拒：`src/tool-policies.ts:90-116`；`run_code` 保留名：`34`。
- 解析在挂载期完成，prototype-safe（`Object.create(null)`，不认 `__proto__`/`constructor`）：`src/tool-policies.ts:124-135`。
- 选择未知 id 报错并列出可用 id：`src/tool-policies.ts:181-194`。
- 生效过滤器 = `dedupe(policy.deny ∪ CAPTAIN_TOOL_NAMES ∪ 深度 deny)`；allow 型再补协调工具并与 deny 求交（被 deny 的名字不可能复活）：`src/tool-policies.ts:205-218`。
- 宽容重试只允许放宽**内置**条目，owner 声明的 deny 名永远不放宽；选了但已不存在的策略则«一个都不放宽»并直接失败：`src/tool-policies.ts:150-171`。
- 落地：成员记录持久 `toolPolicy` + 不可变 `toolFilter`：`src/types.ts:284-296`；spawn 时把 `toolFilter` 交给 `startContinuable`：`src/members.ts:903`、`911-936`、`946`。
- **它是不是唯一途径**：captain 协议原文写「it is the only way to change which global tools that member sees and may invoke, and you can never pass raw allow/deny lists」：`src/index.ts:182`；README/文件头同样陈述（`src/tool-policies.ts:1-14`）。另外还有一条**不受策略控制的**固定收窄：成员身份一旦识别，宿主层 `tools.restrict` 无条件 deny 掉 captain-only 工具：`src/capabilities.ts:93-95`。结论：**改变成员工具可见性的可配置途径只有 tool_policy**；除此之外只有插件内置的 captain-only 收窄与深度 deny。注意这是**工具可见性/调用策略**，不是 OS 沙箱（原文：`not an OS sandbox`）：`src/tool-policies.ts:14`。

---

## 7. 协作面与 Web UI

### 7.1 邮箱与消息

- 消息结构：`id/from/to/content/ts` + 投递租约 `deliveryClaimedAt`、`deliveredAt`、`readAt`、代际作用域 `taskId/attemptId`、来源 `sourceTaskId/sourceAttemptId/sourceTaskStatus`、作废 `discardedAt`：`src/types.ts:310-333`。
- 代际过滤：来源 attempt 已失效/来源状态不符则判为非当前邮件；`attemptId` 存在时要求目标任务的当前 attempt 匹配且任务处于 claimed/in_progress：`src/mailbox.ts:11-19`。
- 兜底读取同样强制当前代际，并丢弃过期邮件：`src/mailbox.ts:34-42`。
- 投递注入：宿主 `agent/pre-step` 钩子解析收据头，逐收件人批量读取+ack；只把真正被接收的邮件标记已读；若一步的**唯一触发**是过期邮件则 `reject`（不打断进行中的回合）：`src/mailbox.ts:63-174`（关键 `104-145`、`163-172`）。
- 冗余唤醒抑制：成员已通过 AgentTeams 汇报且任务 completed 时，宿主原生的 `subagent-settled` 唤醒被抑制：`src/mailbox.ts:71-103`、`146-159`。
- 文件名与目录：`inbox/*.jsonl`：`src/types.ts:5-6`；键名规范化（保留 CJK，超长加摘要，纯符号走摘要）：`src/state.ts:102-130`。

### 7.2 Web 路由（宿主 WebServer）

- 路由注册是**惰性 + 认证**的：WebServer / workspaceRegistry 缺失时插件退化为纯工具插件，不阻塞启动：`src/index.ts:243-254`、`526-532`。
- 认证包装：Connection 缺失一律 503，`requestRejection` 401/403，绝不裸暴露工作区状态或接受计划变更：`src/web-routes.ts:70-97`。
- 请求体护栏：上限 1,000,000 字节（超限 413），非法 JSON 400，非对象 400：`src/web-routes.ts:22-68`。
- 路由清单：
  - `GET /plugins/dsh-agent-teams/state`（`?archived=1` 取归档）活动面板数据；面板与 `agent_teams_status` 审计同一份当前字节：`src/index.ts:260-283`。
  - `POST /plugins/dsh-agent-teams/halt` 人类叫停：`src/index.ts:285-338`。
  - `POST /plugins/dsh-agent-teams/plan` 计划审阅/编辑/批准：动作 `approve` / `continue` / `discard` / `update_member` / `update_task` / `add_task` / `remove_task`：`src/index.ts:340-476`（approve `380-397`，并把结果以 steer 控制消息回灌模型 `385-394`；continue `399-404`；discard `405-409`）。
  - `GET /plugins/dsh-agent-teams/assets/*` 鲸鱼立绘，显式白名单防目录穿越：`src/index.ts:478-523`。

### 7.3 对话卡片（AgentTeamsCard）

- 客户端插件注入服务：`uiConversation/slots/sessions/locale/modelDirectories/layout`：`src/client/index.tsx:40`。
- 注册面：locale 字典 `61-64`；右侧栏 tab（`TEAM_TAB_ID` / `TEAM_TAB_KIND`）+ 会话头部入口 + 回合尾部摘要 + 右侧面板 tab：`88-112`；`shell.overlay` 活动浮层：`114-120`；命令回放视图：`125-128`；对话节点卡片 `agent-teams`：`130-138`。
- 卡片内容：队长头像+队名+成员数、成员可点击（打开成员的 durable transcript）、打开活动面板按钮；`agent-teams:open-panel` 窗口事件让卡片重新唤起浮层（含历史会话复盘）：`src/client/AgentTeamsCard.tsx:1-11`、`26`、`43-52`、`58-127`。
- 成员跳转：`openAgentTeamMember()` 兼容 rc.8 的 addressed subagent 导航（先刷新父会话目录再按 parent/child/mode 打开），旧运行时装退到 `open()`，新布局同时选中 Conversation 面板：`src/client/session-navigation.ts:46-73`；会话归属兼容（`retainedBy.mainView`）：`19-25`。

### 7.4 计划审阅与批准（StagingPlanEditor）

- 端点常量：`PLAN_URL = '/plugins/dsh-agent-teams/plan'`：`src/client/StagingPlanEditor.tsx:16`；`mutatePlan` 走 fetch：`43`。
- 编辑动作：`update_member:411`、`update_task:524`、`remove_task:546`、`add_task:655`。
- 主组件 `StagingPlanEditor`：`src/client/StagingPlanEditor.tsx:611-719`；成员/任务折叠区、依赖计数、`runnable` 判定（成员>0 且任务>0）：`622-631`、`721-749`；`approve:669-682`、`continueInChat:684-702`、`discard:704-719`。
- 阶段语义：`staged` 期间**不 spawn、不调度**：`src/types.ts:375-384`、`src/tools.ts:1257`；`awaiting_feedback` 表示用户回到聊天、captain 需先问清要改什么：`src/types.ts:376-382`。

### 7.5 活动监控（ActivityPanel / WorkspaceActivity）

- 面板主组件与团队分区：`ActivityPanel:807`、`TeamSection:491`、`historicCardTeam:774`（历史卡片兜底）：`src/client/ActivityPanel.tsx`。
- 右侧工作区面板：tab 常量 `src/client/WorkspaceActivity.tsx:13-14`；有 sidebar 集成时走 `WorkspaceMonitor`（自动发现团队并开 tab）：`27-33`、`35-77`；主视图含「当前/历史」切换、连接错误重试、空态与返回聊天：`85-130`。
- 轮询：`ACTIVITY_POLL_MS = 1000`、`ACTIVITY_PROBE_MS = 5000`、`ACTIVITY_STATE_URL`、`ACTIVITY_HALT_URL`：`src/client/activity-monitor.ts:184-194`；`startActivityPolling:245`，归档快照抓取 `315-323`。
- 面板数据模型：成员行（含 activity/progress/done/total/currentTask/unread）、任务行（含 `verdictStale` 不得渲染成裸 pass 徽章）、消息预览：`src/snapshot.ts:24-91`；组装 `assembleTeamSnapshot:132-159`；活动/归档收集 `244`、`283`。
- 面板与 `status` 共用同一 workspace 审计，避免「面板绿、模型红」不一致：`src/index.ts:265-271`、`src/workspace-audit.ts:1-15`。

### 7.6 激活入口（斜杠命令与手势）

- 命令名 `agent-teams`，闭合命名空间：`src/command.ts:8-9`；手势正则 `^/agent-teams(?=$|[\t\n\r ])`：`17`。
- 每个 profile 会生成 `agent-teams-<key>` 稳定别名，仅接受 `[a-z0-9-]` 且必须唯一映射：`src/command.ts:25-35`。
- profile 标志解析（`--profile` / `--profile=` / `profile=`，只吃前导标记）：`src/profiles.ts:168-181`。
- 激活指令文本（要求先 `status`、只在无队伍时以 `approval="required"` 建队、staged 后停下等审阅）：`src/command.ts:66+`。
- 也可整体关闭（只保留自然语言触发）：`src/index.ts:104-111`、`236-241`。

### 7.7 事件流

- 插件对外发布 `agent-teams/*` 事件：`team-created`、`member-added`、`member-removed`、`task-created`、`task-updated`、`task-amended`、`message-sent`、`team-halted`、`team-resumed`、`team-deleted`、`plan-discarded`：`src/event-types.ts:111-161`、`165-177`。

---

## 8. 与宿主通用 subagent/团队工具的边界

### 8.1 插件独有（宿主没有等价物）

- **持久成员**：成员是 continuable 子代理，其 durable 子会话 id 记在 `team.json`，团队可跨 harness 重启存活：`src/types.ts:1-8`、`src/types.ts:262-307`（`TeamMember.id` 注释：`263`）、`src/members.ts:867-947`。
- **共享任务板 + 依赖 DAG + attempt 能力票据**：`src/state.ts:139-142`、`182-227`；宿主原生团队工具族（`team_task_*`）只有 create/list/get/update，无 attempt/handoff 代际、无质量门（对照：`...\dsh-experimental-tool-agent-team\lib\index.js:367-512`）。
- **质量门体系**：七种种类的强合同校验、verdict=pass 语义、revisions ledger、自动 repair→下一轮 review、escalated 升级、交付门与 workspace 审计：`src/quality-gates.ts`（见第 5 节行号）、`src/workspace-audit.ts:31-53`。
- **Web 计划审阅/批准**：staged 两阶段 + `/plan` 路由三种人工动作 + StagingPlanEditor：`src/types.ts:371-384`、`src/index.ts:340-476`、`src/client/StagingPlanEditor.tsx:611-719`。
- **活动面板 + 会话导航 + 立绘**：`src/client/index.tsx:88-138`、`src/client/ActivityPanel.tsx:491/807`、`src/client/session-navigation.ts:46-73`、`src/index.ts:478-523`。
- **邮箱代际过滤与投递回执**：`src/mailbox.ts:11-19`、`63-174`。

### 8.2 复用宿主能力（不自己造）

- 子代理运行时：`ctx.subagents.getProvider` / `startContinuable` / `start`：`src/members.ts:884-941`。
- 工具注册表：`ctx.tools.register(defineTool(...))`：`src/tools.ts:923` 等 14 处。
- 系统提示段：`ctx.systemPrompt.section`：`src/capabilities.ts:101-106`。
- 命令注册表（惰性 inject，缺失也能工作）：`src/index.ts:236-241`、`src/command.ts`。
- Web 服务器与工作区注册表（惰性 + 事件绑定）：`src/index.ts:52-54`、`248-254`、`526-532`。
- Agent 生命周期/状态事件：`ctx.on('agent/status', ...)`：`src/scheduler.ts:547-551`；`agent/pre-step`（邮箱准入）：`src/mailbox.ts:64`；agent 就绪钩子：`src/capabilities.ts:107`（封装在 `src/harness-compat.ts:141`）。
- LLM 路由解析：`ctx.llm.resolveCallConfig` / `listProviders` / `listModels`：`src/members.ts:540`、`577-585`。
- 工具可见性收窄：`agent.ctx.tools.restrict`：`src/capabilities.ts:93-95`。
- 宿主多版本适配集中在 `src/harness-compat.ts`（`AGENT_TEAMS_PLUGIN_NAME:61`、`RELEASED_SOURCE_VOCABULARY_VERSION=3:70`、`observedSessionFormatVersion:94`、`restrictableToolNames:337`、`memberToolFilter:362`、`startMemberWithLenientFilter:403` 等）。

### 8.3 与宿主「原生团队」层的关系（重要）

- 宿主侧存在另一套团队实现：`@deepseek-ai/dsh-experimental-agent-team`（领域）+ `dsh-experimental-tool-agent-team`（工具）+ `dsh-experimental-client-ui-agent-team`（UI），由 `dsh-experimental-agent-team-profile` 一键挂载，且该层会**禁用旧全局 subagent 工具**：`...\dsh-experimental-agent-team-profile\cordis.patch.yml:4-33`。
- 本机 profile 的 bundle 列表里**同时**包含 `@deepseek-ai/dsh-experimental-agent-team-profile` 与 `@nanmicoder/dsh-agent-teams`：`C:\Users\cihu0\.dsh\profiles\web\package.json:19`、`:21`；而同一 profile 的 `cordis.patch.yml` 又重声明了 `tool-subagent*` 各行：`C:\Users\cihu0\.dsh\profiles\web\cordis.patch.yml:345-383`。
- 因此「两套团队能力是否同时在 captain 会话中可见」取决于 profile patch 的应用顺序与 disable/enable 语义。**未确认**：当前运行进程中 `team_task_*` / `spawn_teammate` 是否出现在 captain 工具目录里。此点对第 02 篇（skills 下发方案）影响较大，建议由 captain 会话用一次 `status`/工具目录dump 实测确认。

### 8.4 已知限制与风险点（源码可见）

- 质量门的性质：是**合同/证据层面**的约束，不是 OS 沙箱；`tool_policy` 也只管工具可见性：`src/tool-policies.ts:14`。
- 工作区审计不完整（枚举超 cap / 路径不可读）会**阻塞交付**（宁可不给结论）：`src/quality-gates.ts:1675-1682`。
- finding 只指向默认排除路径时，自动修复**不会**生成合同，直接 escalate 并留给人：`src/quality-gates.ts:974-982`。
- `implementation` 在有 requirements 的队伍里必须挂在 requirements 之后（依赖闭包或已 pass），否则建任务被拒：`src/quality-gates.ts:467-482`。
- 写类任务 inScope 重叠被禁止（强制串行/拆路径）：`src/quality-gates.ts:451-465`。
- 默认 `memberMaxDepth = 0`、`maxMembers = 8`：`src/index.ts:172-173`。
- 冷恢复只对「本进程未观察到的持久 attempt」开放一次，避免无限重试：`src/scheduler.ts:1-13`、`358-398`。
- 成员失败恢复细节集中在 `src/members.ts:219-465`（`classifyMemberFailure` / `failMemberOpenAttempt`），本文未逐行展开。
- 未确认项汇总：① 运行态是否可见宿主 `team_task_*`；② 宿主 `dsh-experimental-*` 各层在本 profile 的实际生效顺序；③ 插件在非 web（headless）profile 下的 UI 缺失行为（源码有降级路径，未实测）。

---

## 附：一页速查

- **14 个工具**：captain 10 + 成员 4（`src/tool-names.ts:2-14`）。
- **7 种种类的任务**：`work` 无门禁；6 个质量类需合同；写类（implementation/repair）额外需 inScope+verify（`src/quality-gates.ts:402-417`）。
- **成员四件套**：`claim_task` → `update_task`（带 attempt_id）→ `send_message(to=captain)` → `status`（`src/tool-names.ts:10-12`；成员 persona `src/members.ts:814-830`）。
- **两阶段**：`create(approval=required)` 建 staged → 人在 Web 编辑/批准 → 调度派发（`src/types.ts:371-384`、`src/index.ts:380-397`）。
- **失败自愈**：review/verification `needs_revision` → 自动 `repair-round-N` + `review-round-N`，pending 下游依赖被改线；触顶或 `reject` → `escalated`（`src/quality-gates.ts:930-1050`、`src/tools.ts:2752-2766`）。
- **交付**：`canDeclareDelivery` 全绿才可宣布；审计 gap 即 blocker（`src/quality-gates.ts:1624-1685`）。
