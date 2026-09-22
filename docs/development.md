# 开发

[← 返回 README](../README.md)

## 目录结构

```text
dsh-lignting/
├── package.json           # 包声明：dsh.bundle.patch + main（同 dsh-btw 范式）
├── cordis.patch.yml       # bundle 层：挂载插件行 {id: lignting-commands, name: dsh-lignting}
├── src/
│   └── host.js            # Host 半区：16 个斜杠命令注册 + skill 目录解析（用户级优先/包内回退）
├── skills/
│   └── lignting/          # skill 事实源（可迁移到任何 agent 工具）
│       ├── SKILL.md       #   路由表（小阿卡那 + 运维命令）+ 公共约束 + 局部例外机制
│       ├── command/       #   lts / ltc / ltp / ltw / plan / check / review
│       └── references/    #   各层共用格式：对话记录 / 方案文档 / whatsnext 桥接
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
2. `skills/lignting/` 必需文件齐全（`SKILL.md` + `command/*.md` + `references/*.md`）；
3. **路由一致性**：`src/host.js` 的 `COMMANDS` 与 `SKILL.md` 路由表指向同一组文件；
4. **用户级副本一致性**：`~/.dsh/skills/lignting/` 与仓库版逐文件比对（存在才查）。

## 改动纪律

改 skill 内容时，下面几处是**联动**的，漏一处就自检失败或静默失效：

| 改了什么 | 还要改 |
|---|---|
| 加/删命令文件 | `src/host.js` 的 `COMMANDS`、`SKILL.md` 路由表、`verify.mjs` 的 `required` 清单 |
| 改命令名 | 上面三处 + 各文档里的命令表 |
| 改 skill 任意内容 | **同步到 `~/.dsh/skills/lignting/`**（否则 DSH 加载的还是旧副本） |

两条写死的约束：

- **命令文件名必须匹配 `[a-z-]+\.md`** —— `host.js` 与 `verify.mjs` 用正则对撞路由，形状不合即失配。
- **`SKILL.md` 路由表里必须写 `` `command/xxx.md` ``（带反引号）** —— 正则是按这个形状抓的。

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
  └── whatsnext-bridge.md      与 whatsnext 的分工与接续
```

共用的格式只在一处定义，各命令文件引用它——避免四份文件各写一版、很快互相不一致。

## 设计意图与决策记录

本仓库的架构决策与"为什么这么设计、否决过什么"记录在
[`.lignting/minor-arcana-plan/`](../.lignting/minor-arcana-plan/)：

- `plan.md` —— 方向文档：目标与非目标、关键决策记录、不可逆架构契约、验证信号
- `plan.dialogue.md` —— 对话记录：四个轮次的讨论过程、被否决方案及理由、待验证猜想

**改这套体系之前先读它们**，能避免重复讨论已经拍过或已否决的方案。
