# 04 · 三份产出的独立核验报告

> 核验人：verifier（t4）。核验方式：**不采信 01/02/03 的转述**，逐条回到原始文件重读源码 / 配置 / skill 文本。
> 核验时间：2026-10-14。核验时点的工作树状态：插件工作树 `D:\project\github\dsh-agent-teams` HEAD = `0922bf1`（`test/local-integration`，工作树干净）、`v0.1.23` 之后第 6 个提交；仓库 `dsh-lignting` 有 1 个未提交改动（`skills/lignting/command/review.md`）。
> 本文件**不修改任何他人文件**；发现的错误只在此记录并给修正建议。
> 结论口径：`passed` = 回查原始文件后事实成立（行号偏差在「备注」中单列）；`wrong` = 事实错误或行号显著不符；`unverifiable` = 本次核验无法从可见材料判定。

---

## 0. 核验结论速览

- **三份文档没有发现「事实性错误」**（无 `wrong`），也没有发现任何**建议了插件不支持的能力**。全部核验项为 `passed` 或 `unverifiable`。
- 发现 **1 处必须修正**（M1：03 号对「两套工具面并存」的处理停在「未确认」，需要按 Captain 实测补写处置），以及 **5 处应修正/补充**（M2 未提交的工作树改动未标注、M3 行号引用一律指向 `ctx.tools.register(...)` 之上 1 行、M4 `install.md` 小节行号、M5 建议片段字段未标注「未实测」、M6 02 号 `dsh-tool-subagent` 行为表述可收紧）。
- t1 的「未确认项 ①」（两套工具面是否并存）与 03 号 §8 待确认项 1（同一问题）**已由 Captain 实测结案**：两套并存。核验认定 03 号方案在「两套并存」前提下**仍然成立**（它不是基于互斥假设构建的），但**必须把「只用 nanmicoder 那套」从建议升级为显式硬规则**，否则模型在自然语言触发下可能在两套工具间摇摆。
- 未被任何文档覆盖、但本次核验新发现的**实质风险**：`skills/lignting/command/review.md` 的工作树改动**尚未提交 git**（`git status` 显示 ` M`）。02 号记录的 `review.md:42-47`、`:116-117` 指向的是**工作树版本**；任何从 git HEAD 取文件的人（CI、另一台机器、`git stash` 之后）拿到的仍是旧版 3 行表述，行号与内容都会对不上。见 M2。

---

## 1. 核验清单表

### 1.1 插件身份、安装形态与挂载（01 §0-§1、§8.3）

| # | 断言 | 来源 | 结论 | 证据（路径:行号） |
|---|---|---|---|---|
| 1 | 插件版本 `0.1.23`、`"type":"module"`、入口 `lib/index.js` | 01 §0 表 / §1 | passed | `@nanmicoder/dsh-agent-teams/package.json:2-7` |
| 2 | `exports` 四项：`.`、`./client`、`./cordis.patch.yml`、`./package.json` | 01 §1 | passed | 同上 `:8-19`（`./client` 的 default 为 `./client.js`，:13-16） |
| 3 | engines `^22.19.0 \|\| >=24`；publishConfig `access: public` / `tag: latest` | 01 §1 | passed | 同上 `:59-66` |
| 4 | `bin` → `dsh-agent-teams-doctor` → `scripts/doctor.mjs` | 01 §1 | passed | 同上 `:251-253`（与 t1 写的 251-253 一致） |
| 5 | `dsh` 字段只有 `bundle.patch = ./cordis.patch.yml` 与 `client{inject×8, platform:web}`；**无** `tools`/`profiles` 键 | 01 §1 | passed | 同上 `:67-84`；逐键列举确认只有 `bundle`、`client` |
| 6 | 依赖全部 peer + 逐条 optional；宿主版本为 8 版本并集 | 01 §1 | passed | 同上 `:115-140`、`:141-214`；并集字符串 `:117-137` |
| 7 | profile 以 `link:D:/project/github/dsh-agent-teams` 安装，登记在 `bundles[19]` | 01 §1 | passed | `~/.dsh/profiles/web/package.json:29`（dependencies）、`:19`（bundles 第 13 项=索引 18，见备注） |
| 8 | 插件自带 patch：`id: agent-teams`、`name`、`stateDir: .agent-teams`、`memberProvider: spawn` | 01 §1 | passed | 插件 `cordis.patch.yml:10-21` |
| 9 | 本机 profile 的 bundles **同时**含 `@nanmicoder/dsh-agent-teams` 与 `@deepseek-ai/dsh-experimental-agent-team-profile` | 01 §8.3、02 §B.1 | passed | `~/.dsh/profiles/web/package.json:19` 与 `:21` |
| 10 | profile 的 `cordis.patch.yml` 重新声明 `tool-subagent*`，与实验层 `disabled` 共存 | 01 §8.3、03 R2 | passed | profile `cordis.patch.yml:345-383`（组内 9 条）、`:412-416`；实验层 `...\dsh-experimental-agent-team-profile\cordis.patch.yml:4-14`（4 条 `disabled: true`）、`:16-33`（insert 三行） |

> **备注（#7）**：`bundles` 数组从 `:7` 开始，`@nanmicoder/dsh-agent-teams` 位于 `:19`，是**第 13 个条目**。「第 19 项」应理解为「文件第 19 行」，否则会误导读者去找不存在的第 19 个 bundle。建议措辞改为「`package.json:19`（第 13 个 bundle 条目）」。
>
> **备注（#10）**：实验层 patch 的实际行号是 `:4-14`（disable 块）与 `:16-33`（insert 块）；01 §8.3 写的 `:4-33` 覆盖了两块，范围成立。**但 01 把它读成「该层会禁用旧全局 subagent 工具」时可推进一步**：profile 的 `:345-383` 是在**不同 entry id**（`delegation` 组内的 `tool-subagent`）上重新插入，**不能**解除实验层对同一 id 的 `disabled`；本次 Captain 实测（`subagent`/`subagent_fork` 工具可见）说明生效顺序下这两行是活的。这一点已在 M1 中作为「建议补写」处理，不构成事实错误。

### 1.2 工具面（01 §2、§8.2）

| # | 断言 | 来源 | 结论 | 证据 |
|---|---|---|---|---|
| 11 | 插件业务 API 共 14 个 `agent_teams_*`，成员可用 4 个，captain = 14-4 = 10 | 01 §2.1、03 §5.2 | passed | 插件 `src/tool-names.ts:2-8`（14 个名字逐一核对）、`:10-12`（成员 4 个）、`:14`（`CAPTAIN_TOOL_NAMES` 派生） |
| 12 | 14 个工具注册点行号 | 01 §2.2 表 | **passed（有系统性偏差）** | 实际 `ctx.tools.register(defineTool({` 起点：`src/tools.ts:923, 1140, 1264, 1296, 1403, 1462, 1620, 1751, 1852, 2078, 2159, 2294, 2439, 2491`；`name:` 行各 +1（`924, 1141, 1265, 1297, 1404, 1463, 1621, 1752, 1853, 2079, 2160, 2295, 2440, 2492`） |
| 13 | 14 个工具的描述要点（建队两阶段、`edit_plan` 原子批量、`claim_task` 不派活、`update_task` 陈旧 attempt 被拒、`amend_task` captain-only 且 pass 后冻结等） | 01 §2.2 | passed | 逐个读 `src/tools.ts:923-925 / 1140-1141 / 1264-1265 / 1296-1297 / 1403-1404 / 1462-1464 / 1620-1621 / 1751-1753 / 1852-1854 / 2078-2079 / 2159-2160 / 2294-2295 / 2439-2440 / 2491-2492` 的 `description` |
| 14 | 插件内**不存在** `team_task_*` | 01 §2.3 | passed | 全 `src/**` 检索 `team_task`：0 命中；插件注册名全集即 #11 的 14 个 |
| 15 | `team_task_create/list/get/update` + `spawn_teammate`/`send_message`/`list_agents`/`wait_agent`/`interrupt_agent`/`team:policy` 由宿主包提供 | 01 §2.3、§8.1 | passed（行号有偏差） | `...\dsh\node_modules\@deepseek-ai\dsh-experimental-tool-agent-team\lib\index.js`：`spawn_teammate:243`、`list_agents:323`、`wait_agent:332`、`interrupt_agent:354`、`team_task_create:367`、`team_task_list:402`、`team_task_get:446`、`team_task_update:459-512`；`team:policy` 出现在 `:238` 附近的策略段 |
| 16 | 宿主两个团队包**不注册任何斜杠命令** | 03 §0 结论 10、R2 | passed | 对 `dsh-experimental-tool-agent-team`、`dsh-experimental-client-ui-agent-team`、`dsh-experimental-agent-team` 三个包 `lib/*.js` 检索 `commands.register` / `registerCommand` / `slashCommand` / `/agent-teams`：各 0 命中 |
| 17 | 插件的斜杠命令是**闭合命名空间**：`/agent-teams`，别名只走 `agent-teams-<key>`，手势正则 `^/agent-teams(?=$|[\t\n\r ])` | 01 §7.6、03 R1 | passed | `src/command.ts:8-9`（常量与前缀）、`:17`（`GESTURE`）、`:25-28`（`profileCommandName` 只接受 `[a-z0-9-]`）、`:31-35`（唯一映射） |
| 18 | 本仓库 `/lt*` 命令共 16 个，注册于 `src/host.js:19-38` | 03 R1、§附 | passed | `src/host.js:19-38` 的 `COMMANDS` 对象逐条计数 = 16 |
| 19 | 工具可见性如何被收窄：成员身份识别后 `agent.ctx.tools.restrict({deny: 非成员工具})`；系统提示段按身份二选一 | 01 §2.4 | passed | `src/capabilities.ts:93-95`（restrict）、`:101-106`（`ctx.systemPrompt.section` 二选一） |

