<script setup lang="ts">
/**
 * 场景七：官方 Element Plus 适配预设、远程数据源与兄弟生态装配切片看板。
 *
 * 遵循 ADR-0039 与 ADR-0044 规约：
 * 1. 验证 15 种官方 Element Plus 高频表单控件开箱即用渲染与数据双向绑定；
 * 2. 验证 DataSourceConfig 远程异步数据源驱动与上游字段级联依赖重拉；
 * 3. 验证富文本、代码编辑器、手写签名板与切片文件上传四大生态物料装配；
 * 4. 实时响应式数据模型调试面板。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import {
  AtengFormRenderer,
  FormWidgetRegistry,
  installElementPlusPreset,
} from '@atengk/form-designer-vue';
import type { FormSchema, DataSourceConfig, FormRendererInstance } from '@atengk/form-designer-vue';

// 实例化专属注册中心并一键安装全套 Element Plus 预设与生态物料
const customRegistry = installElementPlusPreset(new FormWidgetRegistry());

// 表单数据双向模型
const formData = reactive<Record<string, unknown>>({
  username: '张三',
  age: 28,
  province: '110000',
  city: '110100',
  urgency: true,
  score: 4.5,
  sliderVal: 60,
  themeColor: '#409EFF',
  notes: '企业核心供应链管理系统上线审批申请。',
  codeSnippet: '{\n  "status": "APPROVED",\n  "approver": "CTO"\n}',
  signatureImg: '',
});

// 模拟省份与城市的远程数据源
const cityDataSource: DataSourceConfig = {
  type: 'api',
  url: '/api/cities',
  params: { provinceId: '{{ province }}' },
  dependencies: ['province'],
  loader: async (_config, formState) => {
    const pId = formState.province as string;
    if (pId === '110000') {
      return [
        { label: '北京市海淀区', value: '110108' },
        { label: '北京市朝阳区', value: '110105' },
      ];
    }
    if (pId === '310000') {
      return [
        { label: '上海市黄浦区', value: '310101' },
        { label: '上海市浦东新区', value: '310115' },
      ];
    }
    return [];
  },
};

// 预设 Element Plus 完整全功能 Schema
const elSchema: FormSchema = {
  version: '1.0',
  formConfig: {
    layout: 'vertical',
    labelPosition: 'top',
    colon: true,
  },
  widgetList: [
    {
      id: 'w_grid_1',
      type: 'grid',
      isContainer: true,
      containerType: 'layout',
      props: { cols: 3, gutter: 16 },
      children: [
        {
          id: 'w_user',
          type: 'el-input',
          modelKey: 'username',
          label: '申请员工 (ElInput)',
          props: { placeholder: '请输入员工姓名', clearable: true },
          rules: [{ required: true, message: '员工姓名必填' }],
        },
        {
          id: 'w_age',
          type: 'el-input-number',
          modelKey: 'age',
          label: '员工年龄 (ElInputNumber)',
          props: { min: 18, max: 65, step: 1 },
        },
        {
          id: 'w_urgency',
          type: 'el-switch',
          modelKey: 'urgency',
          label: '加急审批 (ElSwitch)',
          props: { activeText: '是', inactiveText: '否' },
        },
      ],
    },
    {
      id: 'w_grid_2',
      type: 'grid',
      isContainer: true,
      containerType: 'layout',
      props: { cols: 2, gutter: 16 },
      children: [
        {
          id: 'w_prov',
          type: 'el-select',
          modelKey: 'province',
          label: '上游省份 (ElSelect 静态驱动)',
          props: {
            options: [
              { label: '北京市 (110000)', value: '110000' },
              { label: '上海市 (310000)', value: '310000' },
            ],
          },
        },
        {
          id: 'w_city',
          type: 'el-select',
          modelKey: 'city',
          label: '下属城区 (DataSource 级联动态拉取)',
          props: {
            placeholder: '请先选择上游省份',
            dataSource: cityDataSource,
          },
        },
      ],
    },
    {
      id: 'w_grid_3',
      type: 'grid',
      isContainer: true,
      containerType: 'layout',
      props: { cols: 3, gutter: 16 },
      children: [
        {
          id: 'w_score',
          type: 'el-rate',
          modelKey: 'score',
          label: '满意度评估 (ElRate)',
          props: { allowHalf: true },
        },
        {
          id: 'w_slider',
          type: 'el-slider',
          modelKey: 'sliderVal',
          label: '进度权重 (ElSlider)',
          props: { min: 0, max: 100 },
        },
        {
          id: 'w_color',
          type: 'el-color-picker',
          modelKey: 'themeColor',
          label: '主题标识色 (ElColorPicker)',
          props: { showAlpha: true },
        },
      ],
    },
    // 四大生态物料卡片
    {
      id: 'w_card_eco',
      type: 'card',
      isContainer: true,
      containerType: 'layout',
      props: {
        title: '四大兄弟生态物料装配实测 (Editor / Code / Signature / Upload)',
        bordered: true,
      },
      children: [
        {
          id: 'w_code',
          type: 'code-editor',
          modelKey: 'codeSnippet',
          label: '审批策略规则 (code-editor 控件)',
          props: { language: 'json', height: '140px' },
        },
        {
          id: 'w_editor',
          type: 'rich-editor',
          modelKey: 'notes',
          label: '详细审批批注 (rich-editor 控件)',
          props: { minHeight: '120px' },
        },
        {
          id: 'w_sign',
          type: 'signature',
          modelKey: 'signatureImg',
          label: '审批人手写电子签名 (signature 纯 Canvas 控件)',
          props: { height: 160 },
          rules: [{ required: true, message: '请在签名板上手写签署确认' }],
        },
        {
          id: 'w_upload',
          type: 'chunk-upload',
          modelKey: 'attachmentFiles',
          label: '附件上传 (chunk-upload 切片物料)',
          props: { drag: true, tip: '支持上传审批佐证材料' },
        },
      ],
    },
  ],
};

const formRendererRef = ref<FormRendererInstance | null>(null);

const handleSubmitSuccess = (data: Record<string, unknown>): void => {
  ElMessage.success('表单校验全部通过，数据模型提交就绪！');
  console.log('[ElementPlusScenario] 提交数据:', data);
};

const handleTriggerCascadeTest = async (): Promise<void> => {
  formData.province = formData.province === '110000' ? '310000' : '110000';
  formData.city = '';
  ElMessage.info(
    `已切换上游省份为 ${formData.province === '110000' ? '北京市' : '上海市'}，下游城市已重拉！`,
  );
};
</script>

<template>
  <div class="element-plus-scenario">
    <div class="scenario-intro">
      <div class="intro-header">
        <h2 class="title">场景七：官方 Element Plus 适配套件、动态数据源与兄弟生态物料装配</h2>
        <div class="actions">
          <el-button type="warning" size="small" @click="handleTriggerCascadeTest">
            🔄 模拟上游省份切换级联重拉
          </el-button>
          <el-button type="primary" size="small" @click="formRendererRef?.validate()">
            ✅ 触发全表单校验
          </el-button>
        </div>
      </div>
      <p class="subtitle">
        在次级导出路径 <code>@atengk/form-designer-vue/presets/element-plus</code> 中输出 15 种官方
        Element Plus 核心表单控件， 支持
        <code>DataSourceConfig</code>
        动态变量插值与级联请求，并无缝装配富文本、代码编辑器、手写签名与切片上传四大生态扩展。
      </p>
    </div>

    <div class="scenario-content">
      <!-- 左侧表单渲染器 -->
      <div class="renderer-box">
        <AtengFormRenderer
          ref="formRendererRef"
          :schema="elSchema"
          :form-data="formData"
          :registry="customRegistry"
          @submit="handleSubmitSuccess"
        />
      </div>

      <!-- 右侧实时数据查看面板 -->
      <div class="debug-box">
        <div class="debug-header">
          <span class="debug-title">🔍 表单数据模型 (formData) 实时响应监控</span>
        </div>
        <pre class="debug-code"><code>{{ JSON.stringify(formData, null, 2) }}</code></pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.element-plus-scenario {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 700px;
}

.scenario-intro {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

.subtitle {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-secondary, #909399);
}

.subtitle code {
  padding: 2px 6px;
  background-color: var(--el-fill-color-light, #f5f7fa);
  border-radius: 4px;
  font-family: monospace;
  color: var(--el-color-primary, #409eff);
}

.scenario-content {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 16px;
  align-items: start;
}

.renderer-box {
  padding: 24px;
  background: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color-light, #e4e7ed);
  border-radius: 6px;
}

.debug-box {
  background: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color-light, #e4e7ed);
  border-radius: 6px;
  overflow: hidden;
}

.debug-header {
  padding: 10px 14px;
  background: var(--el-fill-color-light, #fafafa);
  border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
}

.debug-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}

.debug-code {
  margin: 0;
  padding: 14px;
  max-height: 600px;
  overflow: auto;
  font-size: 12px;
  font-family: var(--el-font-family-monospace, monospace);
  line-height: 1.5;
  background-color: var(--el-fill-color-darker, #1e1e1e);
  color: #d4d4d4;
}
</style>
