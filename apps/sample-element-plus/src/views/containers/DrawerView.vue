<script setup lang="ts">
/**
 * 企业级抽屉交互容器 AtengDrawer 自验页面。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref } from 'vue';
import { ElCard, ElButton, ElAlert, ElInput, ElMessage } from 'element-plus';
import { AtengDrawer } from '@atengk/element-plus';

const smallDrawerVisible = ref(false);
const defaultDrawerVisible = ref(false);
const largeDrawerVisible = ref(false);
const asyncDrawerVisible = ref(false);

const drawerInput = ref('重要修改配置');

// 异步提交 Hook
const handleDrawerAsyncConfirm = async () => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  ElMessage.success('抽屉设置保存成功！');
};
</script>

<template>
  <div class="drawer-view">
    <ElCard header="企业级抽屉容器 AtengDrawer">
      <ElAlert
        title="组件特性说明"
        type="info"
        description="基于 el-drawer 强化封装：支持 small (360px)、default (500px)、large (720px) 响应式语义断点；移动端视口（< 768px）自动 100% 全宽；统一的异步确认 Loading 锁协议与标准化底部操作栏。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <div class="btn-grid">
        <ElButton type="primary" plain @click="smallDrawerVisible = true">
          打开 Small 抽屉 (360px)
        </ElButton>
        <ElButton type="primary" @click="defaultDrawerVisible = true">
          打开 Default 抽屉 (500px)
        </ElButton>
        <ElButton type="success" @click="largeDrawerVisible = true">
          打开 Large 抽屉 (720px)
        </ElButton>
        <ElButton type="warning" @click="asyncDrawerVisible = true">
          异步确认锁抽屉 (2秒异步保存)
        </ElButton>
      </div>

      <!-- 1. Small 抽屉 -->
      <AtengDrawer v-model="smallDrawerVisible" title="快速设置 (Small)" size="small">
        <p>适合轻量筛选、简易操作项：</p>
        <ElInput v-model="drawerInput" placeholder="输入项" />
      </AtengDrawer>

      <!-- 2. Default 抽屉 -->
      <AtengDrawer v-model="defaultDrawerVisible" title="用户详情画像 (Default)" size="default">
        <p>适合标准表单填报与详情查阅。</p>
      </AtengDrawer>

      <!-- 3. Large 抽屉 -->
      <AtengDrawer v-model="largeDrawerVisible" title="复合审计日志流水 (Large)" size="large">
        <p>适合宽幅数据对比、复杂嵌套子视图。</p>
      </AtengDrawer>

      <!-- 4. 异步抽屉 -->
      <AtengDrawer
        v-model="asyncDrawerVisible"
        title="异步配置同步"
        size="default"
        :before-confirm="handleDrawerAsyncConfirm"
      >
        <p>点击确定按钮开始 2 秒异步提交，验证按钮 loading 与互斥锁效果：</p>
        <ElInput v-model="drawerInput" />
      </AtengDrawer>
    </ElCard>
  </div>
</template>

<style scoped>
.btn-grid {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
</style>
