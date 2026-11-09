<script setup lang="ts">
/**
 * 场景六：设计态画板、物料库、大纲树与 SortableJS 多层拖拽守卫切片看板。
 *
 * 遵循 ADR-0044、ADR-0039 与 Sample-First 体验规范：
 * 1. 集成 <AtengFormDesigner /> 顶层设计器与 useFormDesigner 响应式设计态状态机；
 * 2. 验证左侧双面板（物料面板 AtengFormStencil 与图层大纲树 AtengFormOutlineTree）；
 * 3. 验证中央多端画板（AtengFormCanvas，支持 PC / Pad / Mobile 手机壳仿真）；
 * 4. 演示 validateDropTarget 拖拽类型守卫针对非法嵌套（如子表单内嵌套子表单）的强力防御；
 * 5. 支持预设模板一键载入与实时 Schema JSON 结构化审阅。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  AtengFormDesigner,
  validateDropTarget,
  createDefaultWidget,
  createDraftManager,
} from '@atengk/form-designer-vue';
import type { FormSchema, FormDesignerInstance } from '@atengk/form-designer-vue';

const designerRef = ref<FormDesignerInstance | null>(null);
const jsonDialogVisible = ref<boolean>(false);
const currentJson = ref<string>('');
const sampleDraftManager = createDraftManager('sample_scenario_6');

// 预设模板 A：空白画板
const blankPreset: FormSchema = {
  version: '1.0',
  formConfig: {
    layout: 'vertical',
    labelPosition: 'top',
    colon: true,
  },
  widgetList: [],
};

// 预设模板 B：卡片与栅格嵌套排版
const layoutPreset: FormSchema = {
  version: '1.0',
  formConfig: {
    layout: 'vertical',
    labelPosition: 'top',
    colon: true,
  },
  widgetList: [
    {
      id: 'card_employee_info',
      type: 'card',
      isContainer: true,
      containerType: 'layout',
      props: {
        title: '员工基本档案 (LayoutContainer: Card)',
        bordered: true,
      },
      children: [
        {
          id: 'grid_personal',
          type: 'grid',
          isContainer: true,
          containerType: 'layout',
          props: { cols: 2, gutter: 16 },
          children: [
            {
              id: 'w_name',
              type: 'input',
              modelKey: 'name',
              label: '员工真实姓名',
              placeholder: '请输入中文真实姓名',
              rules: [{ required: true, message: '姓名不能为空' }],
            },
            {
              id: 'w_gender',
              type: 'radio',
              modelKey: 'gender',
              label: '性别',
              options: [
                { label: '男', value: 'M' },
                { label: '女', value: 'F' },
              ],
            },
          ],
        },
        {
          id: 'w_intro',
          type: 'textarea',
          modelKey: 'intro',
          label: '个人履历特长',
          placeholder: '请输入专业技术特长与过往业务项目背景...',
        },
      ],
    },
  ],
};

// 预设模板 C：全功能复杂单据（含子表单 DataContainer）
const complexPreset: FormSchema = {
  version: '1.0',
  formConfig: {
    layout: 'vertical',
    labelPosition: 'top',
    colon: true,
  },
  widgetList: [
    {
      id: 'card_order_header',
      type: 'card',
      isContainer: true,
      containerType: 'layout',
      props: { title: '物资申请单 (Card 分组)', bordered: true },
      children: [
        {
          id: 'grid_header',
          type: 'grid',
          isContainer: true,
          containerType: 'layout',
          props: { cols: 3, gutter: 12 },
          children: [
            {
              id: 'w_code',
              type: 'input',
              modelKey: 'orderCode',
              label: '申请流水号',
              rules: [{ required: true, message: '单号必填' }],
            },
            {
              id: 'w_dept',
              type: 'select',
              modelKey: 'dept',
              label: '申请部门',
              options: [
                { label: '基础架构组', value: 'infra' },
                { label: '智能工程院', value: 'ai' },
              ],
            },
            {
              id: 'w_level',
              type: 'select',
              modelKey: 'urgency',
              label: '紧急程度',
              options: [
                { label: '普通', value: 'normal' },
                { label: '特急 P0', value: 'critical' },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'subform_items',
      type: 'subform',
      isCollection: true,
      containerType: 'data',
      modelKey: 'purchaseItems',
      label: '采购明细清单 (DataContainer)',
      props: {
        displayMode: 'table',
        allowAdd: true,
        allowDelete: true,
      },
      children: [
        {
          id: 'col_item_name',
          type: 'input',
          modelKey: 'itemName',
          label: '物资名称',
          rules: [{ required: true, message: '物资名称必填' }],
        },
        {
          id: 'col_item_qty',
          type: 'input',
          modelKey: 'quantity',
          label: '采购数量',
        },
      ],
    },
  ],
};

const currentSchema = ref<FormSchema>(complexPreset);

const loadPreset = (preset: FormSchema, name: string): void => {
  if (designerRef.value) {
    designerRef.value.setSchema(preset);
    ElMessage.success(`已载入「${name}」模板`);
  }
};

const handleViewSchema = (): void => {
  if (designerRef.value) {
    const exported = designerRef.value.getSchema();
    currentJson.value = JSON.stringify(exported, null, 2);
    jsonDialogVisible.value = true;
  }
};

// 拖拽守卫模拟演练
const testGuardSubFormInSubForm = (): void => {
  const parentSubForm = createDefaultWidget('subform', { id: 'parent_sub' });
  const childSubForm = createDefaultWidget('subform', { id: 'child_sub' });
  const result = validateDropTarget(childSubForm, parentSubForm);

  if (!result.allowed) {
    ElMessage.warning(`🛡️ 守卫拦截成功: ${result.reason}`);
  } else {
    ElMessage.error('守卫未生效！');
  }
};

const testGuardSelfNest = (): void => {
  const card = createDefaultWidget('card', { id: 'card_my' });
  const result = validateDropTarget(card, card);

  if (!result.allowed) {
    ElMessage.warning(`🛡️ 守卫拦截成功: ${result.reason}`);
  } else {
    ElMessage.error('守卫未生效！');
  }
};

const testGuardValidDrop = (): void => {
  const parentSubForm = createDefaultWidget('subform', { id: 'parent_sub' });
  const input = createDefaultWidget('input');
  const result = validateDropTarget(input, parentSubForm);

  if (result.allowed) {
    ElMessage.success('✅ 守卫放行：明细子表单允许容纳常规输入控件');
  } else {
    ElMessage.error('守卫误判！');
  }
};

const testDraftWorkflow = (): void => {
  sampleDraftManager.save({ testKey: '草稿模拟数据', time: new Date().toLocaleTimeString() }, true);
  const draft = sampleDraftManager.get();
  if (draft) {
    ElMessage.success(`💾 草稿箱写入并恢复成功！更新时间: ${draft.updatedAt}`);
  }
};
</script>

<template>
  <div class="form-designer-scenario">
    <div class="scenario-intro">
      <div class="intro-header">
        <h2 class="title">场景六：多端视口仿真、草稿箱容灾、历史撤销重做与多目标代码导出</h2>
        <div class="actions">
          <el-button-group size="small">
            <el-button @click="loadPreset(blankPreset, '空白画板')">📄 空白画板</el-button>
            <el-button @click="loadPreset(layoutPreset, '排版容器模板')"
              >🔲 栅格/卡片模板</el-button
            >
            <el-button type="primary" @click="loadPreset(complexPreset, '复杂采购单据')"
              >📋 复杂子表单模板</el-button
            >
          </el-button-group>

          <el-button type="success" size="small" @click="handleViewSchema">
            🔍 查看当前 AST Schema
          </el-button>
        </div>
      </div>

      <!-- 拖拽守卫与特性说明实测栏 -->
      <div class="guard-bar">
        <span class="guard-label">🛡️ 核心特性实测：</span>
        <el-button size="small" type="warning" plain @click="testGuardSubFormInSubForm">
          守卫：SubForm 内套 SubForm (预期拦截)
        </el-button>
        <el-button size="small" type="warning" plain @click="testGuardSelfNest">
          守卫：容器拖入自身内部 (预期拦截)
        </el-button>
        <el-button size="small" type="success" plain @click="testGuardValidDrop">
          守卫：向 SubForm 添加 Input (预期放行)
        </el-button>
        <el-button size="small" type="primary" plain @click="testDraftWorkflow">
          💾 模拟草稿保存与读取
        </el-button>
        <el-tag type="info" size="small" effect="plain">
          ⏱️ 500ms 防抖草稿 · 移动仿真单列排版 · SFC/AST/Schema/Mock 四目标代码导出
        </el-tag>
      </div>
    </div>

    <!-- 设计器核心容器（接入 #custom-property 插槽逃生门） -->
    <div class="designer-container">
      <AtengFormDesigner ref="designerRef" :schema="currentSchema">
        <template #custom-property="{ widget, updateProperty }">
          <div v-if="widget && widget.type === 'input'" class="custom-slot-demo">
            <span class="custom-slot-tag">#custom-property 插槽逃生门：前后缀定制</span>
            <div class="custom-slot-inputs">
              <input
                class="slot-input"
                :value="widget.props?.prefix || ''"
                placeholder="输入框前缀 (prefix)"
                @input="updateProperty('prefix', ($event.target as HTMLInputElement).value)"
              />
              <input
                class="slot-input"
                :value="widget.props?.suffix || ''"
                placeholder="输入框后缀 (suffix)"
                @input="updateProperty('suffix', ($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>
        </template>
      </AtengFormDesigner>
    </div>

    <!-- 查看 AST Schema 弹窗 -->
    <el-dialog
      v-model="jsonDialogVisible"
      title="当前设计态三段式 AST Schema 结构"
      width="700px"
      append-to-body
    >
      <pre class="json-code"><code>{{ currentJson }}</code></pre>
      <template #footer>
        <el-button type="primary" @click="jsonDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.form-designer-scenario {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: calc(100vh - 170px);
  min-height: 720px;
}

.scenario-intro {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 20px;
  background: var(--el-bg-color, #ffffff);
  border-radius: 6px;
  border: 1px solid var(--el-border-color-light, #e4e7ed);
}

.intro-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.guard-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 8px 12px;
  background-color: var(--el-fill-color-light, #fafafa);
  border-radius: 4px;
  border: 1px dashed var(--el-border-color, #dcdfe6);
}

.guard-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular, #606266);
}

.designer-container {
  flex: 1;
  min-height: 0;
  height: 100%;
}

.custom-slot-demo {
  padding: 8px;
  background-color: var(--el-color-primary-light-9, #ecf5ff);
  border: 1px dashed var(--el-color-primary, #409eff);
  border-radius: 4px;
  margin-bottom: 8px;
}

.custom-slot-tag {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--el-color-primary, #409eff);
  margin-bottom: 6px;
}

.custom-slot-inputs {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.slot-input {
  height: 26px;
  padding: 0 8px;
  font-size: 11px;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 4px;
  background: var(--el-bg-color, #ffffff);
  color: var(--el-text-color-primary, #303133);
  outline: none;
}

.json-code {
  max-height: 480px;
  overflow: auto;
  background-color: var(--el-fill-color-darker, #1e1e1e);
  color: #d4d4d4;
  padding: 16px;
  border-radius: 6px;
  font-size: 12px;
  font-family: monospace;
  margin: 0;
}
</style>
