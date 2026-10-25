# 安装

[← 返回 README](../README.md)

## 方式一：`dsh plugin` 一键安装（推荐）

前置：本机已安装 dsh CLI（`dsh plugin` 是 pnpm 的薄转发器，需 pnpm 在 PATH 上）。

在**任意目录**执行（路径用你的仓库路径，绝对/相对均可）：

```bash
dsh plugin --profile web add <你的仓库路径>

# 或从 GitHub 安装
dsh plugin --profile web add git+https://github.com/loster12520/dtw-lignting.git
```

> 📌 **命名说明**：远端仓库名为 `dtw-lignting`（本地目录与 `package.json` 里仍是
> `dsh-lignting`），两者不一致是历史遗留，暂未统一。

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

## 方式二：手动安装

适合不想走 pnpm 的场景，效果与方式一等价：

1. 把 `skills/lignting/` 整体复制到用户级目录：`~/.dsh/skills/lignting/`
   （或按上面做成软链）；
2. 把插件代码放到 `~/.dsh/profiles/web/plugins/dsh-lignting/`（或按 `dsh plugin add` 安装）；
3. 在 `~/.dsh/profiles/web/cordis.patch.yml` 加一行 `- id: lignting-commands / name: dsh-lignting`；
4. 重启 `dsh web`。

## 打包原理

与同目录的 `dsh-btw` 一致：

- `dsh.bundle.patch: "./cordis.patch.yml"` —— bundle 层，挂载插件行
  `{id: lignting-commands, name: dsh-lignting}`（等价于在 profile 的 cordis.patch.yml 手写该行）；
- `main: src/host.js` —— Host 半区，注册 16 个斜杠命令（含别名）；
- 无 Client 半区（纯命令插件，浏览器侧无 UI）。

## skill 解析顺序

`src/host.js` 的 `resolveSkillDir()`：

1. **用户级优先**：`~/.dsh/skills/lignting/`（存在 `SKILL.md` 时使用——可编辑、可跨 agent 共享）；
2. **包内回退**：本包自带的 `skills/lignting/`（`dsh plugin add` 装完即用，无需手工复制）。

## ⚠️ 两份副本的关系

**DSH 实际加载的是用户级那份**（`~/.dsh/skills/lignting/`，用户级优先、包内回退）。
两份之间没有自动同步机制，所以推荐把它做成**软链**，从根上消掉漂移：

```bash
ln -sfn <仓库绝对路径>/skills/lignting ~/.dsh/skills/lignting
```

- 软链在：改仓库即改用户级，DSH 的 skill 监视还会让改动**无需重启**就进入下一次目录；
  `npm run verify` 的第四项逐文件比对同样通过（读到的是同一批文件）。
- 不方便软链的平台（Windows 等）：把 `skills/lignting/` 整体复制过去，
  并删掉用户级里仓库已移除的文件；每次改完仓库都要重跑一次 `npm run check`。

`npm run check` 会逐文件比对两份并报出漂移；第四项在用户级缺失时**跳过并提示**
（那是正常状态，实际用包内那份）。

> 用 `dsh plugin` 的本地链接方式安装时，链接的是**插件代码**，不是 skill 目录——
> 但插件读的 `command/*.md` 是每次命令触发时**现读**的，
> 所以只要软链或复制到位，改流程文件不需要重启。

## 可选：启用 Agent Teams（推荐）

lignting 的子代理调度默认**先走 Agent Teams**（持久小队 + 共享任务板），没启用时自动回退
native `subagent` / `subagent_fork`。它是 **DSH 官方宿主能力**，随
`@deepseek-ai/dsh@0.2.1-rc.2` 自带，**不需要单独安装插件**：

- 在 `~/.dsh/profiles/web/package.json` 的 `dsh.profile.bundles` 里加入
  `@deepseek-ai/dsh-experimental-agent-team-profile`（dsh 自带，不需要另外 npm install），
  重启 `dsh web` 生效；
- 它**不是** `@nanmicoder/dsh-agent-teams`；启用后拿到的工具是 `spawn_teammate` /
  `send_message` / `list_agents` / `wait_agent` / `interrupt_agent` /
  `team_task_create|list|get|update`，**没有** `agent_teams_*` 工具；
- 没启用也不影响命令本身：探索/审查/并行执行回退 native `subagent` / `subagent_fork`
  （探索若挂载了 `subagent_explore` 优先用它；本机当前 profile 未挂载）。

> 附件能力同样需要 **DSH 0.2.1+**：命令声明 `input.attachments` 后才能把图片/文件
> 随命令带进模型；更老的版本只能文字输入。

## 使用

主输入框直接输入 `/<命令> <参数>`，例如：

```text
/lts 把项目从 A 模式重构为 B 模式
/ltck 直接附上报错截图/日志（不写文字也算输入）
/ltrv                         # 不带参数：首次看小教程，之后默认 middle
```

不带参数（无文字且无附件）时会输出按当前项目真实文件/模块组织的小教程；`/ltrv` 首次
（`.lignting/.cr-state.json` 不存在）出教程，之后无参默认 `middle` + 自动检测范围。
命令清单与跳层规则见 [commands.md](commands.md)。

## 配套：安装 whatsnext（`/wn*`）

小阿卡那的跨对话能力依赖 whatsnext 的计划区（`.whatsnext/`）。它与本插件各自独立安装：

```bash
git clone https://github.com/Twisuki/whatsnext ~/project/github/whatsnext
dsh plugin --profile web add ~/project/github/whatsnext
```

- 包名是 `whatsnext-dsh`（仓库根目录本身就是一个 DSH 插件包）；装完 profile 的
  `dsh.profile.bundles` 会多一项，**它是 bundle 层，要重启 `dsh web`** 才会出现 `/wn` 命令族。
- 远程安装：`dsh plugin --profile web add github:Twisuki/whatsnext`
  （GitHub 直连可用；`raw.githubusercontent.com` 不通时用加速前缀取源码）。
- 装完自检：

  ```bash
  cd ~/project/github/whatsnext
  npm run verify                                        # 插件契约 + skill 完备性
  node scripts/verify-mounted.mjs ~/.dsh/profiles/web    # 真实 profile 里的注册与提示词投递
  ```

- 它**不在**插件市场的精选目录里（市场搜不到、也不能从市场装）——
  升级用 `git -C ~/project/github/whatsnext pull` 后重启。
- 分工与接续规则见 `skills/lignting/references/whatsnext-bridge.md`：
  `.lignting/`（随 git）存方案、`.whatsnext/`（私有）存任务状态。
