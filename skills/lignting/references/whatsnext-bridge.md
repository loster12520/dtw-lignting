# whatsnext 桥接规则

小阿卡那体系（宝剑 / 圣杯 / 星币 / 权杖）与 `whatsnext` 插件（`/wn*` 命令族）的分工与接续规则。

本文件被小阿卡那各层共同引用。**读它之前先读一遍**，否则很容易写出两边争状态、或绕过
whatsnext 自己造脚手架的流程。

## 一、分工：两个系统各管一半

| | whatsnext | 小阿卡那体系 |
|---|---|---|
| 解决的问题 | **我在做什么、到哪了、下一步** | **为什么这么做、方案是什么** |
| 状态载体 | `index.md` frontmatter（脚本现算） | 无状态字段 |
| 产物位置 | `<项目>/.whatsnext/`（私有，git-ignored） | `<项目>/.lignting/`（随 git 走） |
| 生命周期 | 任务级 | 项目演进级 |
| 谁写 | `/wn*` 命令 | 小阿卡那各命令直接读写 Markdown |

**一句话**：`.whatsnext` 管当前进展，`.lignting` 管架构与理由，两边不互相复制。

## 二、四条硬规则

### 1. 状态单源：小阿卡那不写状态

小阿卡那产出的**任何文档都不含状态字段**——不写"当前进度"、不写"已完成/未完成"标记、
不维护"下一步待办"。

判断"这轮做完了吗""下一步做什么"，**只认 whatsnext**：`index.md` 的 `status` / `progress`
frontmatter，以及任务内 `plan.md` 的 `- [x]` 复选框。

理由：两边都记状态必然漂移，且会绕过 whatsnext 的 Focus 机制。

### 2. 委托而非复制：不调 whatsnext 的脚本

小阿卡那**从不直接执行** whatsnext 的脚本（`new_task.py` / `scan_tasks.py` /
`search_knowledge.py`）。需要这些能力时，**推荐用户敲 `/wn*` 命令**。

原因（重要，别绕）：

- 脚本位于**插件分发路径**，不是用户级 skill 目录。运行时的真实位置由 whatsnext 的
  host 在每次 `/wn*` 调用时注入（替换正文里的 `${CLAUDE_PLUGIN_ROOT}`），外部无从得知。
- 本机 `python3` 可能指向 Windows 应用商店的假壳（执行即失败），真正可用的是 `python`。
  whatsnext 的 host 会探测并注入正确解释器路径，**自己调必然踩这个坑**。
- whatsnext 的 frontmatter 规范会演进，复制它的格式等于给自己埋一处会过期的副本。

小阿卡那**只做纯 Markdown 编辑**：写自己的方案文档与对话记录，以及在 `index.md` 的
「文件」索引里登记文档路径。

### 3. 粒度：一个体系 = 一个 whatsnext 任务

**不是一个层一个任务。**

- **层是阶段** → 用任务内的 `plan.md` 复选框跟踪
- **任务是整件事** → 用 `index.md` 跟踪

每层各开一个任务会让 Focus 打架（whatsnext 约束同时只有一个 Focus），
恢复协议也无法判断该恢复哪个。

### 4. 真源在仓库，副本要进行同步

命令文件的事实源在仓库 `dsh-lignting/skills/lignting/`，而 DSH 实际加载的是
用户级 `~/.dsh/skills/lignting/`（用户级优先，包内回退）。

**两者不是软链，没有任何机制保证一致。** 改完仓库必须同步到用户级，否则改了不生效。
自检见仓库 `scripts/verify.mjs`（含两份一致性检查）。

## 三、whatsnext 结构速查

```
<项目>/.whatsnext/
  tasks/<分类>/<任务名>/
    index.md         # 任务索引：frontmatter 七字段 + 标题简述 + 文件索引
    origin.md        # 需求原文逐字存档（有外部需求时）
    plan.md          # 有序完成度清单（多阶段任务）
    <其他>.md        # 按需命名，须在 index 文件索引登记
  knowledge/<title>.md   # 已验证、可复用、自包含的经验
```

- **分类枚举锁定**：`feat` / `fix` / `refactor` / `docs`，据任务性质选一。
- **index.md frontmatter 七字段全必需**（取值可空，不可省字段）：
  `status`（`active`/`done`/`stopped`）、`progress`、`period`、`updated`、`branch`、
  `owner`、`tags`；可选第八个 `focus: true`（全局唯一）。
