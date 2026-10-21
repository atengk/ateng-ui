<script setup lang="ts">
/**
 * 结构化数据详情组件 AtengDescriptions 自验页面。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref } from 'vue';
import {
  ElCard,
  ElAlert,
  ElRadioGroup,
  ElRadioButton,
  ElSwitch,
  ElDivider,
  ElButton,
  ElMessage,
  type ComponentSize,
} from 'element-plus';
import {
  AtengDescriptions,
  AtengDescriptionsItem,
  type DescriptionsItemConfig,
} from '@atengk/element-plus';

// 交互布局受控状态
const border = ref(true);
const size = ref<ComponentSize>('default');
const column = ref(3);
const direction = ref<'horizontal' | 'vertical'>('horizontal');

// 模拟详情数据源（包含真实脱敏场景、空值保底、大数与字典状态）
const detailData = ref<Record<string, unknown>>({
  userId: '1792384918237491230',
  username: 'Ateng Developer',
  phone: '13812345678',
  idCard: '110101199003072345',
  email: 'ateng_admin@sample.org',
  bankCard: '6222021234567890123',
  salary: 12850.5,
  birthday: '1990-03-07T08:00:00.000Z',
  status: '1',
  remark: '', // 空值测试
  department: null, // 空值测试
});

// Schema 项定义
const schemaItems: DescriptionsItemConfig[] = [
  { prop: 'userId', label: '用户ID (雪花)', span: 1 },
  { prop: 'username', label: '用户昵称', span: 1 },
  { prop: 'phone', label: '联系电话 (手机脱敏)', mask: 'phone', span: 1 },
  { prop: 'idCard', label: '身份证号 (证件脱敏)', mask: 'idCard', span: 1 },
  { prop: 'bankCard', label: '银行卡号 (银行卡脱敏)', mask: 'bankCard', span: 1 },
  { prop: 'email', label: '电子邮箱 (邮箱脱敏)', mask: 'email', span: 1 },
  {
    prop: 'salary',
    label: '月薪待遇 (货币格式化)',
    type: 'currency',
    currencyPrecision: 2,
    span: 1,
  },
  { prop: 'birthday', label: '出生日期 (日期格式化)', type: 'date', span: 1 },
  { prop: 'status', label: '账号状态 (字典联动)', dictCode: 'sys_user_status', span: 1 },
  { prop: 'department', label: '所属部门 (空值保底)', emptyText: '未分配部门', span: 1 },
  { prop: 'remark', label: '个人备注 (全局保底)', span: 2 },
];

const handleRefreshData = () => {
  ElMessage.success('详情数据已更新');
};
</script>

<template>
  <div class="descriptions-view">
    <ElCard header="结构化数据详情组件 AtengDescriptions">
      <ElAlert
        title="组件核心能力"
        type="info"
        description="基于 el-descriptions 深度封装：双模驱动（数据驱动 items 配置模式与 SFC 声明式子组件模式）；内置 5 大脱敏管道（phone / idCard / email / name / bankCard）；内置货币与日期格式化；自动联动 AtengDictTag 字典彩色标签；空值全链路 '-' 保底防崩；完美继承 Element Plus 设计令牌与尺寸切换。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <!-- 动态排版与样式控制器 -->
      <div class="controls-toolbar">
        <div class="ctrl-item">
          <span class="ctrl-label">边框模式：</span>
          <ElSwitch v-model="border" active-text="开启" inactive-text="关闭" />
        </div>

        <div class="ctrl-item">
          <span class="ctrl-label">组件尺寸：</span>
          <ElRadioGroup v-model="size" size="small">
            <ElRadioButton value="large">Large</ElRadioButton>
            <ElRadioButton value="default">Default</ElRadioButton>
            <ElRadioButton value="small">Small</ElRadioButton>
          </ElRadioGroup>
        </div>

        <div class="ctrl-item">
          <span class="ctrl-label">一行列数：</span>
          <ElRadioGroup v-model="column" size="small">
            <ElRadioButton :value="2">2 列</ElRadioButton>
            <ElRadioButton :value="3">3 列</ElRadioButton>
            <ElRadioButton :value="4">4 列</ElRadioButton>
          </ElRadioGroup>
        </div>

        <div class="ctrl-item">
          <span class="ctrl-label">排列方向：</span>
          <ElRadioGroup v-model="direction" size="small">
            <ElRadioButton value="horizontal">水平</ElRadioButton>
            <ElRadioButton value="vertical">垂直</ElRadioButton>
          </ElRadioGroup>
        </div>

        <ElButton size="small" type="primary" @click="handleRefreshData"> 刷新数据 </ElButton>
      </div>

      <ElDivider />

      <!-- 1. Schema 纯数据驱动配置模式 -->
      <div class="demo-section">
        <div class="section-title">1. Schema 纯数据驱动模式 (:items="schemaItems")</div>
        <AtengDescriptions
          title="员工核心档案卡 (Schema Mode)"
          extra="机密等级：内部公开"
          :data="detailData"
          :items="schemaItems"
          :border="border"
          :size="size"
          :column="column"
          :direction="direction"
        />
      </div>

      <ElDivider />

      <!-- 2. SFC 声明式子组件模式 -->
      <div class="demo-section">
        <div class="section-title">
          2. SFC 声明式子组件模式 (&lt;AtengDescriptionsItem&gt; + 插槽自由定制)
        </div>
        <AtengDescriptions
          title="系统安全审计信息 (Declarative SFC Mode)"
          :data="detailData"
          :border="border"
          :size="size"
          :column="column"
          :direction="direction"
        >
          <AtengDescriptionsItem prop="userId" label="主键标识" :span="1" />
          <AtengDescriptionsItem
            prop="phone"
            label="安全手机"
            mask="phone"
            mask-char="#"
            :span="1"
          />
          <AtengDescriptionsItem
            prop="status"
            label="当前状态"
            dict-code="sys_user_status"
            :span="1"
          />
          <AtengDescriptionsItem prop="customAction" label="审计操作" :span="3">
            <template #customAction>
              <ElButton type="danger" size="small" plain> 强制下线 </ElButton>
              <ElButton type="warning" size="small" plain> 锁定账号 </ElButton>
              <ElButton type="primary" size="small" plain> 导出审计流水 </ElButton>
            </template>
          </AtengDescriptionsItem>
        </AtengDescriptions>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.descriptions-view {
  max-width: 1100px;
}

.controls-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  padding: 12px 16px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}

.ctrl-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ctrl-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.demo-section {
  padding: 8px 0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 16px;
}
</style>
