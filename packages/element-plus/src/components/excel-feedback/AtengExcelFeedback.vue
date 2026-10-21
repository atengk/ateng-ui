<script setup lang="ts">
/**
 * Excel 导入错误明细与 Fesod 标红批注回写下载反馈弹窗组件。
 *
 * 核心特性：
 * 1. 结构化错误明细展示：基于 ElTable 呈现行号、列名与错误原因，空值防御保底；
 * 2. 剪贴板一键导出：一键复制结构化错误列表到系统剪贴板，联动交互反馈；
 * 3. 双模批注回写闭环：支持 fileUrl 静态地址与 downloadAction 异步流式拉取，无批注文件时自动隐藏；
 * 4. 深度联动底层引擎：复用 @atengk/vue 的 useExcel 与 @atengk/core 的 Blob 双态错误识别防线。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, shallowRef, computed, watch } from 'vue';
import { ElTable, ElTableColumn, ElPagination, ElButton, ElAlert, ElMessage } from 'element-plus';
import { useExcel } from '@atengk/vue';
import type {
  AtengExcelFeedbackProps,
  AtengExcelFeedbackEmits,
  AtengExcelFeedbackExpose,
  ExcelFeedbackItem,
} from './types';
import AtengDialog from '../dialog/AtengDialog.vue';
import type { AtengDialogInstance } from '../dialog';

defineOptions({
  name: 'AtengExcelFeedback',
});

const props = withDefaults(defineProps<AtengExcelFeedbackProps>(), {
  modelValue: false,
  title: '导入校验失败',
  errors: () => [],
  fileUrl: undefined,
  downloadAction: undefined,
  fileName: '导入错误明细批注.xlsx',
  width: '720px',
  showCopy: true,
  copyText: '复制错误信息',
  downloadText: '下载标红批注 Excel',
  closeText: '关闭',
  pageSize: 10,
  destroyOnClose: false,
  appendToBody: true,
});

const emit = defineEmits<AtengExcelFeedbackEmits>();

const dialogRef = shallowRef<AtengDialogInstance | null>(null);
const currentPage = ref(1);
const internalActionLoading = ref(false);

// 1. 集成 @atengk/vue 的 useExcel 核心状态机
const { downloadFeedback, exporting } = useExcel({
  filename: props.fileName || '导入错误明细批注.xlsx',
});

const downloadLoading = computed(() => exporting.value || internalActionLoading.value);

/**
 * 空安全保底错误明细列表。
 */
const safeErrors = computed<ExcelFeedbackItem[]>(() => {
  return Array.isArray(props.errors) ? props.errors : [];
});

const totalErrors = computed(() => safeErrors.value.length);

/**
 * 是否存在可供下载的标红批注文件。
 */
const hasAnnotatedFile = computed(() => {
  return Boolean(props.fileUrl || props.downloadAction);
});

/**
 * 当前页分页切片数据。
 */
const pagedData = computed<ExcelFeedbackItem[]>(() => {
  const size = props.pageSize > 0 ? props.pageSize : 10;
  const start = (currentPage.value - 1) * size;
  return safeErrors.value.slice(start, start + size);
});

// 当外部错误列表或弹窗打开时，重置分页到第一页
watch(
  () => [props.modelValue, props.errors],
  ([newVal]) => {
    if (newVal) {
      currentPage.value = 1;
    }
  },
);

/**
 * 格式化错误列表为便于阅读的纯文本。
 */
function formatErrorText(items: ExcelFeedbackItem[]): string {
  if (!items || items.length === 0) {
    return '';
  }
  return items
    .map(item => {
      const col = item.columnName ? `[${item.columnName}] ` : '';
      return `第 ${item.rowNum} 行 ${col}${item.errorMessage}`;
    })
    .join('\n');
}

/**
 * 平台中立剪贴板写入工具函数。
 */
async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 降级使用 textarea 选区复制
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch {
    return false;
  }
}

