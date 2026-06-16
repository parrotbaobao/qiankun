/**
 * useMarkdownCardFoundation.ts
 * Vue 版的 MarkdownCard Foundation 适配层。
 *
 * 什么是 Foundation 模式？
 *  matechat 同时支持 Angular 和 Vue，核心业务逻辑（打字机、think块、XSS）
 *  放在框架无关的 Foundation 类里。各框架写一个"适配器"，
 *  告诉 Foundation 如何读 props、更新状态、触发事件。
 *
 *  调用关系：
 *    mdCard.vue
 *      └── useMarkdownCardFoundation()   ← 本文件
 *              └── MarkdownCardFoundation（纯 TS，framework 无关）
 */

// useDefaultAdapter：创建带默认空实现的基础适配器（不用手写所有接口）
// useFoundation：把 Foundation 类 + Adapter 组合，返回 Foundation 实例
import {
  useDefaultAdapter,
  useFoundation,
} from '@matechat/common/Base/useFoundation';

// MarkdownCardAdapter：Foundation 需要的适配器接口定义
// MarkdownCardFoundation：核心类，包含 isToken/getThinkContent/parseTypingContent 等方法
import {
  type MarkdownCardAdapter,
  MarkdownCardFoundation,
} from '@matechat/common/MarkdownCard/foundation';

// matechat 自己的多语言 hook，不依赖 vue-i18n，用于翻译按钮文字（复制/折叠等）
import { useMcI18n } from '@matechat/core/Locale';

/** 函数参数类型：直接接收 mdCard.vue 的 props 和 emit */
export interface UseMarkdownCardFoundationOptions {
  props: any;  // defineProps 返回的 props 对象
  emit: any;   // defineEmits 返回的 emit 函数
}

/**
 * useMarkdownCardFoundation
 * 构建 Vue 版适配器，创建 MarkdownCardFoundation 实例。
 *
 * @returns foundation 实例，mdCard.vue 用它调用：
 *   - foundation.isToken(node)                  → 判断节点是 Token 还是 ASTNode
 *   - foundation.getThinkContent(content, opts) → 把 <think> 转为 <div class="mc-think-block">
 *   - foundation.parseTypingContent(content)    → 截取打字机当前位置的文字
 */
export function useMarkdownCardFoundation({ props, emit }: UseMarkdownCardFoundationOptions) {
  // t()：根据当前语言设置翻译字符串，如 t('Md.copy') → '复制' 或 'Copy'
  const { t } = useMcI18n();

  // defaultAdapter：带默认空实现的基础适配器，只需覆盖关键方法
  const defaultAdapter = useDefaultAdapter();

  // adapter：告诉 Foundation 如何从 Vue 层读取数据、触发事件
  const adapter: MarkdownCardAdapter = {
    ...defaultAdapter,

    // Foundation 读取当前所有 props（content/typing/theme 等）
    getProps: () => props,
    // Foundation 读取单个 prop
    getProp: (key: string) => props[key],

    // Foundation 读/写内部状态（Vue 版把状态交给 ref 管理，这里返回空）
    getStates: () => ({}),
    getState: (_key: string) => undefined,
    setState: (_key: string, _value: any) => {
      // Vue 版状态由组件内的 ref/reactive 管理，Foundation 不直接修改
    },

    // Foundation 需要翻译文字时调用（如代码块复制按钮的提示文字）
    locale: (key: string, params?: Record<string, string>) => t(key, params),

    // 打字机生命周期 → 转发为 Vue emit 事件，让父组件可以监听
    typingStart: () => emit('typingStart'),  // 动画开始
    typingEnd:   () => emit('typingEnd'),    // 动画结束（全部内容展示完毕）
    typingEvent: () => emit('typingEvent'),  // 每推进一步触发一次
    parseContent: (_content: string) => {},  // 预留接口，暂未使用
  };

  // useFoundation：new MarkdownCardFoundation(adapter)，返回其实例
  const { foundation } = useFoundation<MarkdownCardFoundation>({
    adapter,
    foundationClass: MarkdownCardFoundation,
  });

  return { foundation };
}
