<script setup lang="ts">
/**
 * AtengFlowClearConfirm 工具栏清空画布防误触气泡确认组件。
 *
 * @author Ateng
 * @since 2026-10-27
 */

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="at-flow-toolbar__popover">
      <div class="at-flow-toolbar__popover-content">
        <span class="at-flow-toolbar__popover-title">⚠️ 确认清空画布？</span>
        <p class="at-flow-toolbar__popover-desc">
          清空后画布上的所有节点和连线将被删除，此操作不可逆。
        </p>
        <div class="at-flow-toolbar__popover-actions">
          <button type="button" class="at-flow-toolbar__popover-btn" @click="emit('cancel')">
            取消
          </button>
          <button
            type="button"
            class="at-flow-toolbar__popover-btn is-danger"
            @click="emit('confirm')"
          >
            确定清空
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.at-flow-toolbar__popover {
  position: absolute;
  top: 36px;
  right: 0;
  z-index: 100;
  width: 220px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  padding: 12px;
}

.at-flow-toolbar__popover-title {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 4px;
}

.at-flow-toolbar__popover-desc {
  margin: 0 0 10px;
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
}

.at-flow-toolbar__popover-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.at-flow-toolbar__popover-btn {
  padding: 4px 10px;
  font-size: 11px;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s;
}

.at-flow-toolbar__popover-btn:hover {
  background-color: #f8fafc;
}

.at-flow-toolbar__popover-btn.is-danger {
  background-color: #ef4444;
  border-color: #dc2626;
  color: #ffffff;
}

.at-flow-toolbar__popover-btn.is-danger:hover {
  background-color: #dc2626;
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