/**
 * 一键复制错误信息到系统剪贴板。
 */
async function copyErrors(): Promise<boolean> {
  const text = formatErrorText(safeErrors.value);
  if (!text) {
    return false;
  }

  const success = await copyToClipboard(text);
  if (success) {
    emit('copy', text);
    ElMessage.success('复制成功');
  }
  return success;
}

/**
 * 触发下载标红批注 Excel 文件。
 */
async function downloadAnnotatedExcel(): Promise<boolean> {
  if (!hasAnnotatedFile.value) {
    return false;
  }

  internalActionLoading.value = true;
  try {
    const target = props.downloadAction || (props.fileUrl as string);
    const filename = await downloadFeedback(target, {
      filename: props.fileName || '导入错误明细批注.xlsx',
    });
    emit('download-success', filename);
    return true;
  } catch (err) {
    emit('download-error', err);
    return false;
  } finally {
    internalActionLoading.value = false;
  }
}

function handleVisibleChange(visible: boolean): void {
  emit('update:modelValue', visible);
}

function handleClose(): void {
  emit('update:modelValue', false);
  emit('close');
}

defineExpose<AtengExcelFeedbackExpose>({
  copyErrors,
  downloadAnnotatedExcel,
  downloadLoading,
  dialogRef,
});
</script>

<template>
  <ateng-dialog
    ref="dialogRef"
    class="at-excel-feedback"
    :model-value="modelValue"
    :title="title"
    :width="width"
    :destroy-on-close="destroyOnClose"
    :append-to-body="appendToBody"
    :show-confirm="false"
    :show-cancel="false"
    @update:model-value="handleVisibleChange"
    @close="handleClose"
  >
    <!-- 1. 顶部醒目统计警示条 -->
    <div class="at-excel-feedback__alert">
      <el-alert
        type="error"
        :closable="false"
        show-icon
        :title="`共校验发现 ${totalErrors} 条错误记录，请根据下方明细修正后重新导入`"
      />
    </div>

    <!-- 2. 结构化错误明细表格 -->
    <el-table :data="pagedData" border stripe class="at-excel-feedback__table" max-height="360">
      <el-table-column prop="rowNum" label="行号" width="90" align="center" />
      <el-table-column prop="columnName" label="列名/字段" width="160" align="center">
        <template #default="{ row }">
          <span>{{ row.columnName || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="errorMessage" label="错误原因" min-width="240">
        <template #default="{ row }">
          <span class="at-excel-feedback__error-reason">{{ row.errorMessage }}</span>
        </template>
      </el-table-column>
    </el-table>

    <!-- 3. 表格分页栏 -->
    <div v-if="totalErrors > pageSize" class="at-excel-feedback__pagination">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="totalErrors"
        layout="total, prev, pager, next"
        size="small"
      />
    </div>

    <!-- 4. 底部扩展操作按钮栏 -->
    <template #footer>
      <div class="at-excel-feedback__footer">
        <div class="at-excel-feedback__footer-actions">
          <el-button
            v-if="showCopy"
            type="primary"
            plain
            :disabled="totalErrors === 0"
            @click="copyErrors"
          >
            {{ copyText }}
          </el-button>
          <el-button
            v-if="hasAnnotatedFile"
            type="success"
            :loading="downloadLoading"
            @click="downloadAnnotatedExcel"
          >
            {{ downloadText }}
          </el-button>
        </div>
        <div class="at-excel-feedback__footer-close">
          <el-button @click="handleClose">
            {{ closeText }}
          </el-button>
        </div>
      </div>
    </template>
  </ateng-dialog>
</template>

<style scoped lang="scss">
.at-excel-feedback {
  &__alert {
    margin-bottom: 16px;
  }

  &__table {
    width: 100%;
  }

  &__error-reason {
    color: var(--el-color-danger, #f56c6c);
    word-break: break-all;
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;

    &-actions {
      display: flex;
      gap: 8px;
    }
  }
}
</style>
