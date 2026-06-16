<template>
  <div class="mc-markdown-render" :class="themeClass">
    <component :is="markdownContent" />
  </div>
  <div v-if="false">
    <slot name="actions"></slot>
    <slot name="header"></slot>
    <slot name="content"></slot>
  </div>
</template>

<script setup lang="ts">
// ── 依赖引入 ──────────────────────────────────────────────────────────────────
import hljs from 'highlight.js';                          // 代码语法高亮库
import markdownit from 'markdown-it';                     // Markdown 解析器
import type Token from 'markdown-it/lib/token.mjs';      // Token 类型（markdown-it v14+ ESM）
import { Fragment, type VNode, computed, createTextVNode, h, nextTick, onMounted, ref, useSlots, watch } from 'vue';
import CodeBlock from './CodeBlock.vue';                  // 代码块子组件（带复制/折叠/Mermaid）
import { MDCardService } from '@matechat/common/MarkdownCard/common/MDCardService';  // XSS过滤服务
import { mdCardProps } from './mdCard.types';             // Props 定义（见 mdCard.types.ts）
import { type CodeBlockSlot, defaultTypingConfig, type ASTNode } from '@matechat/common/MarkdownCard/common/mdCard.types';
import { htmlToVNode } from './MDCardParser';             // HTML字符串 → VNode 转换工具
import { tokensToAst, isValidTagName } from '@matechat/common/MarkdownCard/common/parser'; // Token→AST 和标签校验
import { useMarkdownCardFoundation } from './useMarkdownCardFoundation'; // Foundation 适配层

// ── 实例创建 ──────────────────────────────────────────────────────────────────

// MDCardService：封装了 XSS 过滤逻辑，支持动态修改白名单和注册 markdown-it 插件
const mdCardService = new MDCardService();

// Props：从 mdCard.types.ts 导入的完整 props 定义
// mdCardProps 的嵌套对象结构（typingOptions）与 Vue 的 ComponentObjectPropsOptions
// 索引签名存在冲突，需要 as any 转型；运行时行为完全正确，这是纯类型层面的限制
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const props = defineProps(mdCardProps as any);

// Emits：
//  afterMdtInit → 组件挂载后把 mdt 实例暴露给父组件（父组件可以进一步配置）
//  typingStart  → 打字机动画开始
//  typing       → 打字机每推进一步触发
//  typingEnd    → 打字机动画结束
const emit = defineEmits(['afterMdtInit', 'typingStart', 'typing', 'typingEnd']);

// useSlots：获取父组件传入的 slot（actions/header/content），用于代码块的自定义渲染
const slots = useSlots();

// timer：打字机定时器句柄，用于清除上一次的动画（content 更新时需要重置）
let timer: ReturnType<typeof setTimeout> | null = null

// ── markdown-it 实例配置 ──────────────────────────────────────────────────────
// 配置说明：
//  breaks:true   → 单个换行符 → <br>（AI 回答常用短句换行）
//  linkify:true  → 自动把纯文本 URL 转成可点击链接
//  html:true     → 允许 Markdown 里内联 HTML（配合 MDCardService XSS 过滤使用）
//  highlight     → 代码块语法高亮回调：用 hljs 着色，失败返回空串让 md-it 自己处理
//  ...props.mdOptions → 允许外部通过 prop 覆盖任意配置项
// MarkdownIt 实例类型：markdownit() 返回值
type MarkdownIt = ReturnType<typeof markdownit>

const mdt: MarkdownIt = markdownit({
  breaks: true,
  linkify: true,
  html: true,
  highlight: (str: string, lang: string) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (_) { }
    }
    return ''; // 未知语言：返回空串，让 markdown-it 用默认方式转义
  },
  ...props.mdOptions,
});

// Foundation 实例：包含 isToken/getThinkContent/parseTypingContent 等业务方法
const { foundation } = useMarkdownCardFoundation({ props, emit });

// ── 响应式状态 ────────────────────────────────────────────────────────────────

// typingIndex：打字机当前显示到第几个字符（从 0 到 content.length）
const typingIndex = ref(0)

// isTyping：是否正在执行打字机动画（true 时 parseContent 会截取内容）
const isTyping = ref(false)

// markdownContent：最终渲染的 VNode（Fragment 包裹的 VNode 树），绑定到 <component :is>
const markdownContent = ref<VNode>();

// ── 核心渲染函数 ──────────────────────────────────────────────────────────────

