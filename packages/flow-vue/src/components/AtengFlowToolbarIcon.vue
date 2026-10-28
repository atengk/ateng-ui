<script setup lang="ts">
/**
 * AtengFlowToolbarIcon 工具栏内置矢量图标组件。
 *
 * @author Ateng
 * @since 2026-10-27
 */

defineProps<{
  name:
    | 'undo'
    | 'redo'
    | 'zoom-in'
    | 'zoom-out'
    | 'fit-view'
    | 'layout-lr'
    | 'layout-tb'
    | 'grid'
    | 'minimap'
    | 'validate'
    | 'clear';
}>();
</script>

<template>
  <svg viewBox="0 0 24 24" class="at-flow-icon" fill="none" stroke="currentColor" stroke-width="2">
    <path
      v-if="name === 'undo'"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M3 10h10a5 5 0 0 1 5 5v2m-15-7l4-4m-4 4l4 4"
    />
    <path
      v-else-if="name === 'redo'"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M21 10H11a5 5 0 0 0-5 5v2m15-7l-4-4m4 4l-4 4"
    />
    <g v-else-if="name === 'zoom-in'">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </g>
    <g v-else-if="name === 'zoom-out'">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </g>
    <path
      v-else-if="name === 'fit-view'"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
    />
    <g v-else-if="name === 'layout-lr'">
      <rect x="3" y="8" width="6" height="8" rx="1" />
      <rect x="15" y="4" width="6" height="6" rx="1" />
      <rect x="15" y="14" width="6" height="6" rx="1" />
      <line x1="9" y1="12" x2="15" y2="7" />
      <line x1="9" y1="12" x2="15" y2="17" />
    </g>
    <g v-else-if="name === 'layout-tb'">
      <rect x="8" y="3" width="8" height="6" rx="1" />
      <rect x="4" y="15" width="6" height="6" rx="1" />
      <rect x="14" y="15" width="6" height="6" rx="1" />
      <line x1="12" y1="9" x2="7" y2="15" />
      <line x1="12" y1="9" x2="17" y2="15" />
    </g>
    <g v-else-if="name === 'grid'">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </g>
    <g v-else-if="name === 'minimap'">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </g>
    <path
      v-else-if="name === 'validate'"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
    <g v-else-if="name === 'clear'">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </g>
  </svg>
</template>
