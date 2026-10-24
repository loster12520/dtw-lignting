/**
 * lignting-explore-restrict —— 在 Agent Preset scope 里收窄子代理可见的工具。
 *
 * 新版本把 toolFilter 从 @deepseek-ai/dsh-tool-subagent 移除了，工具面只能由
 * preset 组合决定；但 Host 级挂载的 MCP 工具（codegraph / figma 等）会被所有
 * agent 继承，preset 只增不减。这个插件在 preset scope 注册
 * ctx.tools.restrict({ allow })，把继承来的全局工具收敛到指定前缀。
 *
 * 时序：preset 在 boot 时立即挂载，而 MCP 工具是客户端连上后才同步进注册表，
 * 所以第一次 restrict 可能因 unknown global tool 失败。这里监听 root 的
 * tools/change，等目标工具出现后再收窄；工具集合变化时重新计算。
 */
const name = 'lignting-explore-restrict'


const inject = ['tools']

function apply(ctx, config = {}) {
  const prefixes =
    Array.isArray(config.prefixes) && config.prefixes.length > 0 ? config.prefixes : ['mcp__codegraph__']

  let disposeRestriction
  let appliedKey = ''
  // restrict()/dispose() 自身也会触发 tools/change；不清标记就重入会反复重建限制。
  let syncing = false

  function sync() {
    if (syncing) return
    const allow = ctx.tools
      .schemas()
      .map((schema) => schema.name)
      .filter((toolName) => prefixes.some((prefix) => toolName.startsWith(prefix)))
    if (allow.length === 0) return

    const key = allow.slice().sort().join(',')
    if (key === appliedKey) return

    syncing = true
    try {
      const previous = disposeRestriction
      disposeRestriction = undefined
      if (previous !== undefined) previous()
      disposeRestriction = ctx.tools.restrict({ allow })
      appliedKey = key
      ctx.logger.info(
        'lignting-explore: tool surface narrowed to ' + allow.length + ' tool(s): ' + allow.join(', '),
      )
    } catch (error) {
      // 目标工具还没注册（MCP 客户端启动中）；下一次 tools/change 再试。
      ctx.logger.debug(
        'lignting-explore: waiting for global tools: ' +
          (error instanceof Error ? error.message : String(error)),
      )
    } finally {
      syncing = false
    }
  }

  sync()
  const off = ctx.root.on('tools/change', sync)
  ctx.effect(
    () => () => {
      off()
      disposeRestriction?.()
      disposeRestriction = undefined
      appliedKey = ''
    },
    'lignting-explore tool restriction',
  )
}

export { apply, inject, name }