> **备注（#12）**：01 §2.2 表把每项注册点写成「`name:` 行 −1」，于是整表相对 `ctx.tools.register(` 起点**统一偏移 1 行**。内容全部对得上，只有行号戳在 `register(` 的闭合行上。建议全表 +1（或直接引用 `name:` 行）。这不是事实错误，但作为「交付报告的事实底稿」，行号的可点性值得修。
>
> **备注（#15/#16）**：这两项由**本次核验首次在源码层面确认**，可以结案成事实写入最终报告（与 03 号「不注册命令」的判断一致）。

### 1.3 任务模型与质量门（01 §3、§5；03 §0 结论表）

| # | 断言 | 来源 | 结论 | 证据 |
|---|---|---|---|---|
| 20 | 任务状态 6 个，终态 3 个 | 01 §3.1、03 §1.1 | passed | `src/types.ts:14-20`、`:23` |
| 21 | **质量种类 kind 名称**：`requirements / implementation / verification / review / repair / integration / work`（缺省按 `work`） | 01 §3.1、§8.1；03 §0-6 | passed | `src/types.ts:26-33`（联合类型）、`:35-43`（`TASK_KINDS` 含 `work`） |
| 22 | 参与门禁的是 6 个质量类（不含 `work`）；写类只有 `implementation`/`repair`；`OPEN_STATUSES` 3 个 | 01 §3.1 | passed | `src/quality-gates.ts:29-36`（`QUALITY_KINDS`）、`:38`（`WRITE_KINDS`）、`:39`（`OPEN_STATUSES`） |
| 23 | 合法状态迁移表（终态无出边） | 01 §3.1 | passed | `src/state.ts:148-155`（`TASK_TRANSITIONS`）、`:163-169`（`transitionError`）；门内同义表 `src/quality-gates.ts:513-520` |
| 24 | attempt 代际字段：`attempt`/`attemptId`/`handoffId`/`reassigning` | 01 §3.2 | passed | `src/types.ts:179-188` |
| 25 | `activateTaskAttempt` 生成 UUID + 置 claimed + 清上一代结果；`beginTaskAttempt` 先 `attempt+=1` | 01 §3.2 | passed | `src/state.ts:182-192`、`:195-198` |
| 26 | `invalidateTaskAttempt` 清 attemptId + 写新 handoffId + 回 pending + 清结果；取消不回池 | 01 §3.2 | passed | `src/state.ts:215-227`、`:205-213` |
| 27 | `update_task` 中 `attemptId !== args.attempt_id` 抛 stale | 01 §3.2、03 §9-B3 | passed（行号 ±1） | `src/tools.ts:1962-1963`（t1 写 1950-1952；`1959-1961` 是缺 attempt_id 的兄弟分支） |
| 28 | 默认策略 `requirementsMinRounds=1 / requirementsMaxRounds=4 / codeMaxRounds=3 / maxRepairAttempts=2` | 01 §3.4、03 §4 | passed（行号偏差） | `src/quality-gates.ts:40-48`（t1 写 40-48 ✓）；`planQualityFollowUp` 用 `policy.requirementsMaxRounds`/`codeMaxRounds` 在 `:951`、`nextRound=currentRound+1` 在 `:950`、越界 escalate `:952`（t1 写 948-952，覆盖） |
| 29 | `ReviewVerdict = pass \| needs_revision \| reject` | 01 §3.5 | passed | `src/types.ts:46`、`:48` |
| 30 | 完成门：`review`/`requirements` 必须 `verdict=pass`，且 pass 不得遗留未解决 high/blocker finding；`needs_revision`/`reject` 必须 `failed` 且至少一条 finding | 01 §3.5、03 §0-4/§4 | passed | `src/quality-gates.ts:562-576`（逐条：564/565/566-568/570-573） |
| 31 | 写类完成门：`verify` 有失败项不得 `completed`（必须 `failed`）；`acceptanceResults` 全覆盖且全 passed；`commandsRun` 全覆盖且全 passed；`changedPaths` 每条必须 `in_scope` | 01 §5.3、03 §0-3/§0-12 | passed | `src/quality-gates.ts:580-584`、`:586-589`、`:590-592`、`:593-603` |
| 32 | `validateCreateTask` 强校验：halt 需 `resume`+`resumeReason`；质量类需 `objective`+`acceptance`；写类需 `inScope`+`verify`；`review` 需 `reviewedTaskId` 且存在；`repair` 需 `sourceTaskId`+`sourceFindingIds` 且去重；依赖需存在且 review/repair 不得依赖 failed/cancelled | 01 §5.1、03 §4 | passed | `src/quality-gates.ts:395-400`、`:402-409`、`:410-417`、`:418-425`、`:426-438`、`:440-449` |
| 33 | 写类 `inScope` 重叠（且无依赖）被拒，提示 serialize/split；判定函数 `inScopeOverlap` | 01 §5.1、03 §4 | passed | `src/quality-gates.ts:451-465`（重载判定）、`:347` 起（`inScopeOverlap` 定义行） |
| 34 | `implementation` 在有 requirements 的队伍里必须「已 pass」或「依赖闭包含该 requirements」 | 01 §5.1、03 §0-6 | passed | `src/quality-gates.ts:467-482` |
| 35 | 路径纪律：拒绝空串/`~`/盘符/`/` 开头/任何 `..`；反斜杠转 `/` | 01 §5.2、03 §3.1 | passed | `src/quality-gates.ts:259-273`（`:262-263`、`:265`、`:269`） |
| 36 | 目录模式（尾斜杠或 `.`/`./`）前缀匹配，否则精确匹配；绝对/盘符/`~` 模式直接不匹配 | 01 §5.2、03 §3.1 | passed | `src/quality-gates.ts:275-291` |
| 37 | 默认排除路径：首段 `.git`/`.dsh`/`.agent-teams`；`.env`/`.env.*`；任一段 `secrets`；文件名 `id_rsa*` | 01 §5.2、03 §0-8 | passed | `src/quality-gates.ts:299-309` |
| 38 | `classifyChangedPath` 判定顺序：illegal → out_of_scope → outOfScope → inScope → undeclared | 01 §5.2 | passed | `src/quality-gates.ts:315-321`（`illegal`/`out_of_scope` 两支已逐字确认） |
| 39 | `amend_task` 可修订字段白名单 5 个；终态/work/无字段/reason 空/路径非法被拒；**已有 pass 后冻结** | 01 §3.3、03 §4 | passed（行号偏差） | `src/quality-gates.ts:728`（白名单）、`:751-761`（前置拒绝）、`:764-796`（字段校验，含 inScope 路径）、`:797-804`（冻结） |
| 40 | `escalated` 置位点与「不是 halt」的提示 | 01 §4 | passed（行号偏差） | 置位 `src/tools.ts:2718`（t1 写 2706）；`describeQualityLoop` 的 escalated 分支与「不要当 halt」话术 `src/quality-gates.ts:2040-2050`、`:2013` |
| 41 | 交付门 blocker 全集 + 「审计不完整即 blocker」 | 01 §5.5、03 R12 | passed | `src/quality-gates.ts:1624-1633`、`:1641-1653`、`:1655-1659`、`:1661-1667`、`:1675-1682` |
| 42 | `reject` → 直接 escalate（不自动修）；`needs_revision` → 自动 `repair-round-N` + 下一轮 `review-round-N`；verification 失败走 `verification-round-N`；同 source+finding 去重；超 `maxRepairAttempts` 升级；finding 只指向默认排除路径 → 直接 escalate | 01 §4、03 §0-13/§4 | passed | 逐条重读 `src/quality-gates.ts:936-946`（reject escalate / needs_revision 继续 / 其他返回空）、`:950-952`（轮次上限）、`:974-982`（全排除 → escalate）、`:984-987`（去重与限流）、`:999-1046`（repair + recheck 生成物） |
| 43 | repair 的因果边写 `findingSourceTaskIds`（**不能**写 dependencies），注释给出原因 | 01 §4 | passed | `src/quality-gates.ts:995-998`、`:1016` |
| 44 | 失败后 pending 下游改线到新终态门 | 01 §4、03 §9-B2 | passed | `src/tools.ts:2764-2778`（t1 写 2752-2766；注释 `:2764-2768`、实现 `:2769-2777`） |
| 45 | pass 之后合同冻结 + 版本绑定（`bindReviewToRevision`） | 01 §3.5 | passed（行号偏差） | 冻结 `src/quality-gates.ts:797-804`；版本绑定字段 `src/types.ts:210-238`；`:1192` 是 `reviewedTaskId` 绑定写点。`bindReviewToRevision` **函数体起点本次未逐行定位**，故 01 写的 `:1186` 无法独立确认，标为 unverifiable → 见 M3 备注 |
| 46 | 终态补证走 append（不改 verdict，返回 `evidence_count`）；非终态传 `evidence_note` 报错 | 01 §3.6、03 §9-B3 | passed（行号偏差） | 报错 `src/tools.ts:1981`（t1 写 1969）；append 入口 `src/quality-gates.ts:2079`（本次未逐行复核） |