/**
 * parseContent：把 props.content 解析成 VNode 树并更新 markdownContent。
 * 这是整个组件最核心的函数，每次内容变化都会调用它。
 *
 * 处理流程：
 *  1. 打字机模式：截取 content 到 typingIndex 位置，并附加光标效果
 *  2. think 块处理：把 <think>...</think> 替换为 <div class="mc-think-block">
 *  3. mdt.parse()：Markdown → Token 数组（词法分析）
 *  4. tokensToAst()：Token 数组 → AST（语法树，处理嵌套结构）
 *  5. astToVnodes()：AST → VNode 数组（可被 Vue diff 算法处理）
 *  6. h(Fragment, vnodes)：把 VNode 数组包进 Fragment（多根节点容器）
 */
const parseContent = () => {
  let content = props.content || '';

  // 打字机模式：截取到当前显示位置，并根据 style 附加光标效果
  if (props.typing && isTyping.value) {
    content = props.content.slice(0, typingIndex.value) || '';
    const options = { ...defaultTypingConfig, ...props?.typingOptions };

    if (options.style === 'cursor') {
      // cursor 样式：末尾加竖线光标 |
      content += `<span class="mc-typewriter mc-typewriter-cursor">|</span>`;
    } else if (options.style === 'color' || options.style === 'gradient') {
      // color/gradient 样式：末尾 5 个字符高亮（模拟"正在打出"的感觉）
      content = content.slice(0, -5) + `<span class="mc-typewriter mc-typewriter-${options.style}">${content.slice(-5)}</span>`;
    }
  }

  // think 块处理：把 <think>...</think> 转成 CSS 可以控制的 <div>
  if (props.enableThink) {
    content = foundation.getThinkContent(content, props.thinkOptions);
  }

  // 解析流程：Markdown → Token → AST → VNode
  const tokens = mdt.parse(content, {});      // Token 数组（扁平）
  const ast = tokensToAst(tokens);            // AST（嵌套树）
  const vnodes = astToVnodes(ast);            // VNode 数组
  markdownContent.value = h(Fragment, vnodes); // 更新渲染内容
};

/**
 * astToVnodes：把 AST 节点数组转成 VNode 数组。
 * 就是对每个节点调用 processASTNode，收集结果。
 */
const astToVnodes = (nodes: ASTNode[]): VNode[] => {
  return nodes.map(node => processASTNode(node));
}

/**
 * isASTNode：类型守卫，通过 'nodeType' 属性区分 ASTNode 和 Token。
 * ASTNode 有 nodeType / openNode / children / vNodeKey，Token 没有。
 */
function isASTNode(node: ASTNode | Token): node is ASTNode {
  return 'nodeType' in node
}

/**
 * processASTNode：处理单个 AST 节点，返回对应的 VNode。
 * 是整个 AST 遍历的入口，根据节点类型分发到不同的处理函数。
 *
 * 节点类型分支：
 *  1. html_inline / html_block → 内联 HTML，经 XSS 过滤后转 VNode
 *  2. inline → 行内混合内容（加粗、链接、代码等），用 md-it renderer 渲染
 *  3. Token（叶节点）→ processToken 处理
 *  4. ASTNode（容器节点）→ processASTNodeInternal 递归处理
 */
const processASTNode = (node: ASTNode | Token): VNode => {
  if (isASTNode(node)) {
    // HTML 节点（来自 Markdown 里直接写的 <div>、<table> 等）
    if (node.nodeType === 'html_inline' || node.nodeType === 'html_block') {
      const filteredContent = mdCardService.filterHtml(node.openNode?.content || '');
      const vNodes = htmlToVNode(filteredContent);

      if (!vNodes || vNodes.length === 0) {
        return h('span', filteredContent); // 降级：直接显示文本
      }

      // 把子节点合并进来，支持 HTML 块内嵌套 Markdown 子节点的情况
      const processedVNodes = vNodes.map(vNode => {
        if (typeof vNode === 'string') {
          return h('span', vNode);
        }
        const children = node.children.map((child: ASTNode | Token) => processASTNode(child));
        if (Array.isArray(vNode.children)) {
          vNode.children = [...vNode.children, ...children];
        } else {
          // vNode.children 可能是 string/null 等非数组值，展开后过滤空值再合并
          vNode.children = [vNode.children, ...children].filter(Boolean) as VNode[];
        }
        return vNode;
      });

      return h(Fragment, processedVNodes);
    }

    // inline 节点：用 markdown-it 的 renderer 输出 HTML，再转 VNode
    if (node.nodeType === 'inline') {
      const html = mdt.renderer.render([node.openNode!], mdt.options, {});
      const filteredHtml = mdCardService.filterHtml(html);
      const vNodes = htmlToVNode(filteredHtml);
      return h(Fragment, vNodes);
    }

    // 容器节点（ASTNode）
    return processASTNodeInternal(node);
  }

  // 叶节点（Token）
  return processToken(node);
}

