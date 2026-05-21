<script setup lang="ts">
import { ref } from 'vue'

// ── Drawer ────────────────────────────────────────────────────────────────────
const drawerVisible = ref(false)

// ── Dialog ────────────────────────────────────────────────────────────────────
const dialogVisible = ref(false)

function onDialogConfirm() {
  dialogVisible.value = false
}

// ── Table ─────────────────────────────────────────────────────────────────────
interface User {
  id: number
  name: string
  department: string
  role: string
  status: string
}

const tableData = ref<User[]>([
  { id: 1, name: '王建国', department: '技术部', role: '架构师',    status: '在职' },
  { id: 2, name: '李晓明', department: '产品部', role: '产品经理',  status: '在职' },
  { id: 3, name: '张雪芬', department: '设计部', role: 'UI 设计师', status: '在职' },
  { id: 4, name: '陈志远', department: '技术部', role: '前端工程师', status: '离职' },
  { id: 5, name: '刘美丽', department: '运营部', role: '运营专员',  status: '在职' },
])
</script>

<template>
  <div class="ui-demo-page">
    <h2 class="page-title">Element Plus 组件示例</h2>

    <!-- ── 操作入口 ── -->
    <section class="demo-section">
      <h3 class="section-title">操作入口</h3>
      <div class="btn-row">
        <el-button type="primary" @click="drawerVisible = true">打开抽屉</el-button>
        <el-button type="primary" @click="dialogVisible = true">打开弹窗</el-button>
      </div>
    </section>

    <!-- ── Table ── -->
    <section class="demo-section">
      <h3 class="section-title">数据表格</h3>
      <el-table :data="tableData" stripe border style="width: 100%">
        <el-table-column prop="id"         label="ID"    width="80" />
        <el-table-column prop="name"       label="姓名"   width="120" />
        <el-table-column prop="department" label="部门"   width="120" />
        <el-table-column prop="role"       label="角色"   width="160" />
        <el-table-column prop="status"     label="状态"   width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === '在职' ? 'success' : 'danger'" size="small">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="120">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="drawerVisible = true">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <!-- ── Drawer ── -->
    <el-drawer v-model="drawerVisible" title="用户详情" size="400px" direction="rtl">
      <div class="drawer-body">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="姓名">王建国</el-descriptions-item>
          <el-descriptions-item label="部门">技术部</el-descriptions-item>
          <el-descriptions-item label="角色">架构师</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag type="success" size="small">在职</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="邮箱">wangjg@company.com</el-descriptions-item>
        </el-descriptions>
        <div class="drawer-footer">
          <el-button @click="drawerVisible = false">关 闭</el-button>
          <el-button type="primary">编 辑</el-button>
        </div>
      </div>
    </el-drawer>

    <!-- ── Dialog ── -->
    <el-dialog v-model="dialogVisible" title="确认操作" width="440px" :close-on-click-modal="true">
      <p class="dialog-content">你确定要执行此操作吗？此操作不可撤销，请谨慎确认。</p>
      <template #footer>
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="onDialogConfirm">确 认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.ui-demo-page {
  padding: 32px;
  background: #f5f7fa;
  min-height: 100%;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #1d2129;
  margin: 0 0 24px;
}

.demo-section {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1d2129;
  margin: 0 0 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f1f5;
}

.btn-row {
  display: flex;
  gap: 12px;
}

.drawer-body {
  padding: 0 4px;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f1f5;
}

.dialog-content {
  color: #575d6c;
  line-height: 1.8;
  margin: 0;
}
</style>
