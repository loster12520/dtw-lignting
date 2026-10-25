# dsh-lignting

> 🚧 **框架已完成（WIP·细节迭代中）**
>
> 小阿卡那四层体系与独立运维命令的**整体框架已经搭建完毕**，命令路由、公共约束、
> 各层流程文件与格式定义均已就位并通过自检。后续主要是细节打磨与实战检验，
> 个别命令的行为仍可能调整。**升级前请阅读提交记录与文档变更。**

![开发状态](https://img.shields.io/badge/开发状态-框架已完成-yellow)
![版本](https://img.shields.io/badge/版本-v0.1.0--wip-blue)
![License](https://img.shields.io/badge/license-MIT-green)

lignting 命令中枢：**DSH 斜杠命令插件 + 配套 skill**。所有流程逻辑都在 skill 文件里
（`skills/lignting/`，事实源，其他 agent 工具也能用），插件只是薄壳，把 `/lt*` 命令定向到
skill 文件并让模型严格执行。

## 功能

### 小阿卡那（Minor Arcana）体系 —— 从想法到代码的四层递进

每层的产物是下一层唯一的输入，不跨层引用。命名取自小阿卡那四组牌的性格：
风（思辨）→ 水（愿景）→ 土（务实）→ 火（行动）。

| 层 | 命令 | 别名 | 干什么 |
|---|---|---|---|
| 宝剑 | `/lts` | `/lt-swords` | **想法讨论** —— 像跟资深专家喝咖啡一样把方向聊清楚，产出方向文档 |
| 圣杯 | `/ltc` | `/lt-cups` | **方案细化** —— 分阶段、定核心验收标准（什么绝不能漏） |
| 星币 | `/ltp` | `/lt-pentacles` | **细节敲定** —— 改动顺序、依赖闭包、回滚点，落到能动手的粒度 |
| 权杖 | `/ltw` | `/lt-wands` | **具体执行** —— 按计划写完代码、自测、四段式汇报 |

**跳层是正常用法**：需求已清楚只需排期 → 直接 `/ltc`；已有阶段表只需细化某一轮 → 直接 `/ltp`；
单点小改动 → 走 `/ltpl`。

**跨对话**：与 [whatsnext](https://github.com/Twisuki/whatsnext) 插件（`/wn*`）配合——方案与决策理由（`.lignting/`，随 git）、
任务状态与进展（`.whatsnext/`，私有）各归各的，换会话不丢上下文。
它不是本仓库的依赖，需单独安装（见 [docs/install.md](docs/install.md#配套安装-whatsnextwn)）；
没装时小阿卡那照常工作，只是少了任务恢复与经验沉淀。

### 独立运维命令

临时维护与救火用，不参与上述递进链条：

| 命令 | 别名 | 干什么 |
|---|---|---|
| `/lt-plan` | `/ltpl` | 单点小改动的需求规划（精确/粗略两档），轻量入口 |
| `/lt-check` | `/ltck` | Bug 排查（信息收割 + 有计划的插桩） |
| `/lt-review` | `/ltrv` | 代码审查（low/middle/high 三档） |

### 输入与协作

- **16 个命令入口**（7 个命令文件 + 别名）都支持随命令附带**图片/文件**；
  只有附件、没有文字也算一次输入。
- **不带参数**时输出按当前项目真实文件/模块举例的小教程；`/ltrv` 首次
  （`.lignting/.cr-state.json` 不存在）出教程，之后无参默认 `middle` + 自动检测范围。
- 子代理**优先 Agent Teams**（`spawn_teammate` / `team_task_*` 等，随
  `@deepseek-ai/dsh@0.2.1-rc.2` 自带），未启用时自动回退 native `subagent` / `subagent_fork`。
- **讨论先判断后提问**：`/lts`、`/ltc`、`/ltp` 每轮先给判断 + 依据 + 还没定的，再问
  **3–4 个核心问题**（背景 / 问题 / 为什么这么考虑 / 推荐答案，硬上限 4）；
  对外不播报“层 / 相”标签，讨论重点变化用自然过渡。
- **总计划 `roadmap.md`**：每个 feature 在 `.lignting/<feature>/roadmap.md` 有一份人读总计划
  （细节也放，以源文档为准，不写状态，**不是命令输入**）——`/lts` 建框架 → `/ltc` 填大轮次
  → `/ltp` 填当前轮 → `/ltw` 回填实际。
- **每轮落盘**：`/lts` → `direction.dialogue.md`、`/ltc` → `phases.dialogue.md`、
  `/ltp` → `round-<m>.dialogue.md`、`/ltw` → `round-<m>.report.md`；
  阶段表/分轮计划都写清「核心目的」（为什么这一步非做不可）。

## 快速开始

**1. 安装插件**（需本机有 `dsh` CLI 与 `pnpm`）：

```bash
dsh plugin --profile web add <本仓库路径>
```

**2. 重启 `dsh web`**（Host 半区改动需要重启）。

**3. 敲命令**——主输入框直接输入，例如：

```text
/lts 把项目从 A 模式重构为 B 模式      # 讨论：先给判断，再问 3–4 个核心问题
/ltck 直接贴报错截图 + 日志文件（只给附件、不写文字也算输入）
/ltrv          # 不带参数：首次看小教程，之后默认 middle 档
```

小阿卡那的产物落在 `.lignting/<feature>/`：方案文档 + 对话记录 + 人读总计划 `roadmap.md`；
`/ltw` 的汇报另存为 `round-<m>.report.md`。

## 额外资料

| 文档 | 内容 |
|---|---|
| [docs/install.md](docs/install.md) | 安装细节：打包原理、skill 解析顺序、手动安装、副本同步 |
| [docs/commands.md](docs/commands.md) | 完整命令表、跳层规则、`.lignting/` 文档目录约定、跨对话说明 |
| [docs/development.md](docs/development.md) | 目录结构、自检脚本、改动后的同步纪律 |
| [CHANGELOG.md](CHANGELOG.md) | 变更记录（改了哪些流程、为什么改） |
| [MIGRATION.md](MIGRATION.md) | 迁移到其他 agent 工具（Claude Code / Cursor 等） |

## License

MIT
