<script setup lang="ts">
/**
 * AtengExcelExport 声明式流式 Excel 导出按钮组件。
 *
 * 核心特性：
 * 1. 表格上下文感知：自动通过 Provide/Inject 获取父级 AtengTable 检索条件与跨页勾选行；
 * 2. 智能多模分支：支持单按钮智能判定与下拉菜单手动切换（全量导出 / 选中导出）；
 * 3. 防刷防重保护：导出中自动开启 Loading 动画并禁用重复点击；
 * 4. 异常安全防御：捕获后端业务错误与异常，保障不下载损坏文件。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, computed, inject } from 'vue';
import { ElButton, ElDropdown, ElDropdownMenu, ElDropdownItem, ElMessage } from 'element-plus';
import { checkBlobForJsonError, saveBlobAsFile } from '@atengk/core';
import { ATENG_TABLE_CONTEXT_KEY, type AtengTableContext } from '../shared/context';
import { IconExport } from './icons';
import type {
  AtengExcelExportProps,
  AtengExcelExportEmits,
  AtengExcelExportSlots,
  AtengExcelExportExpose,
  ExcelExportType,
} from './types';

defineOptions({
  name: 'AtengExcelExport',
});

const props = withDefaults(defineProps<AtengExcelExportProps>(), {
  action: undefined,
  filename: undefined,
  params: undefined,
  selectedIds: undefined,
  mode: 'button',
  type: 'primary',
  size: undefined,
  plain: false,
  round: false,
  text: '导出数据',
  disabled: false,
  loading: false,
  customClass: '',
});

const emit = defineEmits<AtengExcelExportEmits>();
defineSlots<AtengExcelExportSlots>();

const tableContext = inject<AtengTableContext | null>(ATENG_TABLE_CONTEXT_KEY, null);

const internalLoading = ref(false);
const isLoading = computed<boolean>(() => props.loading || internalLoading.value);

// 提取当前选中的行记录
const selectedRows = computed<Record<string, unknown>[]>(() => {
  if (Array.isArray(props.selectedIds)) {
    return props.selectedIds.map(id => ({ id }));
  }
  return tableContext?.getSelectedRows?.() || [];
});

const selectedCount = computed<number>(() => selectedRows.value.length);

/**
 * 触发导出动作。
 */
async function triggerExport(exportType?: ExcelExportType): Promise<void> {
  if (isLoading.value || props.disabled) {
    return;
  }

  // 1. 判定导出模式
  const actualType: ExcelExportType = exportType || (selectedCount.value > 0 ? 'selected' : 'all');

  emit('export-start', actualType);

  // 2. 组装请求入参
  let payload: Record<string, unknown> = {};

  if (actualType === 'selected') {
    const ids =
      props.selectedIds ||
      selectedRows.value.map(row => (row.id ?? row.key ?? row) as string | number);
    payload = {
      ...(props.params || {}),
      ids,
      selectedRows: selectedRows.value,
    };
  } else {
    const tableQuery = tableContext?.getQueryParams?.() || {};
    payload = {
      ...tableQuery,
      ...(props.params || {}),
    };
  }

  // 3. 执行导出
  internalLoading.value = true;
  try {
    if (typeof props.action === 'function') {
      const result = await props.action(payload);

      // 如果返回 Blob，进行标准的客户端下载流转
      if (result instanceof Blob) {
        // ADR-0004 双态异常防御：若 Blob 伪装承载了 JSON 业务错误报文，则提取错误并熔断，绝不下载损坏文件
        await checkBlobForJsonError(result, result.type, 200);

        saveBlobAsFile(result, props.filename || `export_${Date.now()}.xlsx`, { revokeDelay: 0 });
      }

      ElMessage.success('导出数据成功');
      emit('export-success', result);
    } else {
      ElMessage.info('未配置 action 导出动作');
      emit('export-success', payload);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : '导出失败，请重试';
    ElMessage.error(msg);
    emit('export-error', error);
  } finally {
    internalLoading.value = false;
  }
}

function handleCommand(command: string | number | object): void {
  triggerExport(command as ExcelExportType);
}

defineExpose<AtengExcelExportExpose>({
  triggerExport,
  isLoading,
});
</script>

<template>
  <div :class="['at-excel-export', customClass]">
    <!-- 多模下拉菜单模式 -->
    <template v-if="mode === 'dropdown'">
      <el-dropdown trigger="click" :disabled="disabled || isLoading" @command="handleCommand">
        <el-button
          :type="type"
          :size="size"
          :plain="plain"
          :round="round"
          :disabled="disabled"
          :loading="isLoading"
          :icon="IconExport"
        >
          <slot :loading="isLoading">
            <span>{{ text }}</span>
          </slot>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="selected" :disabled="selectedCount === 0">
              导出选中数据 ({{ selectedCount }} 条)
            </el-dropdown-item>
            <el-dropdown-item command="all"> 导出全部数据 </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </template>

    <!-- 单按钮智能模式 -->
    <template v-else>
      <el-button
        :type="type"
        :size="size"
        :plain="plain"
        :round="round"
        :disabled="disabled"
        :loading="isLoading"
        :icon="IconExport"
        @click="() => triggerExport()"
      >
        <slot :loading="isLoading">
          <span>{{ text }}</span>
          <span v-if="selectedCount > 0" class="at-excel-export__badge">
            ({{ selectedCount }})
          </span>
        </slot>
      </el-button>
    </template>
  </div>
</template>

<style scoped lang="scss">
.at-excel-export {
  display: inline-flex;
  vertical-align: middle;

  &__badge {
    margin-left: 4px;
    font-size: 12px;
    opacity: 0.85;
  }
}
</style>
