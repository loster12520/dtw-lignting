/**
 * lignting-explore —— dsh 0.2.1+ Agent Preset 体系下的探索子代理。
 *
 * 背景：新版本 @deepseek-ai/dsh-tool-subagent 移除了 persona / toolFilter
 * 配置（加载即报 no longer supported），子代理的人设与工具面必须改由
 * Agent Preset 声明，并用 agentPreset 选中。旧 profile 里的同步配置
 * （enableRunInBackground / backgroundMode）也随版本一起移除：所有委派
 * 现在都是后台托管，立即返回 child id，结果以完成通知回到对话。
 *
 * 本插件做两件事：
 *   1) 通过 ctx.agentPresets.register() 注册 preset lignting-explore；
 *   2) 注册模型可见工具 subagent_explore，固定 spawn provider、快速模型、
 *      maxDepth 1，并把 agentPreset 传给子代理。
 *
 * 与直接写 @deepseek-ai/dsh-agent-preset 行相比，这里的注册是同步的：
 * Host 加载 profile 时所有行并发激活，声明行要等 agentPresets 服务就绪后
 * 才在微任务里登记；若工具行先激活，加载期的 preset 校验会因找不到声明而
 * 失败。在本插件的 apply 里先注册 preset、再注册工具，可以消除这个竞态。
 */
const name = 'lignting-explore'


const inject = ['agentPresets', 'subagents', 'tools']

const PRESET_ID = 'lignting-explore'

const PERSONA = [
  '你是 lignting-explore，专职代码结构探索子代理（快速模型）。',
  '',
  '## 工具面',
  '- 你只能使用代码图谱工具 mcp__codegraph__codegraph_explore（profile 已把其余工具全部隐藏；',
  '  如果 profile 额外放开了其他 codegraph_* 工具，也只允许用这些）。',
  '- 不要尝试 grep / read / write / shell / 网络等其他工具：它们会调用失败并浪费步数。',
  '- 若 codegraph_explore 提示项目未索引（没有 .codegraph/），立即结束任务并原样报告该提示，',
  '  让上层要求用户运行 codegraph init -i；禁止改用其他手段继续探索。',
  '',
  '## 探索方式',
  '- 把任务里的模块名、符号名、文件路径或功能描述作为 query 调用 codegraph_explore；',
  '  它一次返回相关符号源码、调用链和影响面。',
  '- 需要更多上下文时换更精确的 query 继续调用 codegraph_explore（同一工具可多次调用），',
  '  不要转去读文件。',
  '',
  '## 输出',
  '只输出：符号名、文件路径、调用链、影响面/相关实现。',
  '不写结论、不给修改建议、不写代码、不复述任务。',
].join('\n')

/** 探索 preset：人设 + 压缩 + 工具收窄（只留 codegraph MCP 工具）。 */
function presetDefinition(presetId) {
  return {
    id: presetId,
    name: presetId,
    description: 'lignting 探索子代理：只看代码图谱工具（codegraph MCP）、快速模型',
    order: 20,
    plugins: [
      {
        id: 'persona',
        name: '@deepseek-ai/dsh-persona',
        config: { prefix: PERSONA },
      },
      {
        id: 'compaction',
        name: 'cordis:group',
        group: true,
        isolate: { compaction: true, toolResultPruner: true },
        config: [
          { id: 'compaction-basic', name: '@deepseek-ai/dsh-compaction-basic' },
          { id: 'command-compact', name: '@deepseek-ai/dsh-command-compact' },
          { id: 'tool-result-pruner', name: '@deepseek-ai/dsh-compaction-tool-result-pruner' },
        ],
      },
      {
        id: 'explore-tool-restrict',
        name: 'dsh-lignting/explore-restrict',
        config: { prefixes: ['mcp__codegraph__'] },
      },
    ],
  }
}

