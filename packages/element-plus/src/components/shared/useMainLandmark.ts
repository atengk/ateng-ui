/**
 * 主内容地标 (<main>) 嵌套去重协同钩子。
 *
 * 遵循 WAI-ARIA 单页面至多一个主 <main> 地标规约：当检测到祖先容器已渲染 <main> 地标时，
 * 未显式指定自定义标签的嵌套容器自动降级为 'div'；显式传入标签时始终尊重外部覆盖。
 *
 * @author Ateng
 * @since 2026-11-27
 */

import { computed, inject, provide, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { ATENG_MAIN_LANDMARK_KEY } from './context';

/**
 * 解析当前容器主区域应当渲染的 HTML 标签，并向后代透传地标占用状态。
 *
 * @param explicitTag 外部显式传入的标签（支持响应式引用或 Getter）
 * @returns 解析后的响应式标签名
 */
export function useMainLandmarkTag(
  explicitTag?: MaybeRefOrGetter<string | undefined>,
): ComputedRef<string> {
  const ancestorMain = inject(ATENG_MAIN_LANDMARK_KEY, null);
  const hasAncestorMain = computed<boolean>(() => Boolean(toValue(ancestorMain)));
  const resolvedTag = computed<string>(
    () => toValue(explicitTag) || (hasAncestorMain.value ? 'div' : 'main'),
  );

  provide(
    ATENG_MAIN_LANDMARK_KEY,
    computed<boolean>(() => hasAncestorMain.value || resolvedTag.value === 'main'),
  );

  return resolvedTag;
}