- **无根索引**：任务列表与 Focus 由脚本扫描 frontmatter 现算，没有手写的 `tasks/index.md`。
- **`.whatsnext/` 被 git 忽略**，走 `.git/info/exclude`（不是 `.gitignore`）。
- **`knowledge/` 不预建**，首次提升经验时由 promote 创建。

## 四、各层与 whatsnext 的配合点

### `/lts` 开头：接续既有任务（最重要的一处）

小阿卡那的跨对话能力，八成靠这一步。**开新对话聊架构最怕从零开始**——重复问已经
拍过的问题、重复讨论已经否决的方案。

开始讨论前：

1. 检查 `<项目>/.whatsnext/tasks/` 是否存在且在进行的任务。
2. 若有：读该任务 `index.md`（状态 + 标题简述 + **文件索引**）。
3. **按文件索引**读 `.lignting/` 下的历史文档（懒加载：只读索引里登记的相关文件）。
4. 把"已讨论/已否决"的内容带入本轮，**不重复提问**。

若 `.whatsnext/` 未初始化或查不到任务，正常开始讨论，不阻塞。

### `/lts` 讨论成形时：推荐创建任务

**时机**：讨论已经成形、准备沉淀方向文档时——不是一进门就建。
（进门就建会让"聊两句就废"的讨论污染计划区。）

推荐给用户一条**可直接粘贴的命令**：

```
/wn 开始小阿卡那任务：<任务名>
```

由 whatsnext 走它自己的 start 流程（建骨架、接管 Focus）。**不代跑**这一步。

任务名用短横线小写、简短达意，与 `.lignting/<feature>/` 的 feature 名保持一致，
便于两边对照。

### `/lts` 沉淀文档后：登记文件索引

文档落盘到 `.lignting/` 后，**由 `/lts` 自己**把路径写进对应任务 `index.md` 的
`## 文件` 小节（纯 Markdown 编辑，无需脚本）。

这是跨对话恢复的关键：whatsnext 的恢复协议**按文件索引懒加载**兄弟文件，
不登记则新 session 不知道读谁。

写法（路径相对于任务目录）：

```markdown
## 文件

- [方向文档](../../../.lignting/<feature>/direction.md) — /lts 产物：目标、架构方向、关键决策
- [阶段表](../../../.lignting/<feature>/phases.md) — /ltc 产物：阶段划分与核心验收标准
```

**每新建一份文档，都要回来补一行。**

### `/ltw` 完成一轮：同步复选框

一轮执行完毕，做两件事：

1. 勾掉任务 `plan.md` 里对应的 `- [ ]` → `- [x]`（可附结果摘要）
2. 在汇报里给出"当前进度"文本，供用户下次 `/wn-save` 使用

`index.md` 的 `progress` / `updated` **由 `/wn-save` 更新**，各层不直接改 frontmatter
（避免绕过 whatsnext 的状态写入路径）。

### 经验沉淀：提醒但不代跑

执行中发现**已验证、可能被其他任务复用、能写成自包含结论**的经验时，收尾提醒用户：

```
/wn-promote
```

三门槛缺一不提升——**失败尝试与未决研究留在任务里，不要提升**。

## 五、降级路径（whatsnext 不可用时）

若项目环境没有 whatsnext 插件，或 `/wn*` 命令不可用：

- 小阿卡那体系**照常工作**——它不依赖 whatsnext 才能跑。
- 只是失去：跨对话任务恢复、Focus 导航、经验沉淀。
- **不要**为了补齐而手工伪造 `.whatsnext/` 结构——手工写的 frontmatter 很容易缺字段、
  违反 Focus 唯一性，反而污染计划区。等 whatsnext 可用时再用 `/wn` 补建。

## 六、常见坑

| 坑 | 正确做法 |
|---|---|
| 文档里写"当前进度 3/7" | 不写状态，状态只在 whatsnext |
| 直接跑 `new_task.py` 建任务 | 推荐用户敲 `/wn`，环境注入只有它有 |
| 每层开一个 whatsnext 任务 | 一个体系一个任务，层用 `plan.md` 复选框 |
| 建了文档忘记登记 index 文件索引 | 每份新文档都回 `index.md` 补一行 |
| 把 `.lignting/` 也 git-ignore | `.lignting` 随 git 走，只有 `.whatsnext` 私有 |
| 进门就建任务 | 讨论成形、准备沉淀文档时再建 |
| 手工伪造 `.whatsnext/` 结构 | 等 `/wn` 可用时补建 |