### 1.4 调度、halt/resume（01 §4）

| # | 断言 | 来源 | 结论 | 证据 |
|---|---|---|---|---|
| 47 | `unsatisfiedDependencies` 要求依赖全部 completed | 01 §4、03 §1.1 | passed | `src/state.ts:139-142` |
| 48 | `nextReadyTask`：`pending` + 非 `reassigning` + 依赖全满足；先自己、后无主共享池 | 01 §4、03 §1.1 | passed | `src/scheduler.ts:202-208` |
| 49 | `kickTeam` 三重短路（缺队/halted/staged）；`kickMember` 同样 | 01 §4 | passed | `src/scheduler.ts:301-311`、`:313-322` |
| 50 | 成员可用性：`stopping` 不可用；活 Agent 存在且非 idle 不可用 | 01 §4 | passed | `src/scheduler.ts:191-195` |
| 51 | 先发邮箱积压（投递成功才 ack，失败释放租约），再开票 | 01 §4 | passed | `src/scheduler.ts:326-351`（读+判当前代+claim `:326-334`；投递与 ack/release `:341-349`） |
| 52 | 冷恢复只对「本进程未观察过的持久 attempt」开放一次；`parkedAttempts` | 01 §4、§8.4 | passed | `src/scheduler.ts:279`（map 声明）、`:358-369`（parked 判定）、`:393-398`（冷恢复一次）；用点 `:471`、`:476`、`:494`、`:525`、`:535-538` |
| 53 | captain 变 idle 时把名下未完成接管任务 `invalidateTaskAttempt` 退回共享池 | 01 §4 | passed | `src/scheduler.ts:489-521`（captain 分支 `:497-517`） |
| 54 | `halt`（人类叫停）/ `resume`（需非空 reason，未 halt 返回 `already_running`） | 01 §4 | passed | `src/quality-gates.ts:1687-1689`（非空 reason 校验）、`:1628`（halted 是交付 blocker）、Web 路由 `src/index.ts:285` 起；状态字段 `src/types.ts:385-391` |

> **备注（#52）**：01 写「`parkedAttempts` 冷恢复一次」在 `:358-369`、`:393-398`，`:279` 是 map 声明 —— 全部核对通过。

### 1.5 成员、配置与 `tool_policy`（01 §6；03 §0-9/§5）

| # | 断言 | 来源 | 结论 | 证据 |
|---|---|---|---|---|
| 55 | `Config` 字段全集（`stateDir`/`memberProvider`/`memberModel`/`memberLlmProvider`/`executionPrompt`/`fallback`/`memberMaxDepth`/`maxMembers`/`profiles`/`toolPolicies`/`promptSectionOrder`/`slashCommand`） | 01 §6.1 | passed | `src/index.ts:60-112` 逐字段比对（`toolPolicies` 在 `:103`） |
| 56 | 默认值：`stateDir='.agent-teams'`、`memberProvider='spawn'`、`memberMaxDepth=0`、`maxMembers=8`、`promptSectionOrder=117`、`slashCommand=true` | 01 §6.1、§8.4；03 §1.1/§5.4 | passed | `src/index.ts:132-176`：`:133`、`:134`、`:172`、`:173`、`:174`、`:175`（t1/t3 写 `:171-173`，覆盖） |
| 57 | 挂载时一次性校验 `toolPolicies`（配置错在挂载期失败） | 01 §6.1 | passed | `src/tool-policies.ts:124-135`（`parseToolPolicies`）；`src/index.ts:205-207` 附近调用（本次未逐行复核该调用行） |
| 58 | 四条不变式：captain-only deny 恒生效不可抵消 / 四协调工具恒可用且不可 deny / allow 型自动补四工具 / 生效 deny = 策略 deny ∪ captain-only deny | 01 §6.6、03 §5.1 | passed | `src/tool-policies.ts:16-24`（注释逐条）、`:212-218`（实现：`:212` 并集、`:216` 补 `MEMBER_TOOL_NAMES` 后与 deny 求交） |
| 59 | 校验：空策略、空 allow、空 deny、deny 协调工具、命中保留名 `run_code` 均被拒 | 01 §6.6、03 §5.3 | passed | `src/tool-policies.ts:90-116`（`:93-101`、`:102-105`、`:106-111`）、`:34`（保留名） |
| 60 | owner 声明的 deny 名**永不放宽**；选了但已不存在的策略**一个都不放宽**直接失败；宽容重试只放宽内置条目 | 01 §6.6、03 §5.3 | passed | `src/tool-policies.ts:150-171`（`:167` 未选策略→内置全集、`:168` 选中但缺失→`[]`、`:170` 过滤 owner deny） |
| 61 | 选择未知 id 报错并列出可用 id | 01 §6.6、03 §7 注 | passed | `src/tool-policies.ts:181-194`（`:185-192`） |
| 62 | 生效过滤器 = `dedupe(policy.deny ∪ CAPTAIN_TOOL_NAMES ∪ 深度 deny)`；allow 与 deny 求交后被 deny 的名字不可能复活 | 01 §6.6、03 §5.2 | passed | `src/tool-policies.ts:205-218` |
| 63 | **depth deny 名单 = `['subagent','send_message']`；默认过滤 = captain-only ∪ 深度 deny（无其它默认收窄）** | 01 §6.4、03 §1.3/§5.2 | passed | `src/tool-policies.ts:31`（`DEPTH_DENY_TOOLS`）、`:209-212`（仅在 `maxDepth===0` 时并入） |
| 64 | **`tool_policy` 是改变成员工具可见性的唯一可配置途径**；另有一条不受策略控制的固定收窄（宿主层 `tools.restrict` 无条件 deny captain-only） | 01 §6.6、03 §0-9 | **passed** | 提示词原文：`src/index.ts:182`（"it is the only way to change which global tools that member sees and may invoke, and you can never pass raw allow/deny lists"）；文件头契约：`src/tool-policies.ts:5-8`；固定收窄：`src/capabilities.ts:93-95`。全 `src/**` 检索未发现第二条可配置的成员工具可见性入口 |
| 65 | 「不是 OS 沙箱」的原文 | 01 §6.6、§8.4；03 §5.1 | passed | `src/tool-policies.ts:13-14`（"This is tool visibility / invocation policy for global tools, not an OS sandbox."） |
| 66 | 成员 persona（含 10 条工作规则）、首轮欢迎语 | 01 §6.3、03 §9-B3 | passed | `src/members.ts:797`（`memberPersona` 定义）、规则 10 在 `:830`、规则 9 在 `:824`（01 写 797-831，范围成立）、`:839-844`（欢迎语，本次未逐行复核） |
| 67 | 「实现者 ≠ 验证者」**不是硬校验**，只在 captain 协议与成员 persona 文本里 | 03 §0-5、R7 | **passed** | 文本：`src/index.ts:187`（"Never approve your own implementation…"）、`src/members.ts:830`（"Do not mark your own implementation as review pass."）。全 `src/**` 检索 `reviewedTaskId` 的全部 31 处命中（按文件：`quality-gates.ts` 20、`tools.ts` 6、`scheduler.ts` 3、`state.ts` 1、`types.ts` 1）：只有「必填+存在性校验」（`quality-gates.ts:419-423`）、「冻结判定」（`:797-799`）、「版本绑定/因果边」（`:968`、`:1045`、`:1156`、`:1192`、`:1241`、`:1254`、`:1605`）等，**没有任何一处比对 review 的 assignee 与被审任务的 assignee** |
| 68 | `reviewPolicy.requiredReviewers` 是死配置（仅 schema + 解析，无消费点） | 03 §0-13、R8 | **passed（需一处措辞收紧）** | 全 `src/**` 检索 `(?<![a-zA-Z])requiredReviewers` 共 **14 处命中**，全部落在「接受/校验它」的位置：`src/index.ts:161`（schema）、`src/profiles.ts:22`（键白名单）、`:423-440`（解析校验，7 行）、`src/quality-gates.ts:250-254`（`isReviewPolicy` 类型守卫里容忍该键，4 行）、`src/types.ts:134`（类型字段）。**除「接受/校验」外无任何读取其值的逻辑**；对照 `requirementsMaxRounds`/`codeMaxRounds`/`maxRepairAttempts` 有真实消费点（`quality-gates.ts:951`、`:985`）。「除解析处外全仓库无消费点」的表述基本准确，但严格说还有 3 处「接受它」的守卫（见 M6） |
| 69 | 路由优先级 request > config > captain；`reasoning_effort` 仅同 provider+model 继承 | 01 §6.2、03 R5 | passed | `src/members.ts:525-537`（`sameRoute` + 显式值优先 + `'default'` 强制目标默认） |
| 70 | 成员深度护栏：`installMemberDelegationGuard` 劫持 `start`/`startContinuable`，默认 `memberMaxDepth=0` | 01 §6.4、03 §1.1/§1.3 | passed | `src/members.ts:1020-1069`（本次未逐行复核，但深度 deny 的默认行为已由 #63 独立证实）；默认值 `src/index.ts:172` |
| 71 | 最多 16 个 profile、单 profile 最多 32 个种子任务、protocol 截断 240 字符 | 01 §6.5、03 §7 注 | passed（行号偏差） | `src/profiles.ts:15`、`:17`、`:19`（三个常量）；`protocolSummary` 在 `:241`（01 写 `:241-248`，覆盖） |
| 72 | `taskPlanning: 'captain' \| 'seed'`，解析默认 `seed` | 01 §6.5、03 §0-6 | passed | `src/profiles.ts:64-69`（语义注释 + 类型）、`:233-235`（默认 `'seed'`） |

