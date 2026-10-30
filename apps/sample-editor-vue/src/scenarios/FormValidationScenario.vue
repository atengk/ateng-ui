<script setup lang="ts">
/**
 * 场景五：表单校验联动与字数硬限制自验展厅 (Form Validation & Hard Limit)。
 *
 * 验证：
 * 1. 深度联动 Element Plus <el-form> 与 <el-form-item> 表单校验上下文；
 * 2. blur 与 change 事件精准触发校验规则（必填、最小字数与内容合法性）；
 * 3. maxLength 字符硬限制：在输入达到上限时 ProseMirror 事务直接拦截，状态栏显式警告；
 * 4. 表单提交、重置、校验状态自愈与表单禁用态联动。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref, reactive } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { AtengEditor, type AtengEditorInstance } from '@atengk/editor-vue';

interface ArticleForm {
  title: string;
  category: string;
  content: string;
}

const formRef = ref<FormInstance | null>(null);
const editorRef = ref<AtengEditorInstance | null>(null);

const form = reactive<ArticleForm>({
  title: '工业级富文本表单设计',
  category: 'tech',
  content: '<p>欢迎体验基于 TipTap 的企业级表单内容编辑！</p>',
});

const isFormDisabled = ref<boolean>(false);
const maxLengthLimit = ref<number>(80);

// 表单校验规则
const rules: FormRules<ArticleForm> = {
  title: [
    { required: true, message: '请输入文章主标题', trigger: 'blur' },
    { min: 3, max: 30, message: '标题长度应在 3 到 30 个字符之间', trigger: 'blur' },
  ],
  category: [{ required: true, message: '请选择文章分类', trigger: 'change' }],
  content: [
    {
      required: true,
      validator: (_rule, value, callback) => {
        if (!value || value.trim() === '' || value === '<p></p>') {
          callback(new Error('文章正文内容不能为空，请输入有效正文'));
          return;
        }
        // 统计纯文本长度
        const plainText = editorRef.value
          ? editorRef.value.getText()
          : value.replace(/<[^>]+>/g, '');
        if (plainText.trim().length < 5) {
          callback(new Error('文章正文纯文本长度不能少于 5 个字符'));
          return;
        }
        callback();
      },
      trigger: ['blur', 'change'],
    },
  ],
};

const handleBlur = (): void => {
  formRef.value?.validateField('content');
};

const handleChange = (): void => {
  formRef.value?.validateField('content');
};

const handleSubmit = async (): Promise<void> => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
    ElMessage.success('🎉 表单验证全部通过！文章已成功提交保存。');
  } catch {
    ElMessage.error('❌ 表单存在校验未通过项，请检查表单提示信息。');
  }
};

const handleReset = (): void => {
  form.title = '';
  form.category = 'tech';
  form.content = '';
  editorRef.value?.clearContent();
  formRef.value?.resetFields();
  ElMessage.info('已重置表单内容与校验提示');
};
</script>

<template>
  <div class="form-validation-scenario">
    <div class="scenario-panel">
      <!-- 顶部配置栏 -->
      <div class="scenario-controls">
        <div class="controls-left">
          <el-switch v-model="isFormDisabled" active-text="禁用整个表单 (disabled)" inline-prompt />
          <span class="control-label">字数硬限制 (maxLength):</span>
          <el-input-number v-model="maxLengthLimit" :min="20" :max="300" :step="10" size="small" />
        </div>
        <div class="controls-right">
          <el-button type="primary" size="small" @click="handleSubmit"> 提交文章表单 </el-button>
          <el-button size="small" @click="handleReset"> 重置表单 </el-button>
        </div>
      </div>

      <!-- 表单主体 -->
      <div class="form-container">
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-width="100px"
          :disabled="isFormDisabled"
          status-icon
        >
          <el-form-item label="文章标题" prop="title">
            <el-input v-model="form.title" placeholder="请输入文章主标题" clearable />
          </el-form-item>

          <el-form-item label="内容分类" prop="category">
            <el-select
              v-model="form.category"
              placeholder="请选择文章所属分类"
              style="width: 240px"
            >
              <el-option label="技术基础设施 (Infrastructure)" value="tech" />
              <el-option label="产品设计规范 (Design Specs)" value="design" />
              <el-option label="版本发布公报 (Release Notes)" value="release" />
            </el-select>
          </el-form-item>

          <el-form-item label="文章正文" prop="content">
            <div class="editor-item-wrapper">
              <AtengEditor
                ref="editorRef"
                v-model="form.content"
                :disabled="isFormDisabled"
                :max-length="maxLengthLimit"
                placeholder="请输入详细文章正文（支持段落、代码、表格排版）..."
                min-height="300px"
                @blur="handleBlur"
                @change="handleChange"
              />
              <div class="tip-text">
                💡 字符数限制设置为 <strong>{{ maxLengthLimit }}</strong> 字，达到限制时将通过
                ProseMirror 事务直接硬拦截输入并呈现告警红字。
              </div>
            </div>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-validation-scenario {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scenario-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scenario-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  background-color: var(--el-fill-color-light, #f5f7fa);
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
}

.controls-left,
.controls-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.control-label {
  font-size: 13px;
  color: var(--el-text-color-regular, #606266);
}

.form-container {
  padding: 20px 24px;
  background-color: var(--el-bg-color, #ffffff);
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
}

.editor-item-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.tip-text {
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}
</style>
