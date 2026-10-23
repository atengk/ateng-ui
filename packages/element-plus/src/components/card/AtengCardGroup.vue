<script setup lang="ts">
/**
 * 企业级多卡片手风琴编排容器组件。
 *
 * 核心特性：
 * 1. 上下文总线：基于 Vue Provide/Inject 自动管理内部子卡片生命周期与折叠状态；
 * 2. 手风琴互斥单开：支持 accordion 配置，展开某卡片时确定性收起其他卡片；
 * 3. 双向受控绑定：支持 v-model:activeKeys 与标准 v-model 语法；
 * 4. 批量操作门面：通过组件实例暴露 expandAll() 与 collapseAll() 对称控制方法；
 * 5. 间距自适应：支持通过 gutter 配置卡片纵向排列间距。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import { ref, computed, watch, provide } from 'vue';
import {
  type AtengCardGroupProps,
  type AtengCardGroupEmits,
  type AtengCardGroupContext,
  ATENG_CARD_GROUP_INJECTION_KEY,
} from './types';

defineOptions({
  name: 'AtengCardGroup',
});

const props = withDefaults(defineProps<AtengCardGroupProps>(), {
  activeKeys: undefined,
  modelValue: undefined,
  accordion: false,
  gutter: '16px',
});

const emit = defineEmits<AtengCardGroupEmits>();

// 1. 内部激活 keys 状态机
const internalActiveKeys = ref<(string | number)[]>([]);

const currentActiveKeys = computed<(string | number)[]>(() => {
  if (props.activeKeys !== undefined) {
    return Array.isArray(props.activeKeys) ? props.activeKeys : [];
  }
  if (props.modelValue !== undefined) {
    return Array.isArray(props.modelValue) ? props.modelValue : [];
  }
  return internalActiveKeys.value;
});

// 2. 子卡片注册登记表（Map<key, setCollapsed>）
const cardRegistrations = new Map<string | number, (collapsed: boolean) => void>();

const syncCardsState = (keys: (string | number)[]) => {
  cardRegistrations.forEach((setCollapsed, registeredKey) => {
    const shouldExpand = keys.includes(registeredKey);
    setCollapsed(!shouldExpand);
  });
};

const updateActiveKeys = (nextKeys: (string | number)[]) => {
  const safeKeys = Array.isArray(nextKeys) ? nextKeys : [];
  internalActiveKeys.value = safeKeys;
  syncCardsState(safeKeys);
  emit('update:activeKeys', safeKeys);
  emit('update:modelValue', safeKeys);
  emit('change', safeKeys);
};

// 3. 监听外部传入的 activeKeys 或 modelValue 变更
watch(
  () => (props.activeKeys !== undefined ? props.activeKeys : props.modelValue),
  newVal => {
    if (newVal !== undefined) {
      const safeKeys = Array.isArray(newVal) ? newVal : [];
      internalActiveKeys.value = safeKeys;
      syncCardsState(safeKeys);
    }
  },
  { deep: true },
);

// 4. 手风琴与折叠切换操作
const toggleCard = (key: string | number, targetExpanded?: boolean) => {
  const isCurrentlyExpanded = currentActiveKeys.value.includes(key);
  const willExpand = targetExpanded !== undefined ? targetExpanded : !isCurrentlyExpanded;

  if (props.accordion) {
    if (willExpand) {
      updateActiveKeys([key]);
    } else {
      updateActiveKeys([]);
    }
  } else {
    if (willExpand) {
      if (!currentActiveKeys.value.includes(key)) {
        updateActiveKeys([...currentActiveKeys.value, key]);
      }
    } else {
      updateActiveKeys(currentActiveKeys.value.filter(k => k !== key));
    }
  }
};

const registerCard = (key: string | number, setCollapsed: (val: boolean) => void) => {
  cardRegistrations.set(key, setCollapsed);

  // 初始注册时同步一次当前卡片展开状态
  const isExpanded = currentActiveKeys.value.includes(key);
  setCollapsed(!isExpanded);

  // 返回确定性注销函数（对称语义）
  return () => {
    cardRegistrations.delete(key);
  };
};

const isCardExpanded = (key: string | number): boolean => {
  return currentActiveKeys.value.includes(key);
};

// 5. Provide 跨层注入总线
const groupContext: AtengCardGroupContext = {
  activeKeys: currentActiveKeys,
  accordion: computed(() => props.accordion),
  registerCard,
  toggleCard,
  isCardExpanded,
};

provide(ATENG_CARD_GROUP_INJECTION_KEY, groupContext);

// 6. 批量操作方法（Expose 暴露）
const expandAll = () => {
  if (props.accordion) {
    const firstKey = Array.from(cardRegistrations.keys())[0];
    if (firstKey !== undefined) {
      updateActiveKeys([firstKey]);
    }
  } else {
    const allKeys = Array.from(cardRegistrations.keys());
    updateActiveKeys(allKeys);
  }
};

const collapseAll = () => {
  updateActiveKeys([]);
};

// 7. 计算样式
const normalizedGutter = computed(() => {
  if (typeof props.gutter === 'number') {
    return `${props.gutter}px`;
  }
  return props.gutter || '16px';
});

defineExpose({
  activeKeys: currentActiveKeys,
  expandAll,
  collapseAll,
});
</script>

<template>
  <div class="at-card-group" :style="{ gap: normalizedGutter }">
    <slot />
  </div>
</template>

<style scoped>
.at-card-group {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
}
</style>
