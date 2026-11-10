<script setup lang="ts">
/**
 * AtengSpreadsheet 核心电子表格统领表现容器组件。
 *
 * 遵循 ADR-0002、ADR-0009、ADR-0021 与 ADR-0049 规范，
 * 底层基于 Univer 引擎封装，提供多工作表切换、公式联动、模式分级与确定性销毁。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, onMounted, computed, watch } from 'vue';
import type {
  SpreadsheetProps,
  SpreadsheetEmits,
  SpreadsheetSnapshot,
  SpreadsheetRecord,
  SpreadsheetColumn,
} from '../types';
import { useSpreadsheet } from '../composables/use-spreadsheet';
import { useSpreadsheetThemeSync } from '../composables/use-spreadsheet-theme-sync';
import '../styles/index.css';

const props = withDefaults(defineProps<SpreadsheetProps>(), {
  snapshot: undefined,
  data: undefined,
  columns: undefined,
  mode: 'full',
  showToolbar: undefined,
  showFormulaBar: true,
  showSheetBar: true,
  readOnly: undefined,
  theme: 'auto',
  locale: 'zh-CN',
  worker: false,
  height: '100%',
  width: '100%',
  debounceWait: 200,
});

const emit = defineEmits<SpreadsheetEmits>();

const containerEl = ref<HTMLDivElement | null>(null);

// 计算模式与只读类名
const isReadOnly = computed(() => {
  if (typeof props.readOnly === 'boolean') {
    return props.readOnly;
  }
  return props.mode === 'readonly';
});

// 计算工具栏是否显示
const isShowToolbar = computed(() => {
  if (typeof props.showToolbar === 'boolean') {
    return props.showToolbar;
  }
  return props.mode !== 'compact';
});

// 双向绑定防回环回火锁 (Reentrancy Lock)
let isInternalEmitting = false;

const emitDataChange = (latestData: SpreadsheetRecord[]): void => {
  isInternalEmitting = true;
  emit('update:data', latestData);
  Promise.resolve().then(() => {
    isInternalEmitting = false;
  });
};

const emitSnapshotChange = (latestSnapshot: SpreadsheetSnapshot): void => {
  isInternalEmitting = true;
  emit('update:snapshot', latestSnapshot);
  emit('change', latestSnapshot);
  Promise.resolve().then(() => {
    isInternalEmitting = false;
  });
};

// 初始化无头状态机
const spreadsheet = useSpreadsheet({
  container: null,
  snapshot: props.snapshot,
  data: props.data,
  columns: props.columns,
  mode: props.mode,
  showToolbar: isShowToolbar.value,
  showFormulaBar: props.showFormulaBar,
  showSheetBar: props.showSheetBar,
  readOnly: isReadOnly.value,
  theme: props.theme,
  locale: props.locale,
  worker: props.worker,
  debounceWait: props.debounceWait,
  onDataChange: latestData => {
    emitDataChange(latestData);
  },
  onSnapshotChange: latestSnapshot => {
    emitSnapshotChange(latestSnapshot);
  },
});

// 计算容器高度与宽度样式
const containerStyle = computed(() => ({
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
}));

// 监听外部快照变动
watch(
  () => props.snapshot,
  newSnapshot => {
    if (isInternalEmitting) {
      return;
    }
    if (newSnapshot && spreadsheet.ready.value) {
      spreadsheet.setSnapshot(newSnapshot);
    }
  },
  { deep: true },
);

// 监听外部扁平数据行变动
watch(
  () => props.data,
  newData => {
    if (isInternalEmitting) {
      return;
    }
    if (newData && spreadsheet.ready.value) {
      spreadsheet.setData(newData, props.columns);
    }
  },
  { deep: true },
);

// 监听只读状态变动
watch(isReadOnly, val => {
  spreadsheet.setReadOnly(val);
});

// 监听当前激活表变化并触发通知
watch(spreadsheet.activeSheetId, sheetId => {
  if (sheetId) {
    emit('sheet-activate', sheetId);
  }
});

// 监听选区变化并触发通知
watch(spreadsheet.selection, range => {
  emit('selection-change', range);
});

// 宿主暗黑热跟随联动
const { currentResolvedTheme } = useSpreadsheetThemeSync(
  () => props.theme,
  resolvedTheme => {
    if (spreadsheet.ready.value) {
      spreadsheet.setTheme(resolvedTheme);
    }
  },
);

// 挂载时绑定容器元素并初始化
onMounted(() => {
  if (containerEl.value) {
    spreadsheet.containerRef.value = containerEl.value;
    spreadsheet.init(containerEl.value);
    // 触发就绪事件与初始主题同步
    if (spreadsheet.ready.value) {
      spreadsheet.setTheme(currentResolvedTheme.value);
      emit('ready', spreadsheet.getUniverAPI());
    }
  }
});

// 监听状态机就绪
watch(spreadsheet.ready, isReady => {
  if (isReady) {
    spreadsheet.setTheme(currentResolvedTheme.value);
    emit('ready', spreadsheet.getUniverAPI());
  }
});

// 显式暴露全部实例方法与状态
defineExpose({
  ready: spreadsheet.ready,
  loading: spreadsheet.loading,
  activeSheetId: spreadsheet.activeSheetId,
  sheetList: spreadsheet.sheetList,
  selection: spreadsheet.selection,
  isDirty: spreadsheet.isDirty,
  init: spreadsheet.init,
  getSnapshot: spreadsheet.getSnapshot,
  setSnapshot: (snapshot: SpreadsheetSnapshot) => {
    isInternalEmitting = true;
    spreadsheet.setSnapshot(snapshot);
    emit('update:snapshot', snapshot);
    Promise.resolve().then(() => {
      isInternalEmitting = false;
    });
  },
  getData: spreadsheet.getData,
  setData: (data: SpreadsheetRecord[], columns?: SpreadsheetColumn[]) => {
    isInternalEmitting = true;
    spreadsheet.setData(data, columns);
    emit('update:data', spreadsheet.getData());
    Promise.resolve().then(() => {
      isInternalEmitting = false;
    });
  },
  exportCsv: spreadsheet.exportCsv,
  exportJson: spreadsheet.exportJson,
  exportExcel: spreadsheet.exportExcel,
  addSheet: spreadsheet.addSheet,
  removeSheet: spreadsheet.removeSheet,
  activateSheet: spreadsheet.activateSheet,
  setReadOnly: spreadsheet.setReadOnly,
  setTheme: spreadsheet.setTheme,
  undo: spreadsheet.undo,
  redo: spreadsheet.redo,
  clear: spreadsheet.clear,
  resize: spreadsheet.resize,
  destroy: spreadsheet.destroy,
  getUniverAPI: spreadsheet.getUniverAPI,
  getUniver: spreadsheet.getUniver,
});
</script>

<template>
  <div
    class="at-spreadsheet"
    :class="{
      'at-spreadsheet--compact': mode === 'compact' || !isShowToolbar,
      'at-spreadsheet--readonly': isReadOnly,
      'at-spreadsheet--hide-sheetbar': !showSheetBar,
      'at-spreadsheet--hide-formulabar': !showFormulaBar,
    }"
    :style="containerStyle"
  >
    <!-- 头部自定义操作区插槽 -->
    <div v-if="$slots.header || $slots.extra" class="at-spreadsheet__header">
      <slot name="header" />
      <div v-if="$slots.extra" class="at-spreadsheet__extra">
        <slot name="extra" />
      </div>
    </div>

    <!-- 内部 Canvas 挂载节点 -->
    <div ref="containerEl" class="at-spreadsheet__container" />

    <!-- 底部状态栏插槽 -->
    <div v-if="$slots.footer" class="at-spreadsheet__footer">
      <slot
        name="footer"
        :active-sheet-id="spreadsheet.activeSheetId.value"
        :sheet-list="spreadsheet.sheetList.value"
        :is-dirty="spreadsheet.isDirty.value"
      />
    </div>

    <!-- 加载遮罩插槽 -->
    <div v-if="spreadsheet.loading.value && $slots.loading" class="at-spreadsheet__loading">
      <slot name="loading" />
    </div>

    <!-- 空数据占位插槽 -->
    <div
      v-if="!spreadsheet.loading.value && !spreadsheet.ready.value && $slots.empty"
      class="at-spreadsheet__empty"
    >
      <slot name="empty" />
    </div>
  </div>
</template>

<style scoped>
.at-spreadsheet {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
}

.at-spreadsheet__container {
  position: relative;
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
</style>
