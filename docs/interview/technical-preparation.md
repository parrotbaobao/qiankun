# 技术讲述与常见追问

## 开场顺序

每个项目按背景／已有功能 → 自己职责 → 技术实现 → 一个具体难点 → 结果 → 可改进处（有真实或明确设想才讲）。开场一到两分钟；追问再展开方法名和数据，不把全部细节塞进开场。

## API Explorer 固定口述骨架

平台面向华为云开发者，提供 API 文档、表单化参数、在线调用和错误码查询。前期负责部分 API 前端接入维护和定制需求，后期微前端与 API 编排从零建设。基于 qiankun 将主应用与三个 Angular 子应用集成，处理路由、公共通信、独立运行。编排复用内部图组件，负责节点参数、分支配置、提交及回显，实际执行由后端完成。

记忆顺序：平台用途 → API接入 → 微前端 → 编排。最新数量三个子应用，不照抄旧固定稿的四个。

## Prompt 正常请求：当前本地代码口述

点击发送先判断忙碌状态与空输入，把用户消息加入列表。startReply 创建空 AI 消息和轮次记录，构造历史及模型参数，再 createChatStream。

createChatStream 创建状态机，订阅页面 onStateChange，发送 connect 后由 createSseSource 发 POST SSE。onopen 检查响应状态和 Content-Type，连接成功仍等待文字。onmessage 交给协议适配器解析；首段文本触发 firstChunk，状态进入 streaming。每段增量累计 fullText，再直接 onText(fullText) 更新目标消息。Vue 将累计 content 传给 Markdown 组件，组件负责渲染与打字效果。

收到业务完成信号触发 complete→done，清理请求和监听，再 onDone。当前已删除业务自写打字机：不再等待 queueDrained。done 表示业务接收完成，不保证组件动画已结束。

## 当前本地文件职责

- ai-workspace/src/views/MatechatComponent.vue：handleSubmit 输入检查；startReply 建 AI 占位和轮次、参数、页面回调；handleRoundState 将状态映射到页面和消息，同时管理终态轮次引用。
- ai-workspace/src/services/chat/create-chat-stream.ts：协调请求、协议适配、全文累计、状态、清理。不是框架必备层，但多个调用页面可复用。
- ai-workspace/src/services/chat/sse-source.ts：fetchEventSource 实际请求、响应检查、重试、取消；不解析模型业务字段。
- ai-workspace/src/services/chat/openai-stream-adapter.ts：data→text/complete/error/ignore，当前OpenAI兼容协议。
- ai-workspace/src/services/chat/state-machine.ts：ChatState状态、ChatEvent事件、transition计算、send保存并通知、subscribe保存回调、dispose销毁。
- ai-workspace/src/services/chat.service.ts 与 chat/index.ts：页面入口，导出页面需要的函数和类型。
- tests/chat-state-machine.test.mjs：Node内置测试，.mjs表示ES模块，不是业务必须后缀。

## 状态机的讲解重点

kind 标记当前状态，type 标记事件，都是自定义字段名。transition(current,event) 只计算下一状态；send保存结果，有变化才通知。状态和事件分开，是因为同一个事件在不同状态下处理不同，比如停止后忽略迟到文字。

页面传入 onStateChange，协调层 sm.subscribe(options.onStateChange)，subscribe把函数保存在Set。send调用保存的函数，页面handleRoundState更新roundState、消息loading/status。文字onText是直接回调，不走状态机订阅集合；onError/onDone也直接调用。当前主要一个状态接收方，多观察者并未被多处使用，单回调也是可行替代。

已删未用on()、ChatStateOf、stream.state外部入口、自定义adapter选项、多余桶导出；内部sm.state保留。已删事件排队events/while/dispatching，避免为假设重入场景过度设计。勿重新讲它们为当前实现。

handleRoundState不只是动画：同步页面交互与消息状态，还安排清除activeRound。queueMicrotask在终态延后清除，避免同步回调顺序干扰；具体重构前应核对onError/onDone依赖轮次检查的时序，不随口断言可直接删除。

## 常见追问

- 停止：AbortController.abort，保留内容；服务端是否停需取消传播，不因前端abort断言模型已停。
- 非正常关闭：没有业务完成就断流，不能当正常完成；完成标志依协议。
- 重试：网络重试和重新生成区分；重复POST可能重启生成、产生重复内容或成本，默认策略以源码为准，不声称幂等。
- 全文累计：增量是“你好”“世界”，组件content要“你好世界”；页面赋值累计全文，不能再追加一遍。
- 回调不等于异步：网络等待异步，parse/累计/调用onText同步；Vue批量DOM更新和组件动画有独立调度。
- Markdown tokens/AST/VNode不等于增量解析。未闭合代码块能否渲染取决于解析器行为，不能从token名推断。

## 评审／报表／Provider代码口述

评审：公共基类固定公共步骤，各类型填充差异；模板方法是一种组织方式，不背未经核实的示例方法名。后端字段映射可在适配层转换，但不宣称历史必有完整适配器。

报表：固定后端结构→统一转换→图表option/表格行列→setOption；图表切表格。组件初始化与resize是否内部完成待核实。滚动懒加载作为改进设想。

Provider：模块provide抽象Service，useClass具体实现；组件constructor注入抽象Service，读取开关。懒加载模块有独立注入范围，普通模块导入不自动按路由隔离。具体项目链路见事实文档。

## 简历与表达原则

状态机用户已明确确认存在，不要每次又撤回为不确定；不确定的是原始代码细节。性能24%只能用团队年度预测口径。所有本地重构保护、指标、通用优化例子不得升级为历史经历。简历已定稿，学习重心是可解释实现，而非继续堆技术词。
