<!--
  Bubble.vue
  从 matechat packages/components/Bubble/Bubble.vue 移植而来。

  matechat 原始设计要点：
  1. 通过 align prop 控制左/右对齐（left=AI，right=用户）
  2. avatarConfig 控制头像展示（imgSrc/displayName/isRound）
  3. loading 时显示三点动画（BubbleLoading）
  4. variant 控制气泡样式：filled（实心背景）| bordered（边框）| none（无样式）
  5. 内容区通过 default slot 传入，支持嵌套任意组件（如 MarkdownCard）
  6. bottom slot 用于放操作按钮（复制、点赞等）

  原版依赖链：Bubble.vue → useBubbleFoundation.ts → @matechat/common
  这里把公共逻辑内联，不引入 @matechat/common
-->
<template>
  <div class="mc-bubble" :class="bubbleClasses">
    <!-- 头像区：由 avatarConfig 驱动，也可以通过 #avatar slot 完全自定义 -->
    <div v-if="$slots.avatar" class="mc-bubble-avatar">
      <slot name="avatar" />
    </div>
    <div v-else-if="avatarConfig" class="mc-bubble-avatar">
      <!-- 有 imgSrc 就显示图片头像，否则显示文字头像 -->
      <img
        v-if="avatarConfig.imgSrc"
        :src="avatarConfig.imgSrc"
        :width="avatarConfig.width || 32"
        :height="avatarConfig.height || 32"
        class="mc-avatar-img"
        :class="{ 'mc-avatar-round': avatarConfig.isRound }"
        :alt="avatarConfig.displayName"
      />
      <div
        v-else
        class="mc-avatar-text"
        :class="{ 'mc-avatar-round': avatarConfig.isRound }"
        :style="{ width: (avatarConfig.width || 32) + 'px', height: (avatarConfig.height || 32) + 'px' }"
      >
        {{ (avatarConfig.displayName || '?').charAt(0).toUpperCase() }}
      </div>
    </div>

    <!-- 内容容器 -->
    <div class="mc-bubble-content-container" :class="{ 'with-avatar': !!avatarConfig }">
      <!-- top slot：气泡顶部，可放时间/名称等 -->
      <slot v-if="!loading" name="top" />

      <!-- loading 状态：三点动画（matechat 的 BubbleLoading 组件） -->
      <div v-if="loading" class="mc-bubble-loading">
        <slot name="loadingTpl">
          <span class="mc-dot" />
          <span class="mc-dot" />
          <span class="mc-dot" />
        </slot>
      </div>

      <!-- 正文内容区：有 default slot 或 content prop 时显示 -->
      <div
        v-if="($slots.default || content) && !loading"
        class="mc-bubble-content"
        :class="[variant]"
      >
        <!-- default slot 优先；无 slot 时直接渲染 content 纯文本 -->
        <slot>{{ content }}</slot>
      </div>

      <!-- bottom slot：操作区，如复制/点赞按钮 -->
      <slot v-if="!loading" name="bottom" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// ── Props 定义（与 matechat bubble-types.ts 保持一致）─────────────────────────
export interface BubbleAvatar {
  name?: string
  gender?: string
  width?: number
  height?: number
  isRound?: boolean
  imgSrc?: string
  displayName?: string
}

export type BubbleVariant = 'filled' | 'none' | 'bordered'
export type BubbleAlign = 'left' | 'right'
export type AvatarPosition = 'top' | 'side'

const props = withDefaults(defineProps<{
  content?: string
  loading?: boolean
  align?: BubbleAlign
  avatarPosition?: AvatarPosition
  variant?: BubbleVariant
  avatarConfig?: BubbleAvatar
}>(), {
  content: '',
  loading: false,
  align: 'left',
  avatarPosition: 'side',
  variant: 'filled',
})

/**
 * 计算气泡根元素的动态 class 列表。
 *
 * 对应 matechat 原版 useBubbleFoundation.ts 中的 bubbleClasses 逻辑。
 * 原版把这段逻辑抽成 Foundation 类（Angular/Vue 共享），
 * 这里直接内联为 computed，效果完全一致：
 *
 *  - mc-bubble-left  / mc-bubble-right：通过 CSS flex-direction:row-reverse
 *    实现左（AI）/ 右（用户）两种对齐方式。
 *  - mc-bubble-avatar-side / mc-bubble-avatar-top：控制头像与内容的相对位置，
 *    top 时头像贴顶，side 时头像居中对齐。
 */
const bubbleClasses = computed(() => ({
  'mc-bubble-left': props.align === 'left',
  'mc-bubble-right': props.align === 'right',
  [`mc-bubble-avatar-${props.avatarPosition}`]: true,
}))
</script>

<style scoped>
/* ── 源自 packages/components/Bubble/bubble.scss ─────────────────────────────
   原版用 devui-theme 的 SCSS 变量；这里改为直接使用 CSS 自定义属性（带默认值），
   效果等价，但不需要 devui-theme 编译时介入。
*/

.mc-bubble {
  display: flex;
  gap: 8px;
  font-size: var(--devui-font-size, 14px);
  line-height: 1.6;
  /* 左对齐：头像在左，内容在右（正常 flex 方向） */
}

/* 右对齐：反转 flex 方向，头像跑到右边 */
.mc-bubble-right {
  flex-direction: row-reverse;
}

/* 头像顶部对齐 */
.mc-bubble-avatar-top .mc-bubble-avatar {
  align-self: flex-start;
}

/* ── 头像 ── */
.mc-bubble-avatar {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.mc-avatar-img,
.mc-avatar-text {
  width: 32px;
  height: 32px;
  object-fit: cover;
}

.mc-avatar-round {
  border-radius: 50%;
}

/* 文字头像：用渐变背景 */
.mc-avatar-text {
  border-radius: 8px;
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* AI 头像（左对齐）用蓝紫渐变，用户头像（右对齐）用灰色 */
.mc-bubble-right .mc-avatar-text {
  background: linear-gradient(135deg, #6b7280, #9ca3af);
}

/* ── 内容容器 ── */
.mc-bubble-content-container {
  display: flex;
  flex-direction: column;
  max-width: calc(100% - 48px);
}

.mc-bubble-content-container.with-avatar {
  max-width: calc(100% - 48px);
}

/* ── 气泡内容区 ── */
.mc-bubble-content {
  word-wrap: break-word;
  word-break: break-word;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: var(--devui-font-size, 14px);
  color: var(--devui-text, #252b3a);
}

/* variant=filled：有背景色（AI 默认） */
.mc-bubble-content.filled {
  background: var(--devui-base-bg, #fff);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

/* variant=bordered：边框样式 */
.mc-bubble-content.bordered {
  background: var(--devui-base-bg, #fff);
  border: 1px solid var(--devui-form-control-line, #d9d9d9);
}

/* variant=none：无样式，透明 */
.mc-bubble-content.none {
  background: transparent;
  padding: 4px 0;
}

/* 右对齐（用户）气泡：蓝紫色背景 */
.mc-bubble-right .mc-bubble-content.filled {
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
  color: var(--devui-light-text, #fff);
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
}

/* ── loading 三点动画（对应 BubbleLoading.vue）── */
.mc-bubble-loading {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 12px 14px;
  background: var(--devui-base-bg, #fff);
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  width: fit-content;
}

.mc-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--devui-placeholder, #8a8e99);
  animation: mc-bounce 1.2s infinite ease-in-out;
}

.mc-dot:nth-child(2) { animation-delay: 0.2s; }
.mc-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes mc-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40%           { transform: scale(1);   opacity: 1;   }
}
</style>