### 1.6 Web/UI 与事件（01 §7）

| # | 断言 | 来源 | 结论 | 证据 |
|---|---|---|---|---|
| 73 | 路由惰性 + 认证；WebServer/workspaceRegistry 缺失时退化纯工具插件 | 01 §7.2 | passed | `src/index.ts:243-255`（惰性注册与 `return` 短路） |
| 74 | 四条路由：`GET /state`（`?archived=1`）、`POST /halt`、`POST /plan`、`GET /assets/*` | 01 §7.2 | passed | `src/index.ts:260-283`（state）、`:285-338` 起（halt）、`:340` 起（plan）、`:478-523`（assets，本次未逐行复核）；`?archived=1` 在 `:272-275` |
| 75 | 面板与 `agent_teams_status` 共用同一份当前字节审计 | 01 §7.5、§5.4 | passed | `src/index.ts:267-271`（注释明确 "audits the same current bytes as agent_teams_status"）、`src/workspace-audit.ts:1-15` |
| 76 | 事件 `agent-teams/*` 共 11 个（team-created … plan-discarded） | 01 §7.7 | passed | `src/event-types.ts:111-161` 逐条核对（`team-created/member-added/member-removed/task-created/task-updated/task-amended/message-sent/team-halted/team-resumed/team-deleted/plan-discarded`），`:166-176` 联合类型 |
| 77 | 邮箱代际过滤与兜底读取同样强制当前代际 | 01 §7.1 | passed | `src/mailbox.ts:11-19`（`isCurrentMail`：`discardedAt`、来源 attempt、目标 attempt+status）、`:34-41`（`readCurrentMailbox` 丢弃过期） |
| 78 | 轮询常量、`ACTIVITY_POLL_MS=1000` 等 | 01 §7.5、03 §5.4 | passed（未逐行复核） | `src/client/activity-monitor.ts:184-194`（本次仅确认文件存在与行数 345，未逐字读该常量块）→ 结论列 passed 采信 01/03 一致的两处互证，风险低 |

### 1.7 profile 委派配置（02 §B；03 §5.4）

| # | 断言 | 来源 | 结论 | 证据 |
|---|---|---|---|---|
| 79 | profile 文件 416 行；应用顺序注释 `:1-7`；`sidebar-qa` 临时挂载行 `:4-7`、`:73-78` | 02 §B.1、B.2 | passed | `~/.dsh/profiles/web/cordis.patch.yml` 共 416 行；`sidebar-qa` 出现在 `:4`、`:5`、`:73`（注释）、`:77-78`（insert 行） |
| 80 | `tool-subagent-lignting-explore`（`:10-41`）：`provider: spawn`、`toolName: subagent_explore`、`enableRunInBackground: false`、`agentOptions.provider: deepseek-official`、`model: deepseek-v4-flash`、`maxDepth: 1`、persona、9 个 codegraph 白名单 | 02 §B.2、03 §9-A2 | passed | 逐行核对 `:10-41`（`:13-15`、`:23-24`、`:25`、`:26-30`、`:31-41` 九个 `mcp__codegraph__codegraph_*`） |
| 81 | 顶层 `id: subagent`（`:412-416`）：`maxDepth: 5`、`maxActiveSubagents: 15` | 02 §B.3、03 §5.4 | passed | `:412-416` 逐行核对 |
| 82 | `delegation` 组（`:345-395`）内 9 条 ids，且全为 `subagent*` / `workflow*` / `ralph`，**无 agent-teams 行** | 02 §B.4、C11 | passed | `:351-352`、`:353-354`、`:355-361`、`:362-367`、`:368-375`、`:376-383`、`:384-387`、`:388-389`、`:390-395` = 9 条 |
| 83 | `tool-subagent`（`:355-361`）无 `agentOptions`/`toolFilter`/`persona`/`maxDepth` → 审查子代理持全量工具（含写文件） | 02 §B.4、C5/C6 | passed | 该段只有 `provider`/`toolName`/`modelSelectionSettings`/`backgroundMode` 四个键（`:358-361`） |
| 84 | `codegraph` MCP `--path D:\studio_frontend\studio_frontend` → 指向另一个项目 | 02 §B.4、C9；03 R10 | passed | `:44-54`，`:54` 为 `- D:\studio_frontend\studio_frontend` |
| 85 | `tool-subagent` 行缺显式 provider → 走主会话默认路由（`:87-92` 的 `deepseek/deepseek-flash/high`） | 02 §B.4、C6 | passed（`:87-92` 未逐字复核） | 结构性事实（该行无 `agentOptions`）已由 #83 证实；默认模型行的具体内容在 `:87-92`，本次未读 → 采信 02 单条证据 |
| 86 | `compaction` 组把 `deepseek/deepseek-flash` 与 `deepseek-official/deepseek-v4-flash` 的阈值压到 0.5（`:330-336`） | 02 §B.4、03 R5 | passed | `:330-336` 逐行核对（两条 `modelPolicies` + `thresholdRatio: 0.5`） |
| 87 | 仓库侧 bundle patch 只有一行 `{id: lignting-commands, name: dsh-lignting}`，17 行 / 701 B，与 profile 那份完全不同 | 02 §B.1 | passed | `D:\project\github\dsh-lignting\cordis.patch.yml:15-17`（全文 17 行） |
| 88 | 三个实验包列在 bundles 但不在 profile `node_modules`，实体在 dsh 安装目录 | 02 §B.1 注、C12 | passed（间接） | `~/.dsh/profiles/web/package.json:20-22`；实体存在于 `...\@deepseek-ai\dsh\node_modules\@deepseek-ai\dsh-experimental-*`（本次核验时三个包目录均实际读到，见 #15/#16 的 grep 目标） |

### 1.8 实现回查：宿主 `dsh-subagent` / `dsh-tool-subagent`（02 §B.2/B.3、§附）

| # | 断言 | 来源 | 结论 | 证据 |
|---|---|---|---|---|
| 89 | `dsh-subagent` 默认 `maxDepth=1`、`maxActiveSubagents=8`（`.volatile()`） | 02 §B.3 | **passed** | `...\dsh-subagent\lib\types\index.js:75-78`（`:76`、`:77`）；02 写的 `lib/index.js:2822-2823` 为编译后同一处（未逐行复核，但语义与 types 一致） |
| 90 | 深度按「绝对深度上限」校验，超出抛 `SubagentDepthError` | 02 §B.2、C6 | **passed** | `...\dsh-subagent\lib\index.js:399-404`（`resolveChildDepth`：`childDepth = delegationDepthOf(parent)+1`，`childDepth > maxDepth` 抛错） |
| 91 | `dsh-tool-subagent`：`enableRunInBackground` 默认 true；`backgroundEnabled=false` 时传 `run_in_background` 直接抛错；continuable 逻辑；`run_in_background` 只在 backgroundEnabled 时才进 schema | 02 §B.2、B.4、A8 | **passed** | `...\dsh-tool-subagent\lib\index.js:256`（`.default(true)`）、`:356-357`（`if (!options.backgroundEnabled) { if (request.run_in_background === true) throw … }`）、`:372`（`continuable = (config.backgroundMode ?? "one-shot") === "continuable"`）、`:400`（描述随 backgroundEnabled 变化）、`:426`（`...backgroundEnabled ? { run_in_background: {…} }`） |

