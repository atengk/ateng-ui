/**
 * 流程运行态流转追踪器悬停审计浮层状态机 Composable。
 *
 * 依据 ADR-0033，封装鼠标悬停节点的数据解析、防抖延时与相对定位计算。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { ref, type Ref } from 'vue';
import type { FlowNode, FlowStatusMap, ExecutionStatus, AuditRecord } from '../types';

export interface UseViewerAuditOptions {
  /** 宿主根容器 Ref */
  containerRef: Ref<HTMLElement | null>;
  /** 响应式状态映射字典 Getter */
  getStatusMap: () => FlowStatusMap | undefined;
  /** 触发节点悬停事件回调 */
  onNodeHover?: (node: FlowNode | null, auditList?: AuditRecord[], event?: MouseEvent) => void;
}

export function useViewerAudit(options: UseViewerAuditOptions) {
  const isPopoverVisible = ref(false);
  const hoverNode = ref<FlowNode | null>(null);
  const hoverStatus = ref<ExecutionStatus | undefined>(undefined);
  const hoverAuditList = ref<AuditRecord[]>([]);
  const popoverX = ref(0);
  const popoverY = ref(0);

  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 关闭浮层。
   */
  const closePopover = (): void => {
    isPopoverVisible.value = false;
    hoverNode.value = null;
    hoverStatus.value = undefined;
    hoverAuditList.value = [];
    options.onNodeHover?.(null, undefined);
  };

  /**
   * 打开悬停浮层。
   */
  const showPopover = (node: FlowNode, e: MouseEvent): void => {
    const statusMap = options.getStatusMap();
    const item = statusMap?.[node.id];
    const s = typeof item === 'string' ? item : item?.status;
    const status = s || (node.properties?.status as ExecutionStatus | undefined);

    const rawAudit =
      typeof item === 'object' && item?.audit
        ? item.audit
        : (node.properties?.audit as AuditRecord[] | undefined);
    const auditList = rawAudit ?? [];

    if (!status && auditList.length === 0) {
      return;
    }

    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }

    hoverNode.value = node;
    hoverStatus.value = status;
    hoverAuditList.value = auditList;

    if (options.containerRef.value) {
      const rect = options.containerRef.value.getBoundingClientRect();
      popoverX.value = Math.max(10, Math.min(rect.width - 290, e.clientX - rect.left - 130));
      popoverY.value = Math.max(10, e.clientY - rect.top - 120);
    }

    isPopoverVisible.value = true;
    options.onNodeHover?.(node, hoverAuditList.value, e);
  };

  /**
   * 延迟关闭浮层（允许鼠标移入浮层卡片操作）。
   */
  const scheduleClosePopover = (): void => {
    if (hideTimer) {
      clearTimeout(hideTimer);
    }
    hideTimer = setTimeout(() => {
      closePopover();
      hideTimer = null;
    }, 160);
  };

  /**
   * 取消防抖延时关闭。
   */
  const cancelClosePopover = (): void => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  /**
   * 确定性清理定时器资源。
   */
  const disposeAudit = (): void => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  return {
    isPopoverVisible,
    hoverNode,
    hoverStatus,
    hoverAuditList,
    popoverX,
    popoverY,
    showPopover,
    closePopover,
    scheduleClosePopover,
    cancelClosePopover,
    disposeAudit,
  };
}