/**
 * processToken：处理叶节点 Token，返回 VNode 或字符串。
 *
 * markdown-it 的 Token 类型说明：
 *  - 'text'       → 纯文本，直接返回字符串
 *  - 'inline'     → 行内内容（含加粗/链接等），用 md-it renderer 渲染
 *  - 'fence'      → 代码块（``` 包裹），渲染为 CodeBlock 组件
 *  - 'softbreak'  → 软换行（单个回车），breaks:true 时转 <br>
 *  - 'html_block/html_inline' → 内联 HTML，经 XSS 过滤后用 innerHTML 设置
 *  - 'math_block' → 数学公式（$$），用 md-it renderer 渲染
 *  - 其他有 tag 的 → 用 h() 创建对应的 HTML 元素
 */
const processToken = (token: Token): VNode => {
  if (token.type === 'text') {
    return createTextVNode(token.content); // 纯文本包装为文本 VNode
  }

  if (token.type === 'inline') {
    return processInlineToken(token); // 行内内容
  }

  if (token.type === 'fence') {
    return processFenceToken(token); // 代码块 → CodeBlock 组件
  }

  if (token.type === 'softbreak') {
    // breaks:true → <br>；breaks:false → 换行符（浏览器默认折叠空白，效果等同无换行）
    return mdt.options.breaks ? h('br') : createTextVNode('\n');
  }

  if (token.type === 'html_block' || token.type === 'html_inline') {
    // 内联 HTML：XSS 过滤后用 innerHTML 插入（不做 VNode 解析，保留原始结构）
    const filteredContent = mdCardService.filterHtml(token.content);
    return token.type === 'html_block'
      ? h('div', { innerHTML: filteredContent })
      : h('span', { innerHTML: filteredContent });
  }

  if (token.type === 'math_block' && token.markup === '$$') {
    // 数学公式：用 md-it renderer 输出（需要安装 markdown-it-katex 等插件支持）
    const html = mdt.renderer.render([token], mdt.options, {});
    const filteredHtml = mdCardService.filterHtml(html);
    const vNode = htmlToVNode(filteredHtml);
    return h(Fragment, vNode);
  }

  // 有 tag 属性的 Token（如 <strong>、<em>）→ 创建对应 HTML 元素
  if (token.tag) {
    const tagName = isValidTagName(token.tag) ? token.tag : 'div'; // 非法标签降级为 div
    const attrs = convertAttrsToProps(token.attrs || []);
    // vNodeKey 是 parser.ts 在运行时通过 (tok as any).vNodeKey = ... 动态添加的
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return h(tagName, { ...attrs, key: (token as any).vNodeKey }, token.content);
  }

  return createTextVNode(token.content); // 兜底：返回文本 VNode
}

/**
 * processInlineToken：处理行内混合内容（加粗、斜体、链接、行内代码等）。
 * 直接用 markdown-it renderer 把 token 渲染成 HTML，再转 VNode。
 */
const processInlineToken = (token: Token): VNode => {
  const html = mdt.renderer.render([token], mdt.options, {});
  const filteredHtml = mdCardService.filterHtml(html);
  const vNodes = htmlToVNode(filteredHtml);
  return h(Fragment, vNodes);
}

/**
 * processASTNodeInternal：处理容器类 ASTNode（段落、标题、列表项等）。
 * 与 processToken 的区别：ASTNode 有子节点，需要递归处理。
 *
 * 特殊情况：
 *  - fence 类型 → 转给 processFenceToken 生成 CodeBlock 组件
 *  - table → 用 div 包裹（方便加水平滚动条，防止表格超宽撑破布局）
 */
