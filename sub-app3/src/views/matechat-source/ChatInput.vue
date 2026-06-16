<!--
  ChatInput.vue
  从 matechat packages/components/Input/Input.vue 移植而来。

  matechat 原始设计要点：
  1. displayType 区分 Simple（单行+发送按钮）和 Full（多行+底部工具栏）
  2. variant 区分 bordered（带边框）和 borderless（无边框）
  3. 内部有 Textarea/EditableBlock 两套输入控件（EditableBlock 支持 @ 提及）
  4. 通过 submitShortKey 配置快捷键：enter 或 shiftEnter 发送
  5. loading 状态时发送按钮变停止图标
  6. extra slot 放底部工具栏（附件、@模型、联网搜索等）
  7. 发送时 emit('submit', value)，外部监听处理业务逻辑

  原版依赖：Input.vue → textarea.vue / EditableBlock.vue → use-textarea-autosize.ts
  这里把自动增高逻辑内联，textarea 直接内联，去掉 EditableBlock（@ 提及）

  注意：SendButton 不能用 { template: `...` } 内联对象定义，
  因为项目用的是 vue.runtime.esm-bundler（无运行时编译器），会直接报错。
  改成在 <template> 里直接写 <button> 元素。
-->
<template>
  <div class="mc-input" :class="inputClasses">
    <!-- 头部 slot（文件列表、图片预览等，对应 #head slot）-->
    <slot name="head" />

    <!-- 输入内容区 -->
    <div class="mc-input-content">
      <slot name="prefix" />

      <!-- Textarea：原版用独立 textarea.vue，含 use-textarea-autosize -->
      <textarea
        ref="textareaRef"
        class="mc-textarea"
        v-model="inputValue"
        :placeholder="placeholder || '发送消息…'"
        :disabled="disabled"
        :maxlength="maxLength"
        rows="1"
        @input="autoResize"
        @keydown="handleKeydown"
        @focus="isFocused = true"
        @blur="isFocused = false"
      />

      <slot name="suffix" />

      <!-- Simple 模式：发送按钮紧跟输入框 -->
      <div v-if="displayType === 'simple'" class="mc-input-btn-wrap">
        <slot name="button">
          <!-- 停止图标（streaming 中） -->
          <button v-if="loading" class="mc-send-btn mc-send-loading" @click="handleSubmit">
            <IconStopSquare :size="12" />
          </button>
          <!-- 发送箭头 -->
          <button v-else class="mc-send-btn" :disabled="!inputValue.trim() || disabled" @click="handleSubmit">
            <IconSend :size="15" />
          </button>
        </slot>
      </div>
    </div>

    <!-- Full 模式底部工具栏（对应 matechat 的 .mc-input-foot）-->
    <div v-if="displayType === 'full'" class="mc-input-foot">
      <div class="mc-input-foot-left">
        <slot name="extra" />
        <span v-if="showCount" class="mc-input-count">
          {{ inputValue.length }}{{ maxLength ? `/${maxLength}` : '' }}
        </span>
      </div>
      <slot name="button">
        <!-- 停止图标（streaming 中） -->
        <button v-if="loading" class="mc-send-btn mc-send-loading" @click="handleSubmit">
          <IconStopSquare :size="12" />
        </button>
        <!-- 发送箭头 -->
        <button v-else class="mc-send-btn" :disabled="!inputValue.trim() || disabled" @click="handleSubmit">
          <IconSend :size="15" />
        </button>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import IconStopSquare from '@/components/icons/IconStopSquare.vue'
import IconSend from '@/components/icons/IconSend.vue'

// ── Props ─────────────────────────────────────────────────────────────────────
export type DisplayType = 'simple' | 'full'
export type InputVariant = 'bordered' | 'borderless'
export type SubmitShortKey = 'enter' | 'shiftEnter'