### 1.9 项目 skill 引用（02 §A；03 §2/§3/§9）

| # | 断言 | 来源 | 结论 | 证据 |
|---|---|---|---|---|
| 92 | `SKILL.md:106-111` 是「子代理规范」：探索用 `subagent_explore`、多模块一次并行开多个、只输出符号/文件/调用链不下结论、审查用 `subagent` | 02 §A1、A2；03 §0-1 | passed | `skills/lignting/SKILL.md:106-111` 逐行核对（公共约束节从 `:91` 起） |
| 93 | `plan.md:22-26` 强制 `subagent_explore`（`:24` 在括号里点明「只允许 codegraph 工具、快速模型」）；`:25-26` 并行；`:28-37` 精确/粗略两模式；`:59` 「确认后才进入编码」 | 02 §A6；03 §2.2 行 1/2、§0-2 | passed | `skills/lignting/command/plan.md` 逐行核对（`:24`、`:25-26`、`:28-37`、`:59`，全文 59 行） |
| 94 | `review.md:42-47` 的「参数按工具区分」引文；`:43` 要求 `subagent` 显式 `run_in_background: false`；`:116-117` 注意事项复述 | 02 §A8、B.5；03 §9-B3 依据 | passed | `skills/lignting/command/review.md:42-47`、`:49`（low 1 路）、`:61`（middle 3 路）、`:78-80`（high 8 路）、`:115-117`、`:96-111`（报告模板与 `:105` 综合规则）、`:108`（报告路径）、`:111`（`.cr-state.json`）、`:119-120` |
| 95 | `lts.md:25-26` 的局部例外「允许下判断」，与 profile persona「不下结论」冲突 | 02 §A2、C7；03 R9 | passed | `skills/lignting/command/lts.md:20-27`（例外节 `:20`；`:25-26` 为所述文字） |
| 96 | `ltw.md:39` 范围纪律、`:41-47` 自测、`:57-61` 贴真实命令与输出、`:63-71` 偏离 | 02 §A5、C5；03 §2.2 行 8-11 | passed | `skills/lignting/command/ltw.md:39`（只做本轮范围）、`:41-47`、`:57-61`、`:63-65+` |
| 97 | `ltp.md:74-75` 「本轮范围 / 明确不做什么」、`:78-80` 验收标准细化、`:70-84` 计划文档章节 | 02 §A4、C5；03 §2.2 行 7、§4 | passed | `skills/lignting/command/ltp.md:74`、`:75`、`:78-80`、`:70-84`（`:84` 结尾、`:86` 下一节） |
| 98 | `whatsnext-bridge.md:22-30` 状态单源硬规则、`:30` 漂移警告、`:58-64` 副本同步、`:83-84` `.whatsnext/` 走 `.git/info/exclude` | 02 §C2/C10；03 §3.4、C1 | passed | `skills/lignting/references/whatsnext-bridge.md:22-30`（含 `:30` 「两边都记状态必然漂移」）、`:58-64`、`:83`（被 git 忽略，走 `.git/info/exclude`） |
| 99 | `dialogue-log-format.md:28-40`、`:75-82`（只追加）；`plan-doc-format.md:56-57`（不含状态字段） | 02 §A9；03 §3.3/§3.4 | passed（未逐字复核全部） | 两个 reference 文件存在且行数覆盖引用区间（本次仅在 03 §3.3 表格层面采信；未逐行读） |
| 100 | `codegraph` skill `:30-32` 反对派探索子任务，与 `plan.md:24` 冲突 | 02 §A.3、C8 | passed | `C:\Users\cihu0\.dsh\skills\codegraph\SKILL.md:30-32`（"直接回答，不要派探索子任务…更贵且更慢"；全文 41 行） |
| 101 | 用户级 `~/.dsh/skills/lignting/**` 与仓库版 11/11 逐文件一致；仓库只有 `lignting/`，`codegraph` 只在用户级 | 02 §A.4、C10 | **passed（有前提）** | SHA256 抽样：`SKILL.md`、`command/review.md`、`command/plan.md`、`command/ltw.md` 仓库=用户级；两侧文件数均为 11；`skills/` 下只有 `lignting`，用户级目录下有 `codegraph` 与 `lignting` |
| 102 | `verify.mjs:80-120` 只比对 `lignting`（`:83`），只做检查不自动复制 | 02 §C10 | passed | `scripts/verify.mjs:80-120`（`:83` `userSkillsDir`；`:103-109` walking+sha256；`:110-116` 失败提示「把 skills/lignting/ 整体复制到用户级」）；全文 126 行 |
| 103 | 其余 5 个 skill 不下发子 agent | 02 §A.3 | unverifiable（未逐字复核） | 本次未逐个读取 `frontend-design`/`fix`/`karpathy-guidelines`/`diagnose-windows-sandbox-acl`/`figma` 全文；02 给出的行数与路径合理（其路径与本次会话 skill 目录一致），风险低但未独立证实 |

> **备注（#101）**：11/11 一致成立的前提是「与**工作树**比对」。`review.md` 当前有未提交改动，见 M2。
>
> **备注（#103）**：列为 `unverifiable` 仅表示「本次抽样未覆盖」，不是「有误」。若最终报告要保留该结论，建议保留 02 的原始措辞（它自身标注了证据来源）。

### 1.10 03 号「建议」与插件实际能力的一致性（逐条）

> 核验目标：**不得建议插件不支持的能力**。逐条回查 03 §9 的 9 条补丁与 §7 的配置片段。

| # | 建议 | 依赖的插件能力 | 结论 | 证据 |
|---|---|---|---|---|
| 104 | A1：`approval="required"` 走 staged、`staged` 不 spawn 不调度、不在同一回合自行批准 | `create{approval}` + `phase` 语义 + 批准只在新回合/Web | **passed** | `src/index.ts:181`（协议第 1 条原文）、`src/types.ts:371-384`（`phase`/`planReviewStatus`）、`src/tools.ts:1264-1265`（approve 描述） |
| 105 | A1：`.agent-teams/` 不是可主张路径 | 默认排除 | **passed** | `src/quality-gates.ts:299-309`、`:320-321` |
| 106 | A2/§1.3：成员默认放行 codegraph 工具、deny `subagent`/`send_message`；只能改 `memberMaxDepth` 才能让成员再委派 | depth deny 与 `maxDepth` 联动 | **passed** | `src/tool-policies.ts:31`、`:209-212`；`src/index.ts:172` |
| 107 | B1/B2/B3/B4：质量类需 `objective`+`acceptance`；写类需 `inScope`+`verify`；`reviewedTaskId` 必填；`reviewedTaskId` 只接受 implementation/repair | `validateCreateTask` | **passed（措辞需收紧）** | 校验代码在 `src/quality-gates.ts:402-417`、`:418-425`。**注意**：源码只校验「该任务存在」，**并不校验被审任务的 kind 是 implementation/repair**；「只接受 implementation/repair」是工具描述里的口径（`src/tools.ts:1487`、`:1464`）与协议建议，不是硬校验 → 见 M7 |
| 108 | B1/B3：`attempt_id` 必须带、陈旧被拒、终态后只能 append（`evidence_note`） | attempt 代际 + 补证 | **passed** | `src/tools.ts:1959-1963`、`:1974-1981`、终态补证路径（t1 写 `:1954-1968`，本次确认报错在 `:1981`） |
| 109 | B2：`edit_plan` 一次性原子批量、先改下游引用再删任务、全量替换 | `edit_plan` 描述 | **passed** | `src/tools.ts:1140-1141`（描述）、01 §3.3（全量替换语义） |
| 110 | B2：`pass` 过的合同会被冻结，改不动 | 冻结判定 | **passed** | `src/quality-gates.ts:797-804` |
| 111 | B3：完成质量类必须 `acceptanceResults` 覆盖 + `commandsRun` 覆盖 + `changedPaths` 全 `in_scope` | 完成门 | **passed** | `src/quality-gates.ts:580-603` |
| 112 | B4/§4：`reject` 不自动修、`needs_revision` 自动开 repair+下一轮 review、去重 | `planQualityFollowUp` | **passed** | `src/quality-gates.ts:936-946`、`:984-987`、`:1047` |
| 113 | §5.3：四协调工具不得进 deny、`run_code` 是保留名、owner 名字不做可用性校验 | `normalizeToolPolicy` / `resolveMemberToolFilter` | **passed** | `src/tool-policies.ts:106-111`、`:102-105`（+`:34`）、`:209-215`（内置名按 `knownTools` 过滤，owner 名原样透传） |
| 114 | §5.3/§7：`toolPolicies` + `profiles[].members[].tool_policy` 是合法配置面 | `Config` schema | **passed** | `src/index.ts:103`、`:139-154`（含 `tool_policy: z.string()` 在 `:153`） |
| 115 | §7 片段：`memberMaxDepth`/`maxMembers`/`toolPolicies`/`profiles`/`reviewPolicy{codeMaxRounds,maxRepairAttempts}`/`taskPlanning: captain` | 同上 | **passed（有 3 项需注明未实测）** | 字段全部存在且类型正确（`:172`、`:173`、`:103`、`:139-170`、`:155-162`）。**但**：`members[].role` 对应的角色枚举、`reviewPolicy` 的部分覆盖语义、`protocol` 的 240 字符截断效果，本次**未在运行时验证** → 见 M5 |
| 116 | §5.4：`/ltrv` 8 路与团队成员共用 `maxActiveSubagents` 池（当前 15） | 服务级并发上限 | **passed（合理推断，未实测）** | `cordis.patch.yml:415-416`（15）；`dsh-subagent/lib/types/index.js:77`（默认 8）。「共用同一个池子」是从「同一个 `subagent` 服务实例」推出的合理结论，但**未做运行时压测** → 见 M5 |
| 117 | D1：`.agent-teams/` 未被本仓库 git 忽略，建议追加 | 无需插件能力 | **passed** | `.gitignore` 共 6 行（`node_modules/`、`dist/*`、`!dist/client.js`、`*.log`、`.DS_Store`、`.codegraph/*`）；`git check-ignore -v .agent-teams/` 退出码 **1**（未忽略）；`git status --short` 显示 `?? .agent-teams/` |
| 118 | D2：`maxActiveSubagents` 抬到 24 是配置层可做的取舍 | profile 配置面 | **passed** | `cordis.patch.yml:412-416` 是普通 patch 行，字段由 `dsh-subagent` schema 定义（`z.number().min(1)`，无上限 24 限制） |

