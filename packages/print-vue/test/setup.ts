/**
 * @atengk/print-vue 单元测试全局环境配置。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { afterEach } from 'vitest';

afterEach(() => {
  // 清理测试期间可能残留在 document.body 与 document.head 中的元素
  document.body.innerHTML = '';
  const injectedStyles = document.head.querySelectorAll(
    'style[data-ateng-print], link[data-ateng-print]',
  );
  injectedStyles.forEach(el => el.remove());
});
