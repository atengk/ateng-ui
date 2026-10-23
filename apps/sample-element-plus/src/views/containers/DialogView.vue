<script setup lang="ts">
/**
 * 企业级弹窗交互容器 AtengDialog 自验页面。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref } from 'vue';
import {
  ElCard,
  ElButton,
  ElInput,
  ElForm,
  ElFormItem,
  ElSelect,
  ElOption,
  ElAlert,
  ElMessage,
  type FormInstance,
} from 'element-plus';
import { AtengDialog } from '@atengk/element-plus';

// 弹窗可见性
const basicDialogVisible = ref(false);
const asyncDialogVisible = ref(false);
const failDialogVisible = ref(false);
const scrollDialogVisible = ref(false);
const lazyDialogVisible = ref(false);
const validatedDialogVisible = ref(false);

// 表单数据
const form = ref({
  username: 'Ateng',
  email: 'ateng@example.com',
  remark: '企业级弹窗交互测试',
});

// 自动校验表单引用与数据
const validatedFormRef = ref<FormInstance>();
const validatedForm = ref({
  username: '',
  role: '',
  phone: '',
});

const validatedFormRules = {
  username: [{ required: true, message: '请输入管理员账号', trigger: 'blur' }],
  role: [{ required: true, message: '请选择所属角色', trigger: 'change' }],
  phone: [{ required: true, message: '请输入手机号码', trigger: 'blur' }],
};

// 自动校验提交 Hook
const handleValidatedConfirm = async () => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  ElMessage.success('表单校验通过，管理员资料保存成功！');
};

// 异步提交 Hook
const handleAsyncConfirm = async () => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  ElMessage.success('用户资料保存成功！');
};

// 异常提交 Hook
const handleFailingConfirm = async () => {
  await new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('服务端繁忙'));
      ElMessage.error('保存失败：服务端繁忙，请修改后重试');
    }, 1500);
  });
};
</script>

<template>
  <div class="dialog-view">
    <ElCard header="企业级弹窗容器 AtengDialog">
      <ElAlert
        title="组件特性说明"
        type="info"
        description="基于 el-dialog 强化封装：默认支持原生拖拽 draggable；右上角集成全屏放大/还原按钮，支持双击 Header 快速全屏切换；内容区由 el-scrollbar 承载并严格限制视口高度；异步确认 Loading 锁协议：确定时进入 loading，同步禁用取消/关闭/ESC，成功自动关闭，失败保持开启保护现场；支持 :form-ref 表单自动校验流转（校验未通过立即就地阻断，通过后自动开启 loading）；支持 :confirm-on-close 二次防误关确认；支持分帧延迟挂载（lazy-render）与独立硬件合成图层加速，杜绝大页面掉帧卡顿。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <div class="btn-grid">
        <ElButton type="primary" @click="basicDialogVisible = true">
          打开基础弹窗 (支持拖拽/双击全屏)
        </ElButton>
        <ElButton type="success" @click="asyncDialogVisible = true">
          异步确认 Loading 锁弹窗 (2秒提交)
        </ElButton>
        <ElButton type="danger" @click="failDialogVisible = true">
          异常保持现场弹窗 (抛错不关闭)
        </ElButton>
        <ElButton type="warning" @click="scrollDialogVisible = true">
          超长视口滚动弹窗 (高度受控)
        </ElButton>
        <ElButton type="info" @click="lazyDialogVisible = true">
          分帧延迟挂载弹窗 (lazy-render 防掉帧)
        </ElButton>
        <ElButton type="primary" plain @click="validatedDialogVisible = true">
          表单自动校验与防误关弹窗 (formRef + 防误关)
        </ElButton>
      </div>

      <!-- 1. 基础弹窗 -->
      <AtengDialog v-model="basicDialogVisible" title="系统基础参数配置" width="550px">
        <ElForm :model="form" label-width="100px">
          <ElFormItem label="用户名称">
            <ElInput v-model="form.username" />
          </ElFormItem>
          <ElFormItem label="联系邮箱">
            <ElInput v-model="form.email" />
          </ElFormItem>
          <ElFormItem label="备注说明">
            <ElInput v-model="form.remark" type="textarea" :rows="3" />
          </ElFormItem>
        </ElForm>
      </AtengDialog>

      <!-- 2. 异步确认 Loading 锁弹窗 -->
      <AtengDialog
        v-model="asyncDialogVisible"
        title="异步订单审核提交"
        width="550px"
        :before-confirm="handleAsyncConfirm"
      >
        <p>点击确定后，弹窗将自动接管确定按钮 loading 锁，并同步禁用取消按钮与右上角关闭：</p>
        <ElInput v-model="form.remark" placeholder="审核意见" />
      </AtengDialog>

      <!-- 3. 异常保护现场弹窗 -->
      <AtengDialog
        v-model="failDialogVisible"
        title="异常容错与现场保护"
        width="550px"
        :before-confirm="handleFailingConfirm"
      >
        <p style="color: var(--el-color-danger)">
          此弹窗在点击确定 1.5 秒后将模拟服务端报错，验证弹窗依然保持开启，表单现场不丢失：
        </p>
        <ElInput v-model="form.remark" placeholder="正在编辑的关键草稿..." />
      </AtengDialog>

      <!-- 4. 超长滚动弹窗 -->
      <AtengDialog v-model="scrollDialogVisible" title="超长内容条款须知" width="600px">
        <div v-for="i in 30" :key="i" class="scroll-item">
          第
          {{ i }} 条：企业级基础设施交互容器规范，确保内容区域严格自适应视口高度，绝不溢出撑破屏幕。
        </div>
      </AtengDialog>

      <!-- 5. 分帧延迟挂载弹窗 (lazy-render) -->
      <AtengDialog
        v-model="lazyDialogVisible"
        title="分帧延迟挂载极速弹窗 (lazy-render)"
        width="600px"
        :lazy-render="true"
      >
        <template #placeholder>
          <div style="padding: 24px 0; text-align: center; color: var(--el-text-color-secondary)">
            <p>⚡ 正在分帧异步调度挂载重型业务节点，展开动效独占主线程达成 100% 满帧...</p>
          </div>
        </template>
        <div style="padding: 8px 0">
          <ElAlert
            title="分帧延迟挂载就绪"
            type="success"
            description="弹窗展开动效（250ms）执行期间先平滑呈现占位，待展开完成（@opened）后无感渲染本内容。彻底消除主线程重排、子组件初始化与 GPU 动效争抢 CPU，达成零掉帧！"
            :closable="false"
            show-icon
            style="margin-bottom: 16px"
          />
          <ElForm :model="form" label-width="100px">
            <ElFormItem label="重型报表项">
              <ElInput v-model="form.remark" placeholder="复杂大表单数据" />
            </ElFormItem>
          </ElForm>
        </div>
      </AtengDialog>

      <!-- 6. 表单自动校验与防误关弹窗 (formRef + confirmOnClose) -->
      <AtengDialog
        v-model="validatedDialogVisible"
        title="新建系统管理员（自动校验与二次防误关）"
        width="560px"
        :form-ref="validatedFormRef"
        :confirm-on-close="true"
        :before-confirm="handleValidatedConfirm"
      >
        <ElAlert
          title="表单自动校验流转"
          type="success"
          description="无需在 beforeConfirm 中手写 validate() 胶水代码，只需传入 :form-ref。点击确定自动校验：校验未通过时就地阻断并保留错误高亮；通过后自动开启 loading 锁。若在未保存时关闭弹窗，将弹出二次确认。"
          show-icon
          :closable="false"
          style="margin-bottom: 16px"
        />
        <ElForm
          ref="validatedFormRef"
          :model="validatedForm"
          :rules="validatedFormRules"
          label-width="110px"
        >
          <ElFormItem label="管理员账号" prop="username">
            <ElInput v-model="validatedForm.username" placeholder="请输入管理员登录账号" />
          </ElFormItem>
          <ElFormItem label="所属角色" prop="role">
            <ElSelect v-model="validatedForm.role" placeholder="请选择角色" style="width: 100%">
              <ElOption label="超级管理员" value="admin" />
              <ElOption label="运维主管" value="ops" />
              <ElOption label="审计专员" value="auditor" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="手机号码" prop="phone">
            <ElInput v-model="validatedForm.phone" placeholder="请输入管理员联系电话" />
          </ElFormItem>
        </ElForm>
      </AtengDialog>
    </ElCard>
  </div>
</template>

<style scoped>
.btn-grid {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.scroll-item {
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 13px;
  color: var(--el-text-color-regular);
}
</style>
