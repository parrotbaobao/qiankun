<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const dialogVisible = ref(false)
const drawerVisible = ref(false)

const sharedColorActual = ref('')
const hostPrimaryActual = ref('')
onMounted(() => {
  const s = getComputedStyle(document.documentElement)
  sharedColorActual.value = s.getPropertyValue('--shared-color').trim() || '（未定义）'
  hostPrimaryActual.value = s.getPropertyValue('--host-primary').trim() || '（未定义）'
})
</script>

<template>
  <div class="sub-panel">
    <!-- 面板头 -->
    <div class="side-header">
      <span class="side-badge sub-badge">📦 子应用3 · Vue + Element Plus</span>
      <span class="side-desc">Portal 弹窗在 experimental / strict 沙箱下会丢失样式</span>
    </div>

    <!-- 场景 A：Portal 弹窗 / 抽屉 -->
    <section class="iso-section">
      <div class="iso-title"><em class="tag-a">A</em> Portal 弹窗 / 抽屉</div>
      <div class="btn-row">
        <el-button type="primary" @click="dialogVisible = true">打开子应用 Dialog</el-button>
        <el-button type="success" @click="drawerVisible = true">打开子应用 Drawer</el-button>
      </div>
      <p class="iso-note">
        none → ✅ 正常 &nbsp;|&nbsp;
        experimental → ❌ 弹窗无样式（挂到 body，脱离 scoped 容器）&nbsp;|&nbsp;
        strict → ❌ 完全裸奔（Shadow DOM 外无样式）
      </p>
    </section>

    <!-- 场景 B：CSS 变量 -->
    <section class="iso-section">
      <div class="iso-title"><em class="tag-b">B</em> CSS 变量（子应用侧）</div>
      <div class="var-row">
        <div class="var-box" style="background: var(--shared-color, #409eff)">
          <span>--shared-color</span>
          <span class="var-hint">实际值：{{ sharedColorActual }}</span>
          <span class="var-hint">子应用定义蓝 #409eff，主应用定义橙 #ff6600</span>
        </div>
        <div class="var-box" style="background: var(--host-primary, #888)">
          <span>--host-primary（主应用专属）</span>
          <span class="var-hint">实际值：{{ hostPrimaryActual }}</span>
          <span class="var-hint">泄露进来说明 :root 无法被隔离</span>
        </div>
      </div>
    </section>

    <!-- 场景 C：类名冲突 -->
    <section class="iso-section">
      <div class="iso-title"><em class="tag-c">C</em> 类名冲突 .conflict-btn</div>
      <button class="conflict-btn sub-btn">子应用 .conflict-btn（none 下被污染为红色）</button>
      <p class="iso-note">
        none → ❌ 主应用 .conflict-btn 全局样式污染此处，变红 &nbsp;|&nbsp;
        experimental / strict → ✅ 子应用保持自己的蓝色
      </p>
    </section>

    <!-- 场景 D：@keyframes 冲突 -->
    <section class="iso-section">
      <div class="iso-title"><em class="tag-d">D</em> @keyframes spin（子应用版）</div>
      <div class="spin-box spin-sub">子应用<br>旋转+缩放</div>
      <p class="iso-note">
        子应用 spin：旋转 + 缩放脉冲。none 下主应用 spin 可能覆盖它（只旋转）。
        对比左侧主应用的旋转方块。
      </p>
    </section>

    <!-- 场景 E：:root 变量 -->
    <section class="iso-section">
      <div class="iso-title"><em class="tag-e">E</em> :root 变量（所有模式都泄露）</div>
      <div class="root-note">
        <strong style="color: var(--host-primary, #888)">--host-primary 实际值：{{ hostPrimaryActual }}</strong>
        <br>主应用 :root 定义的变量无论哪种沙箱模式都能被子应用读到。
      </div>
    </section>

    <!-- 场景 F：z-index 战争 -->
    <section class="iso-section">
      <div class="iso-title"><em class="tag-f">F</em> z-index 战争</div>
      <div class="btn-row">
        <el-button type="warning" @click="dialogVisible = true">
          打开子应用 Dialog（z-index: 2000）
        </el-button>
      </div>
      <p class="iso-note">同时打开主应用和子应用的弹窗，观察谁在上方。none/experimental 时同一层叠上下文竞争；strict (Shadow DOM) 时各自独立。</p>
    </section>

    <!-- El Plus portals -->
    <el-dialog v-model="dialogVisible" title="📦 子应用 El-Plus Dialog" width="420px" append-to-body>
      <p>此弹窗属于<strong>子应用</strong>，通过 El-Plus Portal 挂载到 <code>body</code>。</p>
      <p>在 <b>experimental</b> 模式下：样式选择器加了属性前缀，挂到 body 后前缀不匹配 → 样式丢失。</p>
      <p>在 <b>strict</b> 模式下：Shadow DOM 根本不把样式注入 body → 完全裸奔。</p>
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="dialogVisible = false">确认</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="drawerVisible" title="📦 子应用 El-Plus Drawer" size="360px" append-to-body>
      <p>Drawer 同样挂到 body，在 experimental/strict 下样式丢失。</p>
      <el-button @click="drawerVisible = false">关闭</el-button>
    </el-drawer>
  </div>
</template>

<style scoped>
/* ── 子应用的 CSS 变量（与主应用 --shared-color 同名但蓝色） */
:root {
  --shared-color: #409eff;
}

/* ── 场景D：子应用 @keyframes spin（旋转+缩放，与主应用不同） */
@keyframes spin {
  0%   { transform: rotate(0deg)   scale(1); }
  50%  { transform: rotate(180deg) scale(1.3); }
  100% { transform: rotate(360deg) scale(1); }
}

/* ── 场景C：子应用自己的 .conflict-btn，期望蓝色 */
.sub-btn {
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 7px 16px;
  font-size: 13px;
  cursor: default;
}

.sub-panel {
  padding: 24px 32px;
  background: #f0f4ff;
  min-height: 100%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  align-content: start;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.side-header {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 12px;
  border-bottom: 1px solid #c7d2fe;
}

.side-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  width: fit-content;
}

.sub-badge { background: #4f46e5; color: #fff; }

.side-desc { font-size: 11px; color: #64748b; }

.iso-section {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.iso-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.iso-note {
  font-size: 11px;
  color: #94a3b8;
  margin: 0;
  line-height: 1.5;
}

em {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 999px;
  font-style: normal;
  font-size: 11px;
  font-weight: 700;
}
.tag-a { background: #dbeafe; color: #1d4ed8; }
.tag-b { background: #d1fae5; color: #065f46; }
.tag-c { background: #fee2e2; color: #991b1b; }
.tag-d { background: #ede9fe; color: #5b21b6; }
.tag-e { background: #ffedd5; color: #9a3412; }
.tag-f { background: #fef9c3; color: #854d0e; }

.btn-row { display: flex; gap: 8px; flex-wrap: wrap; }

.var-row { display: flex; gap: 8px; }

.var-box {
  flex: 1;
  border-radius: 6px;
  padding: 10px 12px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 70px;
  .var-hint { font-size: 10px; opacity: .8; font-weight: 400; }
}

.spin-box {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  animation: spin 2s linear infinite;
}

.spin-sub {
  background: linear-gradient(135deg, #409eff, #66b1ff);
  color: #fff;
}

.root-note {
  font-size: 12px;
  color: #475569;
  line-height: 1.7;
  background: #f8fafc;
  border-radius: 6px;
  padding: 10px 12px;
}
</style>
