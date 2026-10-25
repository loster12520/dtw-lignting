# 变更记录

## Unreleased

未发布的一批改动（流程事实源仍是 `skills/lignting/`，版本未 bump）：

- **命令输入与子代理下发**：Host 侧改动在 `src/host.js`，需重启 `dsh web` 生效；
- **讨论体验 / 总计划 roadmap / 对话与执行报告落盘**：只改 skill 与 references，不改 `host.js`。

### 命令输入：16 个入口支持图片/文件附件（`src/host.js`）

- 16 个命令入口（7 个命令文件 + 别名）重写 `hint` 占位提示，并声明
  `input.attachments: true`：所有 `/lt*` 命令都能随命令附带**图片/文件**；
  **只有附件、没有文字也算一次输入**，模型从附件取执行所需的上下文。
- 空输入（无文字且无附件）时 handler 明确要求按流程文件开头的《空输入处理》执行
  （该出教程就出教程，该用默认参数就继续），不反问。

### 空输入小教程（`command/*.md`）

- 七个命令文件新增《输入》《空输入处理（先于第 0 步）》《小教程种子案例（只作结构种子）》：
  无参数时输出按**当前项目**真实文件/模块组织的小教程（用途 / 输入 / 流程 / 产物 /
  当前项目实例 / 别名与下一层 / 3–5 条坑），先花 ≤3 步确认项目，不进入正式流程、不写文件。
- `/ltrv` 规则：首次（`<项目根>/.lignting/.cr-state.json` 不存在）出教程；非首次无参
  直接 `level=middle` + 自动检测范围，**禁止**反问级别、禁止要求用户重敲 `/ltrv middle`。

### 子代理：Agent Teams 优先下发（`SKILL.md` §3、`command/*.md`）

- 下发前按会话工具表选路，整轮只走一套：有 Agent Teams（`spawn_teammate` /
  `team_task_*` / `send_message` / `wait_agent` 等，随 `@deepseek-ai/dsh@0.2.1-rc.2` 自带）
  就走 Team，否则回退 native `subagent` / `subagent_fork`；工具名统一为宿主版，
  **不存在** `agent_teams_*`。
- 去掉 `subagent_explore` 的硬性要求（当前 profile 未挂载）；探索成员 prompt 必须自包含、
  带 `projectPath`；审查者 ≠ 实现者；high 档 8 路与成员上限对齐。

### 讨论体验：先判断、每轮 3–4 个核心问题（`SKILL.md` §4、`command/lts.md`、`ltc.md`、`ltp.md`）

- 每轮先给判断 + 依据 + 还没定的，再问 **3–4 个核心问题**（硬上限 4；真正阻塞不足 3 个不凑数；
  超过 4 个列“待问清单”下一轮再问）。
- 每个问题四段式：**背景 / 问题 / 你为什么这么考虑 / 推荐答案**；开放问题用普通对话直接问、
  不给选项，分叉决策用 `ask_user_question` 且推荐项第一。
- 不再对外播报“当前层 / 当前相 / 相变：X → Y”标签：讨论重点变化用自然过渡，保留
  已定结论 / 还没定的 / 本轮要做什么；文档头部 `> 层级：` 保留为元数据，对话记录不写相名。

### 总计划 roadmap（`references/roadmap-format.md`、四个命令）

- 新增 `.lignting/<feature>/roadmap.md` **人读总计划**：细节也从源文档派生，每节标注
  “派生自 <源文档> · 同步于 <日期>，冲突以源文档为准”；**不写完成状态**；**不是任何命令的输入**。
- 分工：`/lts` 建框架（§1/§5 方向组/§6）→ `/ltc` 填 §2 大轮次（每阶段核心目的/要做什么/验收）→
  `/ltp` 填 §3 当前轮（核心目的/改动顺序/回滚）→ `/ltw` 回填 §4 实际（做了什么/验证结果/偏离）。
- `/ltp` 直接开始且没有 roadmap 时先建最小框架再讨论；旧轮不搬运，§4/§5/§6 只追加。

### 对话记录与执行报告落盘（`command/ltc.md`、`ltp.md`、`ltw.md`）

- `/ltc`、`/ltp` 每轮追加自己的对话记录：`phases.dialogue.md`、`phase-<n>/round-<m>.dialogue.md`。
- `/ltw` 新增 `round-<m>.report.md` 落盘（四段式 + 对应核心目的），对话里仍输出汇报。
- `/ltc` 阶段表与 `/ltp` 分轮计划新增「核心目的」字段（为什么这一步非做不可，不等于“目标”）；
  `/ltc`、`/ltp` 提问时给 3–5 行极简暂定大纲（标“待确认后展开”）。

### 文档

- `README.md` / `docs/commands.md` / `docs/development.md` / `docs/install.md` / `MIGRATION.md`
  同步附件、无参教程与 Agent Teams 规范；版本未 bump（`package.json` 仍是 0.1.1）。
- 本轮同步讨论规范、总计划 roadmap、对话/报告落盘（`README.md` / `docs/commands.md` /
  `docs/development.md` / `MIGRATION.md`）；版本仍未 bump。

## 0.1.1

针对实战反馈"`/lts` 提问不知所云、换相没有感知"的两处流程加固（事实源在
`skills/lignting/`，改完自动被 DSH 加载）：

### `/lts`：换相要播报（`command/lts.md` 2.1）

- 新增**相变播报**硬要求：相变了就在开口处写
  「**相变：X → Y**」+ **已确定的初步结论**（逐条带依据/回指链接）+ **到这里还没定的**
  + **本轮要做的**。
- 播报必须落在**换相那一轮**、写在正文开头，并在这轮结束时把这组结论写进对话记录
  该轮正文（"本轮确定的结论"），供下游层回指。
- 不换相的轮次只写一句"当前相：X"，**不重播**；退回上一相写"**退回：X 相**"。

### `/lts`：提问前先给背景（`command/lts.md` 2.2 / 2.3）

- 任何问题（含 `ask_user_question` 的 `question`）必须按
  **背景 → 依据/回指 → 问题本体** 的顺序写；`header` 只放短标签。
- 引用前文出现过的术语、结论、被否决方案时，第一次出现**必须**带回指链接；
  禁止裸引用代号与黑话。

### 回指链接与锚点（`references/dialogue-log-format.md`）

- 新增「回指链接」一节：锚点生成规则（`## L3 · 主题` → `#l3--主题`）、
  索引区写法从 `（见 L2）` 改为可点击链接、链接文字要能脱离链接独立看懂。
- 轮次标题形状 `## L<n> · <主题>` 定为**回指锚点的来源，不可改形**。
- `references/plan-doc-format.md` 的回指示例同步改成带锚点的可点击链接。

### 公共约束（`SKILL.md` §4）

- 提问规范新增：**每个问题先给背景**；引用前文概念必须带回指链接
  （指向 `dialogue-log-format.md` 的锚点规则）。其余命令一并受益。

### 安装与同步（`docs/install.md`、`references/whatsnext-bridge.md`）

- 用户级副本改为推荐**软链**（`ln -sfn <仓库>/skills/lignting ~/.dsh/skills/lignting`）：
  改仓库即改用户级，杜绝"改了不生效"的漂移；不能软链时保留复制 + `npm run check` 的路径。

### 文档

- `docs/commands.md` 增「`/lts` 的两条硬要求」一节。
