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

1. 把 `skills/lignting/` 整体复制到用户级目录：`~/.dsh/skills/lignting/`；
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

## ⚠️ 两份副本要同步

**用户级副本与仓库版不是软链，没有任何机制保证一致。**

DSH 实际加载的是**用户级**那份。改完仓库不复制过去，改了不生效——而且不会有任何报错，
只会表现为"新命令敲不出来 / 老流程还在跑"。

`npm run verify` 会逐文件比对两份并报出漂移，改动后跑一遍：

```bash
npm run check
```

修复方式：把 `skills/lignting/` 整体复制到 `~/.dsh/skills/lignting/`，
并删掉用户级里仓库已移除的文件。

> 用 `dsh plugin` 的本地链接方式安装时，仓库改动仍需手工同步——链接的是**插件代码**，
> 不是 skill 目录。

## 使用

主输入框直接输入 `/<命令> <参数>`，例如：

```
/lts 把项目从 A 模式重构为 B 模式
```

命令清单与跳层规则见 [commands.md](commands.md)。
