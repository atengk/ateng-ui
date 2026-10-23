<script setup lang="ts">
/**
 * 企业级抽屉交互容器 AtengDrawer 自验页面。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref } from 'vue';
import {
  ElCard,
  ElButton,
  ElAlert,
  ElInput,
  ElForm,
  ElFormItem,
  ElInputNumber,
  ElMessage,
  type FormInstance,
} from 'element-plus';
import { AtengDrawer } from '@atengk/element-plus';

const smallDrawerVisible = ref(false);
const defaultDrawerVisible = ref(false);
const largeDrawerVisible = ref(false);
const asyncDrawerVisible = ref(false);
const lazyDrawerVisible = ref(false);
const validatedDrawerVisible = ref(false);

const drawerInput = ref('重要修改配置');

// 自动校验抽屉表单引用与数据
const validatedDrawerFormRef = ref<FormInstance>();
const validatedDrawerForm = ref({
  serverName: '',
  ipAddress: '',
  port: 8080,
});

const validatedDrawerRules = {
  serverName: [{ required: true, message: '请输入服务节点名称', trigger: 'blur' }],
  ipAddress: [{ required: true, message: '请输入 IP 地址或域名', trigger: 'blur' }],
};

// 自动校验抽屉提交 Hook
const handleValidatedDrawerConfirm = async () => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  ElMessage.success('服务节点配置已成功同步并保存！');
};

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
        description="基于 el-drawer 强化封装：支持 small (360px)、default (500px)、large (720px) 响应式语义断点；移动端视口（< 768px）自动 100% 全宽；统一的异步确认 Loading 锁协议与标准化底部操作栏；支持 :form-ref 表单自动校验流转（校验失败就地阻断保留现场，通过后开启 loading）；支持 :confirm-on-close 二次防误关；支持分帧延迟挂载（lazy-render）与硬件图层加速，杜绝大页面掉帧卡顿。"
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
        <ElButton type="info" @click="lazyDrawerVisible = true">
          分帧延迟挂载抽屉 (lazy-render 防掉帧)
        </ElButton>
        <ElButton type="primary" plain @click="validatedDrawerVisible = true">
          表单自动校验与防误关抽屉 (formRef + 防误关)
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

      <!-- 5. 分帧延迟挂载抽屉 (lazy-render) -->
      <AtengDrawer
        v-model="lazyDrawerVisible"
        title="分帧延迟挂载抽屉 (lazy-render)"
        size="default"
        :lazy-render="true"
      >
        <template #placeholder>
          <div style="padding: 24px 0; text-align: center; color: var(--el-text-color-secondary)">
            <p>⚡ 正在分帧异步调度挂载重型抽屉组件，展开动效独占主线程达成 100% 满帧...</p>
          </div>
        </template>
        <div style="padding: 8px 0">
          <ElAlert
            title="分帧延迟挂载就绪"
            type="success"
            description="抽屉滑动展开动效执行期间先平滑呈现占位，待展开完成（@opened）后无感渲染本内容。彻底消除主线程重排、子组件初始化与动效争抢 CPU，达成零掉帧！"
            :closable="false"
            show-icon
            style="margin-bottom: 16px"
          />
          <p>适合承载大表格、复杂富文本或数据分析视图：</p>
          <ElInput v-model="drawerInput" />
        </div>
      </AtengDrawer>

      <!-- 6. 表单自动校验与防误关抽屉 (formRef + confirmOnClose) -->
      <AtengDrawer
        v-model="validatedDrawerVisible"
        title="节点服务配置（自动校验与二次防误关）"
        size="default"
        :form-ref="validatedDrawerFormRef"
        :confirm-on-close="true"
        :before-confirm="handleValidatedDrawerConfirm"
      >
        <ElAlert
          title="表单自动校验流转"
          type="success"
          description="点击确定自动触发 formRef.validate()：若必填项为空则立即阻断且绝不开启 loading；校验通过后自动进入 loading 态并执行提交；若点击取消或右上角关闭，将弹出二次确认框防止误触丢失输入。"
          show-icon
          :closable="false"
          style="margin-bottom: 16px"
        />
        <ElForm
          ref="validatedDrawerFormRef"
          :model="validatedDrawerForm"
          :rules="validatedDrawerRules"
          label-width="100px"
        >
          <ElFormItem label="服务名称" prop="serverName">
            <ElInput
              v-model="validatedDrawerForm.serverName"
              placeholder="例如：gateway-cluster-01"
            />
          </ElFormItem>
          <ElFormItem label="IP / 域名" prop="ipAddress">
            <ElInput v-model="validatedDrawerForm.ipAddress" placeholder="例如：192.168.1.100" />
          </ElFormItem>
          <ElFormItem label="服务端口" prop="port">
            <ElInputNumber
              v-model="validatedDrawerForm.port"
              :min="1"
              :max="65535"
              style="width: 100%"
            />
          </ElFormItem>
        </ElForm>
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
