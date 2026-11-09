<script setup lang="ts">
/**
 * @atengk/form-designer-vue 动态明细子表单容器控件 (AtengSubForm)。
 *
 * 遵循 ADR-0044 规约，属于 DataContainer 数据容器：
 * 在数据模型中产生独立数组分支（formData.items = [...]），具有行作用域；
 * 原生支持 table 紧凑表格与 dialog-list 卡片弹窗双模交互，具备行内字段校验精确定位。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, computed } from 'vue';
import type { FormWidget } from '../types';
import { defaultWidgetRegistry } from '../registry';
import type { FormWidgetRegistry } from '../registry';
import { formatReadonlyValue } from '../utils/format';
import type { ReadonlyFormatOptions } from '../utils/format';

interface Props {
  widget: FormWidget;
  modelValue?: Array<Record<string, unknown>>;
  disabled?: boolean;
  readonly?: boolean;
  errors?: Record<string, string>;
  registry?: FormWidgetRegistry;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  disabled: false,
  readonly: false,
  errors: () => ({}),
  registry: () => defaultWidgetRegistry,
});

const emit = defineEmits<{
  'update:modelValue': [rows: Array<Record<string, unknown>>];
  change: [rows: Array<Record<string, unknown>>];
  'row-add': [row: Record<string, unknown>, index: number];
  'row-delete': [row: Record<string, unknown>, index: number];
}>();

const rows = computed<Array<Record<string, unknown>>>(() => {
  return Array.isArray(props.modelValue) ? props.modelValue : [];
});

const children = computed<FormWidget[]>(() => {
  return props.widget.children || [];
});

const displayMode = computed<'table' | 'dialog-list'>(() => {
  return (props.widget.props?.displayMode as 'table' | 'dialog-list') || 'table';
});

const allowAdd = computed<boolean>(() => {
  if (props.readonly || props.disabled) return false;
  if (props.widget.props?.allowAdd === false) return false;
  const max = Number(props.widget.props?.maxRows);
  if (max > 0 && rows.value.length >= max) return false;
  return true;
});

const allowDelete = computed<boolean>(() => {
  if (props.readonly || props.disabled) return false;
  if (props.widget.props?.allowDelete === false) return false;
  const min = Number(props.widget.props?.minRows);
  if (min > 0 && rows.value.length <= min) return false;
  return true;
});

// 构建新行默认数据
const createDefaultRow = (): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  for (const child of children.value) {
    if (child.modelKey) {
      row[child.modelKey] = child.defaultValue !== undefined ? child.defaultValue : '';
    }
  }
  return row;
};

// 增加一行
const handleAddRow = (): void => {
  const newRow = createDefaultRow();
  const nextRows = [...rows.value, newRow];
  emit('update:modelValue', nextRows);
  emit('change', nextRows);
  emit('row-add', newRow, nextRows.length - 1);
};

// 删除一行
const handleDeleteRow = (index: number): void => {
  const deletedRow = rows.value[index] || {};
  const nextRows = rows.value.filter((_, idx) => idx !== index);
  emit('update:modelValue', nextRows);
  emit('change', nextRows);
  emit('row-delete', deletedRow, index);
};

// 更新单元格值
const handleCellChange = (rowIndex: number, modelKey: string, val: unknown): void => {
  const nextRows = rows.value.map((r, idx) => {
    if (idx === rowIndex) {
      return { ...r, [modelKey]: val };
    }
    return r;
  });
  emit('update:modelValue', nextRows);
  emit('change', nextRows);
};

// 检查单元格校验错误
const getCellError = (rowIndex: number, childModelKey?: string): string | undefined => {
  if (!childModelKey || !props.widget.modelKey) return undefined;
  const path = `${props.widget.modelKey}[${rowIndex}].${childModelKey}`;
  return props.errors?.[path];
};

// 弹窗表单交互状态 (dialog-list 模式)
const isModalOpen = ref<boolean>(false);
const editingRowIndex = ref<number>(-1);
const editingRowDraft = ref<Record<string, unknown>>({});

const openAddModal = (): void => {
  editingRowIndex.value = -1;
  editingRowDraft.value = createDefaultRow();
  isModalOpen.value = true;
};

const openEditModal = (index: number): void => {
  editingRowIndex.value = index;
  editingRowDraft.value = { ...(rows.value[index] || {}) };
  isModalOpen.value = true;
};

const saveModalDraft = (): void => {
  if (editingRowIndex.value === -1) {
    // 新增
    const nextRows = [...rows.value, { ...editingRowDraft.value }];
    emit('update:modelValue', nextRows);
    emit('change', nextRows);
    emit('row-add', editingRowDraft.value, nextRows.length - 1);
  } else {
    // 修改
    const nextRows = rows.value.map((r, idx) => {
      if (idx === editingRowIndex.value) {
        return { ...editingRowDraft.value };
      }
      return r;
    });
    emit('update:modelValue', nextRows);
    emit('change', nextRows);
  }
  isModalOpen.value = false;
};
</script>

<template>
  <div class="at-subform" :class="[`mode-${displayMode}`, { 'is-readonly': readonly }]">
    <!-- 顶栏标题与统计 -->
    <div class="at-subform-header">
      <div class="at-subform-title">
        <span>{{ widget.label || '明细子表单' }}</span>
        <span class="at-subform-count">({{ rows.length }} 条明细)</span>
      </div>
      <button
        v-if="allowAdd"
        type="button"
        class="at-subform-btn at-subform-btn-add"
        @click="displayMode === 'dialog-list' ? openAddModal() : handleAddRow()"
      >
        + {{ widget.props?.addButtonText || '新增一行' }}
      </button>
    </div>

    <!-- 模式一：紧凑表格模式 (table) -->
    <div v-if="displayMode === 'table'" class="at-subform-table-wrapper">
      <table class="at-subform-table">
        <thead>
          <tr>
            <th class="col-index">#</th>
            <th v-for="child in children" :key="child.id">
              {{ child.label || child.modelKey }}
            </th>
            <th v-if="allowDelete" class="col-action">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0" class="at-subform-empty-row">
            <td :colspan="children.length + (allowDelete ? 2 : 1)">
              <div class="at-subform-empty-text">
                {{ widget.props?.emptyText || '暂无明细数据' }}
              </div>
            </td>
          </tr>
          <tr v-for="(row, rIdx) in rows" :key="rIdx">
            <td class="col-index">{{ rIdx + 1 }}</td>
            <td
              v-for="child in children"
              :key="child.id"
              class="at-subform-cell"
              :class="{ 'has-error': Boolean(getCellError(rIdx, child.modelKey)) }"
            >
              <!-- 只读脱壳渲染 -->
              <span v-if="readonly" class="at-subform-readonly-cell">
                {{
                  formatReadonlyValue(
                    child.modelKey ? row[child.modelKey] : '',
                    (child.props || {}) as ReadonlyFormatOptions,
                  )
                }}
              </span>

              <!-- 编辑控件渲染 -->
              <div v-else class="at-subform-cell-editor">
                <component
                  :is="registry.get(child.type)?.component"
                  v-if="registry.get(child.type) && child.modelKey"
                  :widget="child"
                  :model-value="row[child.modelKey]"
                  :disabled="disabled"
                  size="small"
                  @update:model-value="
                    (val: unknown) => child.modelKey && handleCellChange(rIdx, child.modelKey, val)
                  "
                />
                <span v-else>{{ child.modelKey ? row[child.modelKey] : '-' }}</span>

                <!-- 单元格校验错误提示 -->
                <div v-if="getCellError(rIdx, child.modelKey)" class="at-subform-cell-error">
                  {{ getCellError(rIdx, child.modelKey) }}
                </div>
              </div>
            </td>

            <!-- 操作列 -->
            <td v-if="allowDelete" class="col-action">
              <button
                type="button"
                class="at-subform-btn-delete"
                title="删除此行"
                @click="handleDeleteRow(rIdx)"
              >
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 模式二：卡片列表与弹窗填报 (dialog-list) -->
    <div v-else class="at-subform-list-wrapper">
      <div v-if="rows.length === 0" class="at-subform-empty-box">
        {{ widget.props?.emptyText || '暂无明细卡片数据' }}
      </div>
      <div v-for="(row, rIdx) in rows" :key="rIdx" class="at-subform-card-item">
        <div class="card-item-header">
          <span class="card-item-badge">#{{ rIdx + 1 }}</span>
          <div class="card-item-actions">
            <button
              v-if="!readonly"
              type="button"
              class="at-subform-btn-link"
              @click="openEditModal(rIdx)"
            >
              编辑
            </button>
            <button
              v-if="allowDelete"
              type="button"
              class="at-subform-btn-link is-danger"
              @click="handleDeleteRow(rIdx)"
            >
              删除
            </button>
          </div>
        </div>

        <div class="card-item-fields">
          <div v-for="child in children" :key="child.id" class="card-field-row">
            <span class="card-field-label">{{ child.label || child.modelKey }}:</span>
            <span class="card-field-val">
              {{
                formatReadonlyValue(
                  child.modelKey ? row[child.modelKey] : '',
                  (child.props || {}) as ReadonlyFormatOptions,
                )
              }}
            </span>
            <div v-if="getCellError(rIdx, child.modelKey)" class="at-subform-cell-error">
              {{ getCellError(rIdx, child.modelKey) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 弹窗填报遮罩层与表单 (dialog-list 专用) -->
    <div v-if="isModalOpen" class="at-subform-modal-overlay">
      <div class="at-subform-modal-content">
        <div class="modal-header">
          <h4>
            {{ editingRowIndex === -1 ? '新增明细条目' : `编辑第 ${editingRowIndex + 1} 行条目` }}
          </h4>
          <button type="button" class="modal-close-btn" @click="isModalOpen = false">×</button>
        </div>
        <div class="modal-body">
          <div v-for="child in children" :key="child.id" class="modal-form-item">
            <label class="modal-form-label">{{ child.label || child.modelKey }}</label>
            <component
              :is="registry.get(child.type)?.component"
              v-if="registry.get(child.type) && child.modelKey"
              :widget="child"
              :model-value="editingRowDraft[child.modelKey]"
              @update:model-value="
                (val: unknown) => child.modelKey && (editingRowDraft[child.modelKey] = val)
              "
            />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="at-subform-btn" @click="isModalOpen = false">取消</button>
          <button
            type="button"
            class="at-subform-btn at-subform-btn-primary"
            @click="saveModalDraft"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.at-subform {
  width: 100%;
  margin-bottom: 20px;
  box-sizing: border-box;
}

.at-subform-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.at-subform-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--at-form-text-color, #1e293b);
  display: flex;
  align-items: center;
  gap: 8px;
}

.at-subform-count {
  font-size: 13px;
  font-weight: normal;
  color: var(--at-form-subtext-color, #64748b);
}

.at-subform-btn {
  padding: 6px 14px;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid var(--at-form-border-color, #cbd5e1);
  background: var(--at-form-bg-color, #ffffff);
  color: var(--at-form-text-color, #334155);
}

.at-subform-btn-add {
  background: var(--at-form-primary-color, #3b82f6);
  color: #ffffff;
  border-color: var(--at-form-primary-color, #3b82f6);
}

.at-subform-btn-primary {
  background: var(--at-form-primary-color, #3b82f6);
  color: #ffffff;
  border-color: var(--at-form-primary-color, #3b82f6);
}

.at-subform-table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--at-form-border-color, #e2e8f0);
  border-radius: 8px;
}

.at-subform-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;
}

.at-subform-table th {
  background: var(--at-form-header-bg, #f8fafc);
  padding: 10px 12px;
  font-weight: 600;
  border-bottom: 1px solid var(--at-form-border-color, #e2e8f0);
  color: var(--at-form-text-color, #1e293b);
}

.at-subform-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--at-form-border-color, #f1f5f9);
  vertical-align: middle;
}

.col-index {
  width: 44px;
  text-align: center;
}

.col-action {
  width: 70px;
  text-align: center;
}

.at-subform-cell.has-error {
  background-color: #fef2f2;
}

.at-subform-cell-error {
  color: #ef4444;
  font-size: 12px;
  margin-top: 4px;
}

.at-subform-btn-delete {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-size: 12px;
}

.at-subform-empty-text,
.at-subform-empty-box {
  text-align: center;
  color: #94a3b8;
  padding: 24px;
  font-size: 13px;
}

.at-subform-list-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.at-subform-card-item {
  border: 1px solid var(--at-form-border-color, #e2e8f0);
  border-radius: 8px;
  padding: 12px 16px;
  background: #ffffff;
}

.card-item-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.card-item-badge {
  font-weight: 600;
  font-size: 13px;
  color: #3b82f6;
}

.card-item-actions {
  display: flex;
  gap: 12px;
}

.at-subform-btn-link {
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 13px;
  cursor: pointer;
}

.at-subform-btn-link.is-danger {
  color: #ef4444;
}

.card-field-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 4px;
}

.card-field-label {
  color: #64748b;
  min-width: 80px;
}

.card-field-val {
  color: #1e293b;
  font-weight: 500;
}

.at-subform-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.at-subform-modal-content {
  background: #ffffff;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  padding: 20px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.modal-header h4 {
  margin: 0;
  font-size: 16px;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 20px;
}

.modal-form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.modal-form-label {
  font-size: 13px;
  color: #475569;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
