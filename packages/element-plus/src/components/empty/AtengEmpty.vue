<script setup lang="ts">
/**
 * 统一缺省态与异常占位组件。
 *
 * 聚合支持 5 种语义状态：empty（暂无数据）、search（搜索无结果）、403（无访问权限）、
 * network-error（网络连接异常）与 500（系统服务异常）。
 * 内置纯矢量 SVG 插画深度绑定 Element Plus 设计令牌，支持暗黑模式自适应与插槽自定义定制。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { computed } from 'vue';
import { ElEmpty } from 'element-plus';
import type { AtengEmptyProps, AtengEmptySlots } from './types';
import {
  DEFAULT_STATUS_DESCRIPTIONS,
  IllustrationEmpty,
  IllustrationSearch,
  Illustration403,
  IllustrationNetworkError,
  Illustration500,
} from './illustrations';

defineOptions({
  name: 'AtengEmpty',
});

const props = withDefaults(defineProps<AtengEmptyProps>(), {
  status: 'empty',
  imageSize: 160,
  description: undefined,
  image: undefined,
});

defineSlots<AtengEmptySlots>();

// 1. 计算呈现的描述文案（优先外部传入的 description，否则读取对应 status 的默认文案）
const currentDescription = computed(() => {
  return (
    props.description ??
    DEFAULT_STATUS_DESCRIPTIONS[props.status] ??
    DEFAULT_STATUS_DESCRIPTIONS.empty
  );
});

// 2. 根据 status 动态计算对应的内置矢量插画组件
const CurrentIllustration = computed(() => {
  switch (props.status) {
    case 'search':
      return IllustrationSearch;
    case '403':
      return Illustration403;
    case 'network-error':
      return IllustrationNetworkError;
    case '500':
      return Illustration500;
    case 'empty':
    default:
      return IllustrationEmpty;
  }
});

defineExpose({});
</script>

<template>
  <div class="at-empty" :class="[`at-empty--${status}`]">
    <el-empty :image="image" :image-size="imageSize" :description="currentDescription">
      <!-- 插画插槽：当未传入 image 图片或外部显式提供了 image 插槽时接管渲染 -->
      <template v-if="!image || $slots.image" #image>
        <slot name="image">
          <component :is="CurrentIllustration" :size="imageSize" />
        </slot>
      </template>

      <!-- 描述文案插槽 -->
      <template #description>
        <slot name="description">
          <p class="at-empty__description">{{ currentDescription }}</p>
        </slot>
      </template>

      <!-- 底部操作按钮区域插槽 -->
      <template v-if="$slots.default" #default>
        <div class="at-empty__actions">
          <slot />
        </div>
      </template>
    </el-empty>
  </div>
</template>

<style scoped lang="scss">
.at-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32px 0;
  box-sizing: border-box;

  :deep(.el-empty) {
    padding: 0;
  }

  &__description {
    margin: 0;
    font-size: 14px;
    color: var(--el-text-color-secondary);
    line-height: 22px;
  }

  &__actions {
    margin-top: 16px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
  }
}
</style>