const processASTNodeInternal = (node: ASTNode): VNode => {
  let tagName = 'div'; // 默认标签
  if (node.openNode?.tag && isValidTagName(node.openNode?.tag)) {
    tagName = node.openNode?.tag;
  }
  const attrs = convertAttrsToProps(node.openNode?.attrs || []);

  // fence（代码块）特殊处理 → CodeBlock 组件
  if (node.openNode?.type === 'fence') {
    return processFenceToken(node.openNode);
  }

  // 有 tag 的节点：递归处理子节点，创建对应 HTML 元素
  if (node.openNode?.tag) {
    const tagName = isValidTagName(node.openNode?.tag) ? node.openNode?.tag : 'div';
    const children = node.children.map((child: ASTNode | Token) => processASTNode(child)); // 递归
    const attrs = convertAttrsToProps(node.openNode?.attrs || []);
    const vNode = h(tagName, { ...attrs, key: node.vNodeKey }, children);

    // table 特殊处理：用 div 包裹，方便加 overflow-x:auto
    if (tagName === 'table') {
      return h('div', { className: 'mc-table-container', key: `${node.vNodeKey}-table-container` }, [vNode]);
    }
    return vNode;
  }

  // 无 tag：用默认 div，递归处理子节点
  const children = node.children.map((child: ASTNode | Token) => processASTNode(child));
  return h(tagName, { ...attrs, key: node.vNodeKey }, children);
}

/**
 * processFenceToken：处理代码块 Token，渲染为 CodeBlock Vue 组件。
 *
 * 为什么要单独渲染成组件（而不是 <pre><code>）？
 * 因为 CodeBlock.vue 提供了：
 *  - 语言标识显示
 *  - 一键复制（带"已复制"反馈）
 *  - 折叠/展开动画
 *  - Mermaid 流程图渲染
 *
 * token.info 是语言标识字符串（如 "python"），
 * 但打字机动画时可能包含 <span> 标签（光标效果），需要清理掉。
 */
const processFenceToken = (token: Token): VNode => {
  // 清理语言标识里可能混入的打字机 span 标签
  const language = token.info?.replace(/<span\b[^>]*>/i, '').replace('</span>', '') || '';
  const code = token.content;
  // tokenIndex 是 parser.ts 在运行时通过 (tok as any).tokenIndex = idx 动态添加的
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createCodeBlock(language, code, (token as any).tokenIndex);
}

/**
 * convertAttrsToProps：把 markdown-it Token 的属性数组转成 Vue h() 的 props 对象。
 *
 * markdown-it Token.attrs 格式：[['href', 'https://...'], ['class', 'link'], ...]
 * Vue h() props 格式：{ href: 'https://...', class: 'link', ... }
 */
const convertAttrsToProps = (attrs: [string, string][]): Record<string, string> => {
  return attrs.reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
}

// ── watch：enableThink / thinkOptions / theme 变化时重新渲染 ──────────────────
// theme 变化影响代码块的高亮主题，enableThink/thinkOptions 影响 think 块的渲染
watch(
  () => [props.enableThink, props.thinkOptions?.customClass, props.theme],
  () => { parseContent(); }
);

/**
 * createCodeBlock：用 h() 函数创建一个 CodeBlock 组件的 VNode。
 *
 * @param language  代码语言（如 'python'、'javascript'）
 * @param code      代码内容
 * @param blockIndex 代码块在整个文档中的序号（用作 key，帮助 Vue diff）
 *
 * 关于 codeBlockSlots：
 *  父组件可以通过 #actions、#header、#content slot 自定义代码块的头部和操作按钮。
 *  这里把父组件的 slot 透传给 CodeBlock，并且注入 codeBlockData（含 code 和 language）。
 *  如果父组件没有传对应 slot，就用 undefined（CodeBlock 会显示默认样式）。
 */
const createCodeBlock = (language: string, code: string, blockIndex: number) => {
  const codeBlockSlots: CodeBlockSlot = {
    actions: slots.actions
      ? () => slots.actions?.({ codeBlockData: { code, language } }) || null
      : undefined,
    header: slots.header
      ? () => slots.header?.({ codeBlockData: { code, language } }) || null
      : undefined,
    content: slots.content
      ? () => slots.content?.({ codeBlockData: { code, language } }) || null
      : undefined,
  };
  return h(
    CodeBlock,
    {
      language,
      code,
      blockIndex,
      theme: props.theme,
      enableMermaid: props.enableMermaid,
      mermaidConfig: props.mermaidConfig,
      key: `code-block-${blockIndex}`,  // key 防止 Vue diff 复用错误的代码块实例
    },
    codeBlockSlots,
  );
};

/**
 * typewriterStart：启动打字机动画。
 * 通过 setTimeout 递归调用，每次推进 step 个字符，直到显示完毕。
 *
 * 动画机制：
 *  1. 设 isTyping=true，parseContent 会截取 content 到 typingIndex 位置
 *  2. typingStep 每帧：typingIndex += step → parseContent → 等待 interval ms
 *  3. typingIndex >= content.length → typewriterEnd
 *
 * clearTimeout(timer!)：先清除上一次动画，防止 content 频繁更新时动画堆叠
 */