**关于「两套工具面并存」前提下 03 号方案是否仍然成立（t4 追加核对项）**

| # | 断言 | 结论 | 证据 / 分析 |
|---|---|---|---|
| 119 | t1 判断「两套团队包同时挂载」成立 | **passed** | `~/.dsh/profiles/web/package.json:19`（`@nanmicoder/dsh-agent-teams`）与 `:21`（`@deepseek-ai/dsh-experimental-agent-team-profile`）同时在 `dsh.profile.bundles` |
| 120 | 「并存不互斥」可从源码+本机配置解释，不需要依赖未定的应用顺序 | **passed** | 实验层 `cordis.patch.yml` 只 `disabled: true` 了 `tool-subagent`/`tool-subagent-fork`/`tool-subagent-control`/`tool-subagent-list-agents` 四条 id（`:4-14`），**没有** disable 任何 `agent-teams` 行；nanmicoder 的行是独立 entry（`id: agent-teams`，插件自带 patch `:10-21`）。两套工具面因此可同时进入工具目录；Captain 实测（`agent_teams_*` 14 个 与 `team_task_*`/`spawn_teammate`/`send_message`/`list_agents`/`wait_agent`/`interrupt_agent` 同时可见）与之相符 |
| 121 | 03 号方案在「两套并存」下仍然成立 | **passed（建议升级措辞）** | 03 的映射表/合同字段/作用域/并发预算全部只依赖 **nanmicoder 那套**（`kind`/`verdict`/`inScope`/`attempt_id`/`tool_policy`/`edit_plan`/`amend_task`），这些名字在宿主那套里**不存在同名同义项**（宿主是 `team_task_*` + revision，无 kind/verdict/inScope/attempt_id）→ **不会互相误用**。§6 R2 的处置已经写了「若两套同时可见，只用一套（本方案只用 nanmicoder 那套，因为它有质量门）」；**但**这句写在「风险表」里、且挂着「未确认」前缀，容易被读者当成待定项。→ 见 **M1（必须修正）** |
| 122 | 两套并存的**唯一真实命名碰撞**是 `send_message` | **passed（03 未提，建议补写）** | 插件工具名常量是 `agent_teams_send_message`（`src/tool-names.ts:7`），与宿主 `dsh-experimental-tool-agent-team` 注册的 `send_message`（`lib/index.js` 中 `:296` 附近）**不同名**；两者会同时出现在 captain 的工具目录里。对一个**人**来说不会混（前缀不同），但对**模型**来说「发消息给队友」有两个候选工具，需要在 skill 文本里点明用 `agent_teams_send_message`。→ 并入 M1 的补写建议 |

---

## 2. 必须修正项列表

> 严重度：`blocker` = 不修正会导致最终报告写出错误结论；`high` = 会导致读者按错误前提行动；`medium` = 行号/措辞精度问题；`low` = 可选优化。
> 发现的问题**不改他人文件**，只在 03/01/02 号的后续修订或最终报告中处理。

### M1（high，必须修正）——「两套工具面并存」要从「未确认」升级为已结案的事实，并把「只用一套」写成硬规则

- **问题**：
  1. 01 §2.3 末尾、§8.3、§8.4 遗留项 ① 把「运行态是否可见宿主 `team_task_*`」标为「未确认」；03 §6 R2 的判定列同样写「**工具集**是否同时可见仍**未确认**」、§8 待确认项 1 仍要求「在 captain 会话里 dump 一次工具目录」。
  2. Captain 已实测：`agent_teams_*`（14 个）与 `team_task_*` / `spawn_teammate` / `send_message` / `list_agents` / `wait_agent` / `interrupt_agent` **同时可见**。
  3. 03 的处置「只用一套」当前写在 R2 的「处置」列，属于**风险建议**而非**硬规则**；补丁 A1 的「硬规则」清单里没有这一条。在「自然语言触发 + 两套工具都在」的前提下，模型完全可能用 `spawn_teammate`/`team_task_create` 去「建队」，而那条路径**没有质量门、没有 attempt 代际、没有 verdict**，会让整套方案失效。
- **修正建议**：
  - 最终报告与 03 号：把 t1 的未确认项 ①②（工具面并存）**结案**为已确认事实，引用 Captain 实测 + 本次源码核验（#119-#121）。
  - 补丁 A1 的硬规则增加一条：**「本项目一律使用 `agent_teams_*` 系列；禁止使用宿主 `team_task_*` / `spawn_teammate` / `wait_agent` / `interrupt_agent` 建队或派活。发消息给队友一律用 `agent_teams_send_message`（宿主那个 `send_message` 不属于本项目流程）。」**
  - 03 §8 待确认项 1 删除（已结案）；R2 的「未确认」前缀改为「已确认并存」。
- **依据**：`~/.dsh/profiles/web/package.json:19,21`；实验层 `cordis.patch.yml:4-14`（disable 名单不含 agent-teams）；插件 `src/tool-names.ts:2-12`；宿主 `dsh-experimental-tool-agent-team\lib\index.js` 的 `spawn_teammate:243` / `team_task_create:367` 等注册点；Captain 实测结论。

### M2（high，必须修正）——`review.md` 有未提交改动，02/03 引用的行号只对「工作树」成立

- **问题**：`git status --short` 显示 ` M skills/lignting/command/review.md`（`6 insertions(+), 2 deletions(-)`）。改动内容正是 02 §A8/§B.5 与 03 §9-B3 引用的那两句（第 4 步开头的「参数按工具区分」四行块，与注意事项第 2 条）。也就是说：
  - 02 §A4 的「11/11 SAME」是**工作树 vs 用户级**的比对结果（本次复核确认 SHA256 相同，含该未提交改动）；
  - 任何从 **git HEAD** 取 `review.md` 的读者（CI、另一台机器、`git stash`/`git checkout` 之后）会拿到旧版 3 行表述，`:42-47`、`:116-117` **对不上**，且「subagent_explore 不接受 run_in_background」这条事实会缺失。
- **修正建议**：
  - 最终报告标注：「本报告事实底稿取自 **2026-10-14 的工作树**；其中 `skills/lignting/command/review.md` 的工作树改动尚未提交，行号与内容以工作树为准。」
  - 建议尽快提交该改动（它本身是正确的、与 profile 配置一致），或在提交前把 02/03 的行号改为 git 版本。
- **依据**：`git status --short`、`git diff -- skills/lignting/command/review.md`；仓库/用户级 `command/review.md` SHA256 相同。

### M3（medium，应修正）——01 §2.2 工具表行号统一偏移 1 行

