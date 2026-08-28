# dsh-lignting

> ⚠️ **仍在开发中（WIP）**
>
> 本项目处于**活跃开发阶段**，尚未发布稳定版本（v0.1.0 以下）。命令行为与流程文件均可能变化，
> 可能存在未修复的缺陷。**请勿用于生产环境**，升级前请阅读提交记录与 README 变更。

![开发状态](https://img.shields.io/badge/开发状态-仍在开发中-orange)
![版本](https://img.shields.io/badge/版本-v0.1.0--wip-blue)
![License](https://img.shields.io/badge/license-MIT-green)

lignting 命令中枢：**DSH 斜杠命令插件 + 配套 skill**。所有流程逻辑都在 skill 文件里
（`skills/lignting/`，事实源，其他 agent 工具也能用），插件只是薄壳，把 `/lt-*` 命令定向到
skill 文件并让模型严格执行。

## 命令

| 命令 | 别名 | 功能 | 流程文件 |
|---|---|---|---|
| `/lt-plan` | `/ltpl` | 需求规划（精确/粗略两档） | `command/plan.md` |
| `/lt-check` | `/ltck` | Bug 排查（信息收割 + 有计划的插桩） | `command/check.md` |
| `/lt-review` | `/ltrv` | 代码审查（low/middle/high 三档） | `command/review.md` |
| `/lt-discussion` | `/ltds` | 大需求详细化讨论（探索验证 → 提问敲定 → 完整方案文档） | `command/discussion.md` |

## 安装与使用（DSH）

### 方式一：`dsh plugin` 一键安装（推荐）

前置：本机已安装 dsh CLI（`dsh plugin` 是 pnpm 的薄转发器，需 pnpm 在 PATH 上）。

在**任意目录**执行（路径用你的本仓库路径，绝对/相对均可）：

```bash
dsh plugin --profile web add <你的仓库路径>

# 或从 GitHub 安装
dsh plugin --profile web add git+https://github.com/loster12520/dsh-lignting.git
```

然后**重启 `dsh web`**（Host 半区改动需要重启）。

> **切换安装方式前**：如果 profile 里已用旧方式挂载过（比如手动在
> `~/.dsh/profiles/web/cordis.patch.yml` 里写过 `{id: lignting-commands, name: dsh-lignting}`
> 行，或旧依赖 `"dsh-lignting": "file:plugins\\dsh-lignting"`），先移除旧安装再 add，
> 避免同一插件重复挂载、命令重复注册：
>
> ```bash
> dsh plugin --profile web remove dsh-lignting
> # 或手动编辑 profile 的 package.json / cordis.patch.yml 删掉旧行
> ```

**打包原理**（与同目录的 `dsh-btw` 一致）：

- `dsh.bundle.patch: "./cordis.patch.yml"` —— bundle 层，挂载插件行 `{id: lignting-commands, name: dsh-lignting}`（等价于在 profile 的 cordis.patch.yml 手写该行）；
- `main: src/host.js` —— Host 半区，注册上述 8 个斜杠命令；
- 无 Client 半区（纯命令插件，浏览器侧无 UI）。

**skill 解析顺序**（`src/host.js`）：

1. **用户级优先**：`~/.dsh/skills/lignting/`（存在 `SKILL.md` 时使用——可编辑、可跨 agent 共享）；
2. **包内回退**：本包自带的 `skills/lignting/`（`dsh plugin add` 装完即用，无需手工复制）。

**使用**：主输入框直接输入 `/<命令> <参数>`，如 `/lt-discussion 把项目从 A 模式重构为 B 模式`。

### 方式二：手动安装（现状等价，适合不想走 pnpm 的场景）

1. 把 `skills/lignting/` 整体复制到用户级目录：`~/.dsh/skills/lignting/`；
2. 把插件代码放到 `~/.dsh/profiles/web/plugins/dsh-lignting/`（或按 `dsh plugin add` 安装）；
3. 在 `~/.dsh/profiles/web/cordis.patch.yml` 加一行 `- id: lignting-commands / name: dsh-lignting`；
4. 重启 `dsh web`。

## 其他 agent 工具（Claude Code / Cursor 等）

本仓库的 `skills/lignting/` 是**与宿主无关的 skill 事实源**，不依赖 DSH 插件即可迁移使用。
迁移方法与各工具的用户级目录见 **[MIGRATION.md](./MIGRATION.md)**。

## 目录结构

```text
dsh-lignting/
├── package.json           # 包声明：dsh.bundle.patch + main（同 dsh-btw 范式）
├── cordis.patch.yml       # bundle 层：挂载插件行 {id: lignting-commands, name: dsh-lignting}
├── src/
│   └── host.js            # Host 半区：8 个斜杠命令注册 + skill 目录解析（用户级优先/包内回退）
├── skills/
│   └── lignting/          # skill 事实源（可迁移到任何 agent 工具）
│       ├── SKILL.md       #   命令路由表 + 公共约束
│       └── command/       #   plan / check / review / discussion
├── scripts/
│   └── verify.mjs         # 自检：ESM 语法 + skill 完整性 + 路由一致性
├── MIGRATION.md           # 其他 agent 工具的 skill 迁移指南
├── README.md
└── LICENSE
```

## 开发

```bash
npm run check    # node --check src/host.js + verify（改 src 或 skills 后跑一遍）
npm run verify   # 只跑自检
```

## License

MIT