const props = withDefaults(defineProps<{
  value?: string
  placeholder?: string
  disabled?: boolean
  displayType?: DisplayType
  variant?: InputVariant
  loading?: boolean
  showCount?: boolean
  maxLength?: number
  submitShortKey?: SubmitShortKey
  autoClear?: boolean
}>(), {
  value: '',
  disabled: false,
  displayType: 'full',
  variant: 'bordered',
  loading: false,
  showCount: false,
  submitShortKey: 'enter',
  autoClear: true,
})

const emit = defineEmits<{
  change: [value: string]
  submit: [value: string]
  focus:  []
  blur:   []
}>()

// ── 内部状态 ──────────────────────────────────────────────────────────────────
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const isFocused   = ref(false)
const inputValue  = ref(props.value)

/**
 * 受控模式同步：外部 value prop 变化时同步到内部 inputValue。
 * 对应 matechat Input.vue 中的受控/非受控模式设计：
 * 父组件通过 :value 传值、@change 监听变化，形成单向数据流。
 */
watch(() => props.value, (v) => { inputValue.value = v })

/**
 * 内部值变化时向上 emit change 事件。
 * 父组件通过 @change 拿到最新值后更新自己的状态，再通过 :value 回传。
 * 这样父组件始终是唯一数据源（single source of truth）。
 */
watch(inputValue, (v) => emit('change', v))

/**
 * 根据当前 props 动态计算输入框根元素的 CSS class 列表。
 *
 * 对应 matechat input-types.ts 里的 inputClasses computed：
 *  - mc-input-disabled   → 禁用态，cursor:not-allowed，视觉变灰
 *  - mc-input-simple     → Simple 模式，隐藏底部工具栏，紧凑布局
 *  - mc-input-borderless → 无边框变体，背景换成灰色，常用于卡片内嵌场景
 *  - mc-input-focused    → 聚焦时高亮边框和蓝色光晕
 */
const inputClasses = computed(() => ({
  'mc-input-disabled':   props.disabled,
  'mc-input-simple':     props.displayType === 'simple',
  'mc-input-borderless': props.variant === 'borderless',
  'mc-input-focused':    isFocused.value,
}))

/**
 * Textarea 自动增高，对应 matechat use-textarea-autosize.ts。
 *
 * 原理：
 *  1. 先把高度重置为 'auto'，让浏览器重新计算内容撑开的真实高度。
 *  2. 再把高度设置为 scrollHeight（内容实际高度），实现随内容增长。
 *  3. Math.min(..., 180) 限制最大高度为 180px，超过后出现滚动条。
 *
 * 为什么要先设 'auto'：
 *  如果不重置，缩短内容时 scrollHeight 不会减小（浏览器不会自动缩小）。
 *
 * 绑定到 @input 事件，每次用户输入后触发。
 */
function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'                                    // 先重置
  el.style.height = Math.min(el.scrollHeight, 180) + 'px'    // 再设实际高度
}

/**
 * 键盘事件处理，实现 Enter/Shift+Enter 快捷键发送，对应 matechat 的 submitShortKey prop。
 *
 * 三种情况：
 *  1. loading（流式输出中）：Enter 触发停止信号（emit submit，父组件判断 streaming 状态后中止）。
 *  2. submitShortKey='enter'（默认）：Enter 发送，Shift+Enter 换行（正常 textarea 默认行为）。
 *  3. submitShortKey='shiftEnter'：Shift+Enter 发送，Enter 换行（适合长文本编辑场景）。
 *
 * e.preventDefault() 阻止 textarea 的默认换行行为，确保快捷键生效。
 */
function handleKeydown(e: KeyboardEvent) {
  if (props.loading) {
    // 流式中：Enter = 停止
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); emit('submit', inputValue.value) }
    return
  }
  if (props.submitShortKey === 'enter') {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  } else {
    if (e.key === 'Enter' && e.shiftKey)  { e.preventDefault(); handleSubmit() }
  }
}