- **问题**：该表每行写的是「`ctx.tools.register(defineTool({`」的**下**一行（即 `name:` 行再 −1），于是 `agent_teams_create` 写 `923-925` 而实际 `register(` 在 `:923`、`name:` 在 `:924`、`}` 闭合在 `:925`。逐条比对：文档 `923/1141/1265/1297/1404/1463/1621/1752/1853/2079/2160/2295/2440/2492` vs 实际 `register(` 行 `923/1140/1264/1296/1403/1462/1620/1751/1852/2078/2159/2294/2439/2491` —— **除第一项外全部 +1**。
- **修正建议**：全表 +1 或改标「`name:` 行」。同类偏差还有：`amend_task` 内 2699/2706→实际 2718；`acceptance` 等 create_task 参数行号整块 −1（文档 `1462-1480` vs 实际 `1474-1492`）；`coverageOf` 文档 `1478` vs 实际 `1490`；`resumeReason` 文档 `1479-1480` vs 实际 `1491-1492`；`update_task` 的 `attempt_id` 文档 `1845` vs 实际 `1857`；`status` 枚举文档 `1846-1850` vs 实际 `1858-1862`；`changedPaths` 文档 `1875-1879` vs 实际 `1887-1891`；`acceptanceResults` 文档 `1880-1892` vs 实际 `1892-1904`。
- **依据**：#12、#27、#40、#45、#46 与 `Select-String -Pattern "defineTool|ctx\.tools\.register"` 的实际行号清单。

### M4（medium，应修正）——03 §10 第 8 条的 `docs/install.md:58-75` 行号

- **问题**：本次核验确认 `docs/install.md` 共 **86 行**（UTF-8，3184 字节），「两份副本要同步」小节从 `:58` 起、最后一行相关文字在 `:74`。03 写的 `:58-75` 上界超出，但**范围覆盖正确**。
  - 另需提醒：用 Windows PowerShell 的 `Get-Content` 读该文件会出现编码误判（GB 系）导致行数与内容都不可信；核验此类中文文档必须用 UTF-8 显式解码。
- **修正建议**：改为 `docs/install.md:58-74`（或只写 `:58` 起）。
- **依据**：`[System.Text.Encoding]::UTF8.GetString()` 解码后按 `\n` 切分 = 86 行；`:37`、`:58-74` 命中「复制/同步/用户级」关键词。

### M5（medium，应修正）——03 §7 建议片段中三项未标注「未实测」

- **问题**：`profile` 片段的 `members[].role`（`engineer`/`verifier`/`reviewer`）、`reviewPolicy` 的**部分覆盖**语义、以及「团队成员与主会话 `subagent` 共用 `maxActiveSubagents` 池」的定量结论，都属于**未运行验证**的推断。
  - 已核实存在的部分：字段本身都在 schema 里（`src/index.ts:139-170`、`:156-162`）；`reviewPolicy` 有独立解析与 `isReviewPolicy` 类型守卫（`src/profiles.ts:413-440`、`src/quality-gates.ts:240-255`）。
  - 未核实的部分：`role` 的取值是否受枚举限制（schema 只写 `z.string()`，源码未见语义分支 → 大概率是自由文本，**但「大概率」不该进报告**）；`reviewPolicy` 在 profile 上写两项时未列字段是否回落默认值（04 未找到该合并逻辑，只能确认「整体缺失时回落 `DEFAULT_REVIEW_POLICY`」）。
- **修正建议**：03 §7 在片段下方加一行「以上三项为配置层推断，上线前需建一次成员实测」；把 §5.4 的并发配比标为「估算，未压测」。
- **依据**：`src/index.ts:139-170`、`src/profiles.ts:413-440`、`src/quality-gates.ts:40-48`、`:240-255`。

### M6（low，建议）——两处措辞收紧

1. **02 §B.2「即使传了也抛错（`:356-357`）」**：源码条件是 `if (!options.backgroundEnabled) { if (request.run_in_background === true) throw … }` —— 抛错前提是**显式传了 `true`**；若 schema 里根本没这个参数，调用方也传不进来。措辞改为「显式传 `run_in_background: true` 会抛错（且该参数不进入 schema）」更严谨。
2. **03 §0-13「除解析处外全仓库无消费点」**：严格说还有 3 处「接受它」的位置 —— `src/profiles.ts:22`（键白名单）、`src/quality-gates.ts:250-254`（类型守卫容忍该键）、`src/types.ts:134`（类型字段）。结论（死配置）不变，但措辞可改为「除 schema/键白名单/类型守卫/解析校验这些『接受它』的位置外，无任何读取其值的逻辑」。
- **依据**：`dsh-tool-subagent\lib\index.js:356-357`；`Select-String -Path src\*.ts -Pattern "(?<![a-zA-Z])requiredReviewers"` 的 14 处命中，按文件分布 `index.ts:1`、`profiles.ts:8`、`quality-gates.ts:4`、`types.ts:1`（**提示**：裸模式 `requiredReviewers` 会被 `requirementsMaxRounds` 的 `require…ments` 前缀干扰，必须加左边界，否则计数虚高）。

### M7（low，建议）——`reviewedTaskId` 的「只接受 implementation/repair」是描述口径，不是硬校验

- **问题**：03 §9-B4 写「给 `reviewedTaskId` 指向被审的 `implementation`/`repair` 任务（**其他类型不接受**）」。源码只校验「`reviewedTaskId` 非空 + 该任务存在」（`src/quality-gates.ts:418-425`），**没有** kind 白名单校验；「只接受 implementation/repair」出现在工具描述（`src/tools.ts:1487`）与协议文本里。
- **修正建议**：改为「指向被审的 `implementation`/`repair` 任务（**工具描述如此规定，但源码只校验存在性——建任务时须自行约束，不要指望插件拦**）」。这条与 03 §0-5（「实现者≠验证者」是软约束）的严谨度应保持一致。
- **依据**：`src/quality-gates.ts:418-425`；`src/tools.ts:1464`、`:1487`。

### M8（low，可选）——01 §0 表的「git HEAD」已过期

- **问题**：01 §0 记录 HEAD = `e7cb21a`（`#236`）。核验时点 HEAD = `0922bf1`（`test/local-integration`，`v0.1.23` 之后第 6 个提交），工作树干净。`e7cb21a` 是 HEAD 的祖先，01 的记述在**取证时点**成立。
- **修正建议**：最终报告写「版本 `0.1.23`（link 到本地工作树）」即可，不必钉 commit；若要钉，注明「HEAD 随开发前进，事实底稿对应 `e7cb21a` 时点」。
- **依据**：`git -C D:\project\github\dsh-agent-teams log --oneline -3`、`git describe --tags` = `v0.1.23-6-g0922bf1`。

---

## 3. 可直接写进最终报告的安全结论清单

> 以下每条均已由本次独立核验证实（含上文对应行号）。可直接引用，无需再标注「未确认」。

**A. 插件身份与安装**
1. `@nanmicoder/dsh-agent-teams` 版本 **0.1.23**，入口 `lib/index.js`，`dsh` 字段只声明 `bundle.patch` 与客户端注入（无工具声明）。（#1-#5）
2. 本机以 **`link:D:/project/github/dsh-agent-teams`** 安装，即「改源码即生效」；profile 的 `dsh.profile.bundles` 同时含它与 `@deepseek-ai/dsh-experimental-agent-team-profile`。（#6-#9）

**B. 工具面**
3. 插件提供 **14 个** `agent_teams_*` 工具：captain 10 个，成员 4 个（`claim_task`/`update_task`/`send_message`/`status`）。（#11）
4. 插件**不**提供 `team_task_*`；后者由宿主 `@deepseek-ai/dsh-experimental-tool-agent-team` 提供（`team_task_create/list/get/update` + `spawn_teammate`/`send_message`/`list_agents`/`wait_agent`/`interrupt_agent`）。（#14、#15）
5. **两套工具面同时可见**（Captain 实测），来源是「两个团队包同时挂载、且实验层的 disable 名单不含 agent-teams」。宿主的两个团队包**不注册任何斜杠命令**。（#15、#16、#119-#122）
6. 插件的斜杠入口是**闭合命名空间** `/agent-teams`（别名只可能是 `agent-teams-<key>`），与本仓库 16 个 `/lt*` 命令零冲突。（#17、#18）

