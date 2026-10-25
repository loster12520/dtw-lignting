# 开发

[← 返回 README](../README.md)

## 目录结构

```text
dsh-lignting/
├── package.json           # 包声明：dsh.bundle.patch + main（同 dsh-btw 范式）
├── cordis.patch.yml       # bundle 层：挂载插件行 {id: lignting-commands, name: dsh-lignting}
├── src/
│   └── host.js            # Host 半区：16 个斜杠命令注册（hint + 附件声明）+ skill 目录解析（用户级优先/包内回退）
├── skills/
│   └── lignting/          # skill 事实源（可迁移到任何 agent 工具）
│       ├── SKILL.md       #   路由表（小阿卡那 + 运维命令）+ 公共约束 + 局部例外机制
│       ├── command/       #   lts / ltc / ltp / ltw / plan / check / review
│       └── references/    #   各层共用格式：对话记录 / 方案文档 / 总计划 roadmap / whatsnext 桥接
├── scripts/
│   └── verify.mjs         # 自检：ESM 语法 + skill 完整性 + 路由一致性 + 用户级副本一致性
├── MIGRATION.md           # 其他 agent 工具的 skill 迁移指南
├── docs/                  # 本目录
├── README.md
└── LICENSE
```

## 自检

```bash
npm run check    # node --check src/host.js + verify（改 src 或 skills 后跑一遍）
npm run verify   # 只跑自检
```

`verify.mjs` 做四件事：

1. `src/host.js` 按 ESM 语法检查；
2. `skills/lignting/` 必需文件齐全（**12 个**：`SKILL.md` + 7 个 `command/*.md` + 4 个 `references/*.md`）；
3. **路由一致性**：`src/host.js` 的 `COMMANDS` 与 `SKILL.md` 路由表指向同一组文件；
4. **用户级副本一致性**：`~/.dsh/skills/lignting/` 与仓库版逐文件比对（存在才查）。

## Host 半区：命令提示与附件（`src/host.js`）

`src/host.js` 里有两处影响命令体验：

- **`HINTS`（按命令文件）** —— 输入框占位提示：写清本命令要什么（路径 / 描述 / 截图）、
  可附什么附件、以及"不带参数看小教程"。16 个入口（含别名）复用同一条提示，别留空。
- **注册项 `input: { hint, attachments: true }`** —— 每个入口注册时声明附件准入
  （图片与非图片文件）。handler 把附件按提交顺序放在 steer 消息最前面：图片可直接看，
  文件是只读副本；**只给附件、没有文字也算输入**，handler 会提示模型从附件取上下文。

空输入（无文字且无附件）时 handler 不自己发挥，而是明确要求按流程文件开头的
《空输入处理》执行——该出教程的就出教程，该用默认参数（如 `/ltrv` 的 `middle`）的就继续，
不要反问。`description` 也统一带"不带参数看小教程"（`/ltrv` 写成"首次看小教程，
之后默认 middle"）。

**改 Host 半区必须重启 `dsh web`**：`src/host.js` 在启动时注册命令，不热更；
而 `command/*.md` 是每次命令触发时 `read` 的，软链到位时**改完即生效、不用重启**。
附件能力依赖 DSH 0.2.1+ 的命令 `attachments` 声明与消息构造支持。

> 本轮（讨论体验 / 总计划 roadmap / 对话与报告落盘）的实现只改 `skills/lignting/` 的流程与格式
> （另同步了 README 与 docs），**没有改 `src/host.js`，不需要重启 `dsh web`**；按下面的
> 「改动纪律」同步用户级副本即可。

## 改动纪律

改 skill 内容时，下面几处是**联动**的，漏一处就自检失败或静默失效：

| 改了什么 | 还要改 |
|---|---|
| 加/删命令文件 | `src/host.js` 的 `COMMANDS`、`SKILL.md` 路由表、`verify.mjs` 的 `required` 清单 |
| 加/删 references 文件 | `verify.mjs` 的 `required` 清单（现为 12 项）、本文档的目录树与「流程文件之间的关系」、`SKILL.md` 的格式清单 |
| 改命令名 | 上面三处 + 各文档里的命令表 |
| 改命令提示 `hint` / 附件声明（`attachments`） | `src/host.js` 的 `HINTS` / 注册项；**重启 `dsh web`**（Host 半区不热更） |
| 改 skill 任意内容 | **同步到 `~/.dsh/skills/lignting/`**（推荐软链，见 [install.md](install.md)；复制方式下不同步等于没改。软链时 `command/*.md` 每次触发现读，**不用重启**） |

两条写死的约束：

- **命令文件名必须匹配 `[a-z-]+\.md`** —— `host.js` 与 `verify.mjs` 用正则对撞路由，形状不合即失配。
- **`SKILL.md` 路由表里必须写 `` `command/xxx.md` ``（带反引号）** —— 正则是按这个形状抓的。

**领域内容维护纪律**（讨论 / roadmap / 落盘）：

- **核心目的**：`/ltc` 阶段表、`/ltp` 分轮计划必须写「核心目的」（为什么非做不可，不等于目标）；
  改这条要求要同时改两个命令文件的模板、`references/plan-doc-format.md` 的写法要求，以及
  roadmap §2/§3 的派生字段。
- **roadmap 是派生视图**：格式只在 `references/roadmap-format.md` 定义；先落源文档再写 roadmap，
  冲突以源文档为准；§4/§5/§6 只追加；不写完成状态；**不是命令输入**。
- **对话记录 / 执行报告**：`/lts`、`/ltc`、`/ltp` 每轮追加 `.dialogue.md`，`/ltw` 落
  `round-<m>.report.md`（不写 dialogue）；文件命名与结构见 `references/dialogue-log-format.md`。

## 流程文件之间的关系

```
SKILL.md                    路由 + 公共约束（命令文件可声明局部例外，见 §7）
  ├── command/lts.md        宝剑层
  ├── command/ltc.md        圣杯层
  ├── command/ltp.md        星币层
  ├── command/ltw.md        权杖层
  └── command/{plan,check,review}.md   独立运维命令
references/
  ├── dialogue-log-format.md   对话记录格式（各层共用）
  ├── plan-doc-format.md       方案文档格式（各层共用）
  ├── roadmap-format.md        总计划 roadmap.md 格式（人读视图，不是命令输入）
  └── whatsnext-bridge.md      与 whatsnext 的分工与接续
```

共用的格式只在一处定义，各命令文件引用它——避免四份文件各写一版、很快互相不一致。

## 设计意图与决策记录

本仓库的架构决策与"为什么这么设计、否决过什么"记录在
[`.lignting/minor-arcana-plan/`](../.lignting/minor-arcana-plan/)：

- `plan.md` —— 方向文档：目标与非目标、关键决策记录、不可逆架构契约、验证信号
- `plan.dialogue.md` —— 对话记录：四个轮次的讨论过程、被否决方案及理由、待验证猜想

**改这套体系之前先读它们**，能避免重复讨论已经拍过或已否决的方案。
