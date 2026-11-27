/**
 * 响应式移动端视口探测 Hook。
 *
 * 同步监听浏览器 `resize` 事件与 `matchMedia` 媒体查询变更，并在组件卸载时确定性注销全部监听，
 * 确保弹窗、抽屉等容器在窗口缩放或跨断点切换时实时响应。
 *
 * @author Ateng
 * @since 2026-11-27
 */

import { ref, readonly, onMounted, onBeforeUnmount, type DeepReadonly, type Ref } from 'vue';

/**
 * 监听当前视口是否处于移动端断点宽度以内。
 *
 * @param breakpoint 移动端断点像素阈值（默认为 768，即 `< 768px` 判定为移动端）
 * @returns 包含只读响应式布尔引用 `isMobile` 的对象
 */
export function useMobileViewport(breakpoint: number = 768): {
  isMobile: DeepReadonly<Ref<boolean>>;
} {
  if (!Number.isFinite(breakpoint) || breakpoint <= 0) {
    throw new RangeError('useMobileViewport breakpoint must be a positive finite number');
  }

  const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth < breakpoint : false);
  let mediaQuery: MediaQueryList | null = null;

  const handleResize = () => {
    if (typeof window === 'undefined') return;
    isMobile.value = window.innerWidth < breakpoint;
  };

  const handleMediaChange = (event: MediaQueryListEvent) => {
    isMobile.value = event.matches;
  };

  onMounted(() => {
    handleResize();
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', handleResize);
    if (typeof window.matchMedia === 'function') {
      mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 0.02}px)`);
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleMediaChange);
      }
    }
  });

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', handleResize);
    }
    if (mediaQuery && typeof mediaQuery.removeEventListener === 'function') {
      mediaQuery.removeEventListener('change', handleMediaChange);
    }
    mediaQuery = null;
  });

  return { isMobile: readonly(isMobile) };
}