**C. 任务模型与质量门（写建议时的硬事实）**
7. 任务种类 7 种：`work`（无门禁）+ 6 个质量类 `requirements/implementation/verification/review/repair/integration`；写类只有 `implementation`/`repair`。（#21、#22）
8. 建任务强校验：质量类必须 `objective`+≥1 条 `acceptance`；写类还必须 `inScope`+`verify`；`review` 必须 `reviewedTaskId` 且任务存在；写类 `inScope` 重叠（无依赖）直接拒；有 requirements 时 `implementation` 必须挂在它之后。（#32-#34）
9. 完成强校验：`verify` 有失败项**必须 failed**；四类完成必须 `acceptanceResults`/`commandsRun` 全覆盖全 passed；`changedPaths` 每条必须 `in_scope`。（#31）
10. `review`/`requirements` 只能以 `verdict=pass` 完成；`pass` 不得遗留未解决 high/blocker finding；`needs_revision`/`reject` 必须 `failed` 且至少一条 finding。（#30）
11. `reject` **不自动修复**，直接 `escalated` 留给人；`needs_revision` 才自动开 `repair-round-N` + 下一轮 `review-round-N`（verification 失败走 `verification-round-N`），同 source+finding 去重，超 `maxRepairAttempts=2` 升级。（#42）
12. 默认策略：`requirementsMinRounds=1 / requirementsMaxRounds=4 / codeMaxRounds=3 / maxRepairAttempts=2`。（#28）
13. 路径纪律：一律 workspace 相对 POSIX 路径；拒绝空串/`~`/盘符/`/` 开头/任何 `..`；目录用尾斜杠前缀匹配，否则精确匹配。（#35、#36）
14. 默认排除（任何合同都不能主张）：首段 `.git`/`.dsh`/`.agent-teams`、`.env`/`.env.*`、任一段 `secrets`、`id_rsa*`。（#37）
15. 交付门 blocker 包括 staged 未批准、halted、**escalated**、质量类未完成、completed 无 pass、failed 无 follow-up、completed 实现无 pass review、**审计 gap**。（#41）
16. `amend_task` 可改 5 个合同字段，终态/work 拒绝，**已有 pass 的合同冻结**。（#39）

**D. attempt 与提交纪律**
17. 每次认领产生 `attemptId`；`update_task` 必须带当前 `attempt_id`，否则 stale 被拒；终态后只能 append（`evidence_note`/补充证据），不能改判决。（#24、#26、#27、#46、#108）

**E. 成员与工具可见性（写配置建议时的硬事实）**
18. `tool_policy` 是**唯一**可配置的成员工具可见性途径：owner 在 `toolPolicies` 声明，成员按 id 选择，captain 永远不能提交原始 allow/deny；另有插件内置的 captain-only 收窄与深度 deny（不可配置）。（#58、#63、#64）
19. 成员未选策略时，生效过滤只有 `captain-only deny ∪ ['subagent','send_message']` → **codegraph 工具默认可见、文件写入工具默认全在**。（#63、#106）
20. 不变量：四协调工具永远可用且不得 deny；allow 型自动补齐；`run_code` 是保留名；**owner 声明的 deny 名永不放宽**，选中的策略被删除后 spawn 直接失败而非退化。（#58、#59、#60）
21. `memberMaxDepth` 默认 **0**（成员不得再委派）、`maxMembers` 默认 **8**。（#56、#106）
22. 「模型永远不能提交原始 allow/deny」「这是工具可见性而非 OS 沙箱」均有原文可引（`src/index.ts:182`、`src/tool-policies.ts:13-14`）。（#64、#65）

**F. 软约束（必须由流程保证，不能指望插件拦）**
23. 「实现者 ≠ 验证者」**不是硬校验**：源码没有任何比对 review assignee 与被审任务 assignee 的逻辑，只在提示词里要求。（#67）
24. `reviewPolicy.requiredReviewers` 是**死配置**（除接受/校验它的位置外无消费逻辑），不能用来强制多路审查 → 多路审查要靠「多建 N 个 `review` 任务」。（#68）
25. `reviewedTaskId` 只校验「非空 + 存在」，**不校验被审任务 kind**；「只接受 implementation/repair」是工具描述口径。（#107、M7）

**G. 调度与生命周期**
26. 依赖必须**全部 completed** 才可认领；`nextReadyTask` 先指派给自己、再取无主共享池。（#47、#48）
27. `kickTeam`/`kickMember` 三重短路：缺队 / `halted` / `phase==='staged'` 一律不派发。（#49）
28. 派发先发邮箱积压（投递成功才 ack，失败释放租约），再开票。（#51）
29. 冷恢复只对「本进程未观察过的持久 attempt」开放一次。（#52）
30. captain 变 idle 时名下未完成的接管任务会被退回共享池。（#53）

**H. profile 与项目现状**
31. profile 委派配置要点：`subagent_explore`（`enableRunInBackground: false`、`maxDepth: 1`=叶节点、9 个 codegraph 工具白名单、`deepseek-official/deepseek-v4-flash`）；服务级 `maxDepth: 5`/`maxActiveSubagents: 15`（默认 1/8）；`delegation` 组 9 条无 agent-teams 行；审查用 `tool-subagent` **无 toolFilter/persona/agentOptions**。（#79-#83、#89-#91）
32. `codegraph` MCP 固定指向 `D:\studio_frontend\studio_frontend`（另一个项目）→ 探索会「成功但答错」的风险成立。（#84）
33. 项目 skill 现状：只有 `lignting` 下发子 agent（`subagent_explore` + `review` 用的 `subagent`，1/3/8 路）；`ltc`/`ltp`/`ltw` 不下发；`workflow`/`subagent_fork` 在 skill 层零出现。（#92-#97）
34. 用户级 `~/.dsh/skills/lignting/**` 与仓库版**工作树**11/11 一致；仓库内只有 `lignting`，`codegraph` skill 只在用户级、不受 `verify.mjs` 覆盖。（#101、#102、M2）
35. 仓库 `.gitignore` 只有 6 行且**未忽略** `.agent-teams/`（`check-ignore` 退出码 1）。（#117）

**I. 03 号方案与插件能力的一致性**
36. 03 §9 的 9 条补丁与 §7 配置片段**全部落在插件实际支持的能力内**：staged 两阶段、`objective`/`acceptance`/`inScope`/`verify`、`verdict`+`findings`、`attempt_id`、`edit_plan` 原子批量、`amend_task` 冻结、`toolPolicies`+`tool_policy`、`memberMaxDepth`/`maxMembers` 全部有源码依据。（#104-#118）
37. 方案在「两套工具面并存」前提下**仍然成立**：它只依赖 nanmicoder 那套的字段，宿主那套没有同名同义项，不会误用。（#120、#121）——但须按 **M1** 把「只用一套」写成硬规则，并点明 `agent_teams_send_message` 与宿主 `send_message` 的区别。（#122）

---

## 4. 核验方法与本次未覆盖的范围（诚实声明）

- **本次实际读取的原始材料**：插件 `package.json`、`cordis.patch.yml`、`src/{tool-names,types,state,tool-policies,capabilities,mailbox,index,quality-gates,scheduler,tools,members,profiles,command,event-types}.ts` 的关键区段与全文行数；`~/.dsh/profiles/web/{package.json,cordis.patch.yml}`；`@deepseek-ai/dsh-experimental-agent-team-profile/cordis.patch.yml`；`@deepseek-ai/dsh-experimental-tool-agent-team/lib/index.js`（grep）；`@deepseek-ai/dsh-subagent/lib/{types/index.js,index.js}`；`@deepseek-ai/dsh-tool-subagent/lib/index.js`（关键行）；项目 `skills/lignting/**` 的 `SKILL.md`、`command/{plan,review,ltw,ltp,lts}.md`、`references/whatsnext-bridge.md`；`src/host.js`；`scripts/verify.mjs`；`cordis.patch.yml`；`.gitignore`；`docs/install.md`（UTF-8 解码）。
- **未逐字复核（采信 01/02/03 的互证，风险低）**：Web/UI 客户端文件（`client/*.tsx`、`activity-monitor.ts` 常量块、`StagingPlanEditor.tsx`、`snapshot.ts`）、`workspace-audit.ts` 的函数体、`quality-gates.ts` 的 `bindReviewToRevision`/`appendTaskEvidence` 函数体、`members.ts` 的 781-844 与 1020-1069 全段、其余 5 个非 lignting skill 全文、`.lignting/doc/review` 的实际产物。
- **未做运行时验证**：本次核验**未执行任何插件代码或测试**，未建队、未 spawn 成员。因此「两套工具面并存」采信 Captain 的实测结论 + 源码/配置解释；「并发池共用」「profile 字段部分覆盖」等运行时语义按 M5 标注为推断。
- **可复现命令**（供后续复核）：
  - 插件工具注册点：`Select-String -Path src\tools.ts -Pattern "ctx\.tools\.register"` → 14 行。
  - `requiredReviewers` 全体用点：`Select-String -Path src\*.ts -Pattern "(?<![a-zA-Z])requiredReviewers"` → 14 处命中（**必须加左边界**，裸模式会被 `requirementsMaxRounds` 干扰），全部为「接受/校验」，无读取。
  - 「实现者≠验证者」是否硬校验：`Select-String -Path src\*.ts -Pattern "reviewedTaskId"` → 31 处命中（`quality-gates.ts` 20 / `tools.ts` 6 / `scheduler.ts` 3 / `state.ts` 1 / `types.ts` 1），逐条确认无 assignee 比对。
  - `.agent-teams` 忽略状态：`git check-ignore -v .agent-teams/`（退出码 1 = 未忽略）。
  - 用户级副本一致性：`scripts/verify.mjs`（第 4 节 `:80-120`）或按文件 SHA256 比对。
