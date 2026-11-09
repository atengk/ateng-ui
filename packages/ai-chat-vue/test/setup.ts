/**
 * @atengk/ai-chat-vue 单元测试全局环境配置。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { afterEach } from 'vitest';

afterEach(() => {
  // 清理测试期间可能残留在 document.body 中的元素
  document.body.innerHTML = '';
});
