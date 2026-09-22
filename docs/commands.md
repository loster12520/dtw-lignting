# 命令

[← 返回 README](../README.md)

## 小阿卡那（Minor Arcana）体系 —— 主流程

从「一个还没成形的想法」到「代码写完并汇报」的四层递进。**每层的产物是下一层唯一的输入**，
不跨层引用。命名取自小阿卡那四组牌的性格：风（思辨）→ 水（愿景）→ 土（务实）→ 火（行动）。

| 层 | 命令 | 别名 | 输入 → 产物 | 流程文件 |
|---|---|---|---|---|
| 宝剑 | `/lts` | `/lt-swords` | 想法 → 方向文档 | `command/lts.md` |
| 圣杯 | `/ltc` | `/lt-cups` | 方向文档 → 阶段表 + 核心验收标准 | `command/ltc.md` |
| 星币 | `/ltp` | `/lt-pentacles` | 阶段表 + 阶段号 → 分轮详细计划 | `command/ltp.md` |
| 权杖 | `/ltw` | `/lt-wands` | 详细计划 → 代码 + 四段汇报 | `command/ltw.md` |

每层有**不可替代的判断力**（写死在流程文件里，否则会退化成排版工）：

| 层 | 判据问句 | 不可替代的判断力 |
|---|---|---|
| 宝剑 | 往哪走、为什么这么走 | 分相讨论；区分开放问题与分叉决策 |
| 圣杯 | 先做哪个、什么绝不能漏 | 阶段划分；指出最核心必覆盖的能力 |
| 星币 | 具体动哪、什么顺序、怎么验证 | 改动顺序（中间态坏得最少）；依赖闭包；回滚点 |
| 权杖 | 做完没有、跟计划差在哪 | 偏离必须明说；汇报末段是回灌通道 |

### 跳层是正常用法

不是违规，是设计的一部分：

| 情况 | 走哪条 |
|---|---|
| 想法还在成形，需要探讨 | `/lts` |
| 需求已清楚，只需排期 | 直接 `/ltc` |
| 已有阶段表，只需细化某一轮 | 直接 `/ltp` |
| 已有详细计划，只需执行 | 直接 `/ltw` |
| 单点小改动 | 不用小阿卡那，走 `/ltpl` |

## 独立运维命令

临时维护与救火用，**不参与**上述递进链条：

| 命令 | 别名 | 功能 | 流程文件 |
|---|---|---|---|
| `/lt-plan` | `/ltpl` | 单点小改动的需求规划（精确/粗略两档），轻量入口 | `command/plan.md` |
| `/lt-check` | `/ltck` | Bug 排查（信息收割 + 有计划的插桩） | `command/check.md` |
| `/lt-review` | `/ltrv` | 代码审查（low/middle/high 三档） | `command/review.md` |

> ⚠️ `/ltpl` 与 `/ltp` 只差一个字母，注意区分：**`/ltpl` 是轻量规划，`/ltp` 是星币层细化。**
>
> 旧命令 `/lt-discussion`、`/ltds` 保留为 `/lts` 的兼容别名
> （原 `command/discussion.md` 已拆入 `lts.md` 与 `ltc.md`）。

## 跨对话：与 whatsnext 配合

小阿卡那体系与 `whatsnext` 插件（`/wn*` 命令族）分工，两边不互相复制：

| | whatsnext | 小阿卡那 |
|---|---|---|
| 解决的问题 | 我在做什么、到哪了、下一步 | 为什么这么做、方案是什么 |
| 产物位置 | `<项目>/.whatsnext/`（私有，git-ignored） | `<项目>/.lignting/`（随 git 走） |
| 谁写 | `/wn*` 命令 | `/lt*` 命令直接读写 Markdown |

四条硬规则：

1. **状态单源**：小阿卡那产出的文档**不含状态字段**；"这轮做完了吗"只认 whatsnext。
2. **委托而非复制**：不直接调 whatsnext 的脚本，需要时推荐用户敲 `/wn*`。
3. **粒度**：一个体系 = 一个 whatsnext 任务（层是阶段，用任务内 `plan.md` 复选框跟踪）。
4. **真源在仓库**：改完 skill 要同步到用户级副本（见 [install.md](install.md)）。

完整规则见 `skills/lignting/references/whatsnext-bridge.md`。

典型流程：

```
/wn-init                              # 首次：铺 whatsnext 地基
/wn 开始小阿卡那任务：<任务名>          # 讨论成形后：建跨会话任务
/lts <想法>                           # 宝剑层：聊方向
/ltc .lignting/<feature>/direction.md # 圣杯层：排阶段
/ltp .lignting/<feature>/phases.md Phase 1
/ltw .lignting/<feature>/phase-1/round-1.md
```

## `.lignting/` 文档目录约定

各层的方案文档与对话记录落在**使用方项目**的 `.lignting/<feature>/`。

**该目录随 git 走**——架构决策要能被 review；私有的只有 `.whatsnext/`。

```text
<项目>/.lignting/<feature>/
  direction.md                      # /lts 方案文档（方向）
  direction.dialogue.md             # /lts 对话记录
  phases.md                         # /ltc 方案文档（阶段表 + 核心验收标准）
  phases.dialogue.md
  phase-1/
    round-1.md                      # /ltp 方案文档（分轮详细计划）
    round-1.dialogue.md
    round-1.report.md               # /ltw 执行汇报
```

**每层两份文档**：

- **方案文档**——拍板后的快照，是下一层唯一输入
- **对话记录**——追加式流水，记"为什么、否决了什么、还有什么没想清"

被否决的方案与理由只存在于对话记录里，方案文档不记它——那正是三个月后最值钱的部分。
