# 迁移 lignting skill 到其他 agent 工具

本仓库的 `skills/lignting/` 是一份**与宿主无关的 skill 事实源**：

- `SKILL.md`：命令路由表（`/lt-plan`、`/lt-check`、`/lt-review`、`/lt-discussion` 及各别名）
  + 公共约束（codegraph 前置检查 / 探索走 codegraph / 子代理规范 / 提问规范 / 输出规范 / 改码需确认）；
- `command/*.md`：各命令的具体流程（plan / check / review / discussion）。

DSH 插件（`src/host.js`）只是薄壳，负责把 DSH 的斜杠命令定向到 skill 文件。**其他 agent 工具
不需要插件**——只要把 `skills/lignting/` 迁移到该工具的用户级 skill 目录，即可获得同样的
流程能力。

## 一、迁移原则（任何工具通用）

1. **整体复制 `lignting/` 目录**，保留顶层目录名 `lignting` 与内部 `command/` 子目录；
   不要摊平、不要改名（`SKILL.md` 的 frontmatter `name: lignting` 与路由表都依赖这个结构）。
2. 目标位置必须是该工具**会扫描的用户级 skill 目录**（见下表；各工具扫描约定会随版本变化，
   以官方文档为准）。
3. 迁移后**命令即生效**：多数工具热加载或下次会话生效；无需改动任何流程文件。
4. 若工具**不支持 SKILL.md 格式**：把 `SKILL.md` + `command/*.md` 的内容并入项目上下文文件
   （如 Claude Code 的 `CLAUDE.md`），保留章节结构即可。

## 二、各工具的用户级目录与命令形式

| 工具 | 用户级 skill 目录（示例） | 命令形式 |
|---|---|---|
| **DSH** | `~/.dsh/skills/lignting/` | 斜杠命令 `/lt-plan /ltpl /lt-check /ltck /lt-review /ltrv /lt-discussion /ltds`（另有插件方式，见 README） |
| **Claude Code** | `~/.claude/skills/lignting/` | `#` 唤起按 description 触发（如 `#规划需求`），或配 slash command 指向 `SKILL.md` |
| **Cursor** | 全局 skills 目录 / `.cursor/skills/lignting/`（项目级） | 按 description 触发 |
| **Windsurf / Trae / 其他** | 各自 skills 目录约定 | 按 description 触发 |

> 具体路径以各工具当前文档为准；原则永远是「把整个 `lignting/` 放进工具扫描的 skills 目录」。

## 三、复制命令

PowerShell（Windows）：

```powershell
# Claude Code 示例
Copy-Item -Recurse D:\project\github\dsh-lignting\skills\lignting $HOME\.claude\skills\

# DSH 示例（用户级优先，可编辑/共享）
Copy-Item -Recurse D:\project\github\dsh-lignting\skills\lignting $HOME\.dsh\skills\
```

bash（macOS / Linux）：

```bash
# Claude Code 示例
cp -r /path/to/dsh-lignting/skills/lignting ~/.claude/skills/

# DSH 示例
cp -r /path/to/dsh-lignting/skills/lignting ~/.dsh/skills/
```

## 四、迁移后验证

1. 让工具加载/刷新 skill（新开会话或热重载）；
2. 用触发词试一句（如「规划需求 / 做个计划」「讨论需求 / 把大需求详细化拆解」），
   或直接调命令（`/lt-plan <需求描述>`、`/ltds <大需求描述>`）；
3. 确认 agent 第一步会 `read` `command/<file>` 并遵守公共约束：
   - 探索前先 `codegraph_status`（项目未 init 会要求先 `codegraph init -i`，不得绕过）；
   - 代码探索走 codegraph / 子代理，提问用带选项的提问工具（每轮 ≤6，推荐项第一）；
   - 计划/报告默认输出到对话，落盘需用户确认。

## 五、注意事项

- **版本同步**：本仓库是事实源。用户级目录是各工具的本地副本，升级仓库后按需重新复制
  （或只复制变更的文件，如 `SKILL.md` / 某个 `command/*.md`）。
- **DSH 双通道**：DSH 上即使不迁移，插件也会回退到包内 `skills/lignting/` 正常工作；
  迁移到 `~/.dsh/skills/lignting/` 是为了**自定义与跨工具共享同一份**（用户级优先）。
- **不要修改 `command/*.md` 的流程骨架**：公共约束与四份流程是同一套语义，各工具差异只体现在
  触发/调用方式上。
