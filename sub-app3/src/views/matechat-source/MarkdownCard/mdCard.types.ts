/**
 * mdCard.types.ts
 * MarkdownCard 组件的 Props 定义文件。
 *
 * Vue 的 Props 有两种写法：
 *  - defineProps<{ content: string }>()  → TypeScript 泛型写法（运行时不保留类型信息）
 *  - defineProps({ content: { type: String } }) → 对象写法（运行时可做类型校验+默认值）
 * 这里用对象写法，是因为 matechat 同时支持 Angular 版本，类型定义需要跨框架共享。
 */

// 从 @matechat/common 引入类型定义（这些类型被 matechat 的 Angular 和 Vue 版本共用）
import type {
  CustomXssRule,    // 自定义 XSS 规则：{ key: 标签名, value: 允许的属性数组 }
  MdPlugin,         // markdown-it 插件：{ plugin: 插件函数, opts: 插件参数 }
  MermaidConfig,    // Mermaid 流程图配置：{ theme: 'default' | 'dark' | ... }
  Theme,            // 主题类型：'light' | 'dark'
  TypingStyle,      // 打字机光标样式：'normal' | 'cursor' | 'color' | 'gradient'
} from '@matechat/common/MarkdownCard/common/mdCard.types';
import type { Options } from 'markdown-it';  // markdown-it 本身的配置项类型
import type { PropType } from 'vue';          // Vue 的 PropType 工具类型，用于复杂类型的运行时声明

/**
 * mdCardProps：MarkdownCard 组件的完整 Props 定义对象。
 * 在 mdCard.vue 里通过 defineProps(mdCardProps) 使用。
 */
export const mdCardProps = {

  // ── 核心内容 ────────────────────────────────────────────────────────────────

  /** 要渲染的 Markdown 字符串，AI 流式输出时会不断更新这个值 */
  content: {
    type: String,
    default: '',
  },

  // ── 打字机动画 ──────────────────────────────────────────────────────────────

  /**
   * 是否开启内置打字机动画。
   * true  → 组件自己控制字符一个个显示（适合展示历史消息时的"回放"效果）
   * false → 直接渲染完整内容（适合实时流式输出，外层已经在逐步追加 content）
   */
  typing: {
    type: Boolean,
    default: false,
  },

  // ── DeepSeek 推理内容 ────────────────────────────────────────────────────────

  /**
   * 是否开启 <think> 块处理（DeepSeek 等模型的推理内容）。
   * true → Foundation 会把 <think>...</think> 替换为 <div class="mc-think-block">
   *        CSS 里给这个 class 加灰色斜体样式，视觉上区分推理过程和正式回答。
   */
  enableThink: {
    type: Boolean,
    default: false,
  },

  /**
   * 打字机动画的详细配置（typing=true 时生效）。
   */
  typingOptions: {
    /** 每次推进的字符数（支持 [min, max] 范围随机，让速度更自然） */
    step: {
      type: Number,
      default: 2,
    },
    /** 每步之间的时间间隔 ms（支持 [min, max] 随机抖动） */
    interval: {
      type: [Number, Array] as PropType<number | [number, number]>,
      default: 60,
    },
    /**
     * 光标样式：
     *  - 'normal'   → 字符直接出现，无额外效果
     *  - 'cursor'   → 末尾显示竖线光标 |
     *  - 'color'    → 末尾 5 个字符有特殊颜色高亮
     *  - 'gradient' → 末尾 5 个字符渐变高亮
     */
    style: {
      type: String as PropType<TypingStyle>,
      default: 'normal',
    },
  },

  /**
   * think 块的样式配置（enableThink=true 时生效）。
   * customClass 允许外部传入自定义 class 覆盖默认的 mc-think-block 样式。
   */
  thinkOptions: {
    customClass: {
      type: String,
      default: '',
    },
  },

  // ── markdown-it 扩展 ─────────────────────────────────────────────────────────

  /**
   * 传给 markdown-it 实例的原始配置项（会被 spread 合并到默认配置上）。
   * 例如：{ breaks: false } 可以关掉单换行转 <br>。
   */
  mdOptions: {
    type: Object as PropType<Options>,
    default: () => ({}),
  },

  /**
   * 动态注册的 markdown-it 插件数组。
   * 每个元素：{ plugin: 插件函数, opts: 插件参数 }
   * 例如：[{ plugin: markdownItKatex, opts: {} }] 可以支持数学公式渲染。
   */
  mdPlugins: {
    type: Array as PropType<Array<MdPlugin>>,
    default: () => [],
  },

  // ── XSS 安全 ────────────────────────────────────────────────────────────────

  /**
   * 自定义 XSS 白名单规则（会追加到 MDCardService 的默认白名单上）。
   * 每个元素：{ key: 标签名, value: 允许的属性数组 }
   * value=null 表示删除该标签的白名单（彻底禁止该标签）。
   * 例如：[{ key: 'iframe', value: ['src'] }] 可以放行带 src 属性的 iframe。
   */
  customXssRules: {
    type: Array as PropType<Array<CustomXssRule>>,
    default: () => [],
  },

  // ── 主题 ────────────────────────────────────────────────────────────────────

  /**
   * 代码高亮主题：
   *  - 'light' → 使用 a11y-light 主题（浅色背景）
   *  - 'dark'  → 使用 a11y-dark 主题（深色背景）
   * CodeBlock.vue 里通过 @use sass 动态加载对应的 highlight.js CSS。
   */
  theme: {
    type: String as PropType<Theme>,
    default: 'light',
  },

  // ── Mermaid 流程图 ───────────────────────────────────────────────────────────

  /**
   * 是否开启 Mermaid 流程图渲染。
   * true → 语言标识为 "mermaid" 的代码块会被渲染成可交互的图表，
   *         而不是普通的代码高亮文本。
   */
  enableMermaid: {
    type: Boolean,
    default: false,
  },

  /**
   * Mermaid 的配置项（传给 MermaidService）。
   * 例如：{ theme: 'dark' } 可以让图表跟随暗色主题。
   */
  mermaidConfig: {
    type: Object as PropType<MermaidConfig>,
    default: () => ({}),
  },
};