/**
 * 发送逻辑，由发送按钮点击或键盘快捷键触发。
 *
 * 对应 matechat Input.vue 中 button.vue 的 submit 触发链：
 *  button click → emit('submit', value) → 父组件 @submit handler
 *
 * 关键步骤：
 *  1. loading 时点击发送按钮 = 停止（直接 emit，不清空输入框，父组件处理中止逻辑）。
 *  2. 非 loading：trim 后为空或 disabled 时不发送（防止发送空消息）。
 *  3. emit('submit', val) 通知父组件有新消息要发送。
 *  4. autoClear=true 时清空输入框，用 requestAnimationFrame 延迟重置高度，
 *     确保 DOM 更新完成后再把 height 重置为 auto（否则会闪烁）。
 */
function handleSubmit() {
  if (props.loading) { emit('submit', inputValue.value); return }
  const val = inputValue.value.trim()
  if (!val || props.disabled) return
  emit('submit', val)
  if (props.autoClear) {
    inputValue.value = ''
    // rAF 确保 Vue 完成 DOM 更新后再重置高度，避免闪烁
    requestAnimationFrame(() => {
      if (textareaRef.value) textareaRef.value.style.height = 'auto'
    })
  }
}
</script>

<style scoped>
.mc-input {
  background: var(--devui-form-control-bg, #fff);
  border: 1.5px solid var(--devui-form-control-line, #d9d9d9);
  border-radius: 12px;
  padding: 10px 10px 10px 14px;
  transition: border-color .15s, box-shadow .15s;
}
.mc-input.mc-input-focused {
  border-color: var(--devui-primary, #5e7ce0);
  box-shadow: 0 0 0 3px rgba(94,124,224,.1);
}
.mc-input.mc-input-borderless {
  border-color: transparent;
  background: var(--devui-global-bg, #f6f6f8);
}
.mc-input.mc-input-borderless.mc-input-focused {
  border-color: var(--devui-primary, #5e7ce0);
  background: var(--devui-form-control-bg, #fff);
}
.mc-input.mc-input-disabled {
  background: var(--devui-disabled-bg, #f5f5f5);
  cursor: not-allowed;
}

.mc-input-content {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.mc-textarea {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--devui-font-size, 14px);
  color: var(--devui-text, #252b3a);
  line-height: 1.6;
  resize: none;
  min-height: 24px;
  max-height: 180px;
  font-family: inherit;
  overflow-y: auto;
}
.mc-textarea::placeholder { color: var(--devui-placeholder, #8a8e99); }
.mc-textarea:disabled      { cursor: not-allowed; color: var(--devui-disabled-text, #aaa); }

.mc-input-btn-wrap { display: flex; align-items: center; flex-shrink: 0; }

.mc-input-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--devui-dividing-line, #f2f2f3);
}
.mc-input-foot-left {
  display: flex; align-items: center; gap: 8px; flex: 1;
  overflow-x: auto; scrollbar-width: none;
}
.mc-input-foot-left::-webkit-scrollbar { display: none; }
.mc-input-count { font-size: 12px; color: var(--devui-placeholder, #8a8e99); white-space: nowrap; }

/* ── 发送按钮（直接写在模板里，避免 template 字符串运行时编译问题）── */
.mc-send-btn {
  width: 34px; height: 34px; border-radius: 10px; border: none;
  background: var(--devui-primary, #5e7ce0);
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background .15s, transform .1s; flex-shrink: 0;
}
.mc-send-btn:hover:not(:disabled) { background: var(--devui-primary-hover, #7693f5); }
.mc-send-btn:active:not(:disabled) { transform: scale(.93); }
.mc-send-btn:disabled {
  background: var(--devui-disabled-bg, #e8e8e8);
  color: var(--devui-disabled-text, #aaa);
  cursor: not-allowed;
}
/* loading（停止）状态 */
.mc-send-btn.mc-send-loading {
  background: #fff;
  border: 1.5px solid var(--devui-form-control-line, #d9d9d9);
  color: var(--devui-text, #252b3a);
}
.mc-send-btn.mc-send-loading:hover { border-color: #ef4444; color: #ef4444; }
</style>