const typewriterStart = () => {
  clearTimeout(timer!) // 取消上一次还未执行的 typingStep

  isTyping.value = true;
  emit('typingStart');
  const options = { ...defaultTypingConfig, ...props?.typingOptions };

  const typingStep = () => {
    // step 支持 [min, max] 随机范围，让速度有自然抖动
    let step = options.step;
    if (Array.isArray(options.step)) {
      step = options.step[0] + Math.floor(Math.random() * (options.step[1] - options.step[0]));
    }
    typingIndex.value += step;
    parseContent();    // 重新渲染到当前位置
    emit('typing');    // 通知父组件打字机推进了

    if (typingIndex.value >= props.content!.length) {
      typewriterEnd();  // 全部显示完毕
      parseContent();   // 最后再渲染一次确保完整
      return;
    }

    timer = setTimeout(typingStep, options.interval); // 等待 interval ms 后继续
  }

  timer = setTimeout(typingStep); // 第一帧
}

// ── watch：content 变化时的核心 watch ─────────────────────────────────────────
// 这是整个组件最重要的 watch，驱动内容更新。
watch(
  () => props.content,
  (newVal, oldVal) => {
    console.log('Content changed:', { newVal, oldVal });
    // typing=false（普通模式）：直接全量渲染
    if (!props.typing) {
      typingIndex.value = newVal?.length || 0; // 跳到末尾，不截取
      parseContent();
      return;
    }

    // typing=true（打字机模式）：
    // 如果新内容不是旧内容的延伸（说明是全新内容，比如切换了对话），
    // 则重置打字机到起点
    if (newVal.indexOf(oldVal) === -1) {
      typingIndex.value = 0;
    }

    // nextTick 确保 Vue 更新 DOM 后再启动动画（避免和渲染周期冲突）
    nextTick(() => typewriterStart())
  },
  { immediate: true }, // 组件首次渲染时立即执行一次
)

/**
 * typewriterEnd：打字机动画结束，恢复正常状态。
 * isTyping=false 后，parseContent 不再截取内容，会渲染完整文本。
 */
const typewriterEnd = () => {
  isTyping.value = false;
  emit('typingEnd');
}

// ── watch：customXssRules 变化时更新 MDCardService 的白名单 ──────────────────
// 父组件可以动态调整 XSS 规则（如允许 iframe），变化后立即重新渲染
watch(
  () => props.customXssRules,
  (rules) => {
    mdCardService.setCustomXssRules(rules);
    parseContent();
  },
  { deep: false, immediate: true }, // immediate:true → 初始化时立即执行，加载初始规则
);

// ── watch：mdPlugins 变化时注册新插件 ────────────────────────────────────────
// 父组件可以动态添加 markdown-it 插件（如数学公式、emoji）
watch(
  () => props.mdPlugins,
  (plugins) => {
    mdCardService.setMdPlugins(plugins, mdt); // 把插件注册到 mdt 实例上
    parseContent();
  },
  { immediate: true, deep: false },
);

/**
 * themeClass：根据 theme prop 返回对应的 CSS class。
 * mc-markdown-render-light / mc-markdown-render-dark
 * CodeBlock 组件内用 @use sass 动态加载对应的 highlight.js 主题 CSS。
 */
const themeClass = computed(() => {
  return props.theme === 'dark'
    ? 'mc-markdown-render-dark'
    : 'mc-markdown-render-light';
});

// ── 生命周期 ──────────────────────────────────────────────────────────────────

// onMounted：组件挂载后把 mdt 实例通过 emit 传给父组件
// 父组件可以拿到 mdt 实例后继续配置（如添加自定义 renderer rule）
onMounted(() => {
  emit('afterMdtInit', mdt);
});

// defineExpose：把 mdt 实例暴露给通过 ref 访问此组件的父组件
// 父组件用 const mdCardRef = ref(); mdCardRef.value.mdt 就能拿到 mdt 实例
defineExpose({ mdt });
</script>

<style scoped lang="scss">
@import "devui-theme/styles-var/devui-var.scss";
@import "@matechat/common/Base/vue.scss";
@import "@matechat/common/MarkdownCard/common/markdown.scss";
@import "@matechat/common/MarkdownCard/common/mdCard.scss";
</style>