/** 模型可见工具定义（不依赖 @deepseek-ai/dsh-tools，直接给注册表可用的 JSON Schema）。 */
function toolDefinition({ ctx, presetId, provider, agentOptions, maxDepth }) {
  return {
    name: 'subagent_explore',
    description:
      'Delegate a focused code-structure exploration to a fresh subagent that only sees CodeGraph MCP tools ' +
      '(fast model). It does not see this conversation, so the prompt must be self-contained. ' +
      'This tool starts an independently managed subagent and immediately returns its id. ' +
      'The runtime notifies you when it finishes; the child reports results with send_message. ' +
      'Use send_message to steer it while running or continue its conversation after it finishes.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        cwd: {
          type: 'string',
          description:
            'Initial child working directory. Relative paths use your current directory; omitted inherits it. ' +
            'Later directory changes in either agent are independent.',
        },
        description: {
          type: 'string',
          description: 'A short (3-5 word) description of the delegated task, for display.',
        },
        prompt: {
          type: 'string',
          description:
            'The complete, self-contained exploration task. Name the modules, symbols, files, or behavior to map; ' +
            'do not assume the child can see this conversation.',
        },
      },
      required: ['description', 'prompt'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          kind: { type: 'string', const: 'activation' },
          subagentId: { type: 'string' },
        },
        required: ['kind', 'subagentId'],
      },
      render: (_args, value) => [{ type: 'text', text: 'started subagent ' + value.subagentId }],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const parent = exec.agent
      if (!parent) throw new Error('subagent_explore requires a calling agent (exec.agent was undefined)')
      const limit = ctx.subagents.resolveMaxDepth(maxDepth)
      const request = {
        ...(args.cwd === undefined ? {} : { cwd: args.cwd }),
        prompt: [{ type: 'text', text: args.prompt }],
        parent,
        agentPreset: presetId,
        ...(agentOptions === undefined ? {} : { agentOptions }),
        ...(limit === undefined ? {} : { maxDepth: limit }),
      }
      const activation = await ctx.subagents.startActivation({
        provider,
        label: args.description,
        request,
        signal: exec.signal,
        delivery: 'parent',
      })
      return { kind: 'activation', subagentId: activation.childId }
    },
  }
}

function apply(ctx, config = {}) {
  const presetId = config.preset ?? PRESET_ID
  const provider = config.provider ?? 'spawn'
  const agentOptions = config.agentOptions ?? {
    provider: 'deepseek-official',
    model: 'deepseek-v4-flash',
  }
  const maxDepth = config.maxDepth ?? 1

  let disposed = false
  let unregisterPreset
  let presetReady = false
  let disposeTool

  // 1) 注册 preset。register() 在返回 promise 前已同步写入定义表，
  //    因此随后注册的工具在加载期校验时一定能读到它。
  const pending = ctx.agentPresets.register(presetDefinition(presetId))
  pending.then(
    (unregister) => {
      if (disposed) {
        unregister()
        return
      }
      unregisterPreset = unregister
      presetReady = true
      ctx.logger.info('lignting-explore: agent preset "' + presetId + '" registered')
      mount()
    },
    (error) => ctx.logger.error(error),
  )

  // 2) 注册工具（provider 出现后才注册，provider 卸载时移除，和官方工具一致）。
  function mount() {
    if (disposed || !presetReady || disposeTool !== undefined) return
    if (ctx.subagents.getProvider(provider) === undefined) return
    disposeTool = ctx.tools.register(toolDefinition({ ctx, presetId, provider, agentOptions, maxDepth }))
    ctx.logger.info('lignting-explore: tool "subagent_explore" registered (provider=' + provider + ')')
  }
  function unmount() {
    if (disposeTool === undefined) return
    disposeTool()
    disposeTool = undefined
  }
  ctx.on('subagent/provider-added', (subagentProvider) => {
    if (subagentProvider.name === provider) mount()
  })
  ctx.on('subagent/provider-removed', (removed) => {
    if (removed === provider) unmount()
  })

  ctx.effect(
    () => () => {
      disposed = true
      unmount()
      if (unregisterPreset !== undefined) unregisterPreset()
    },
    'lignting-explore lifecycle',
  )

  if (ctx.subagents.getProvider(provider) !== undefined) mount()
}

export { apply, inject, name }