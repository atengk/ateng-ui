/**
 * 企业级鉴权类指令（v-permission / v-role）通用工厂函数。
 *
 * 提供注释定位锚点物理移除与原位还原、.disabled 置灰态及 .all 修饰符支持。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { watch, type DirectiveBinding, type VNode } from 'vue';
import { useAuth } from '@atengk/vue';
import type {
  AuthDirective,
  AuthDirectiveInternalState,
  CreateAuthDirectiveOptions,
} from './types';

interface ExtendedAuthState extends AuthDirectiveInternalState {
  vnode: VNode | null;
}

/**
 * 针对 DOM 节点私有状态的 WeakMap 映射，杜绝内存泄漏与宿主属性污染。
 */
const directiveStateMap = new WeakMap<HTMLElement, ExtendedAuthState>();

/**
 * 格式化指令绑定入参为规范的字符串列表。
 */
function normalizeBindingValue(value: string | string[] | undefined | null): string[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter(item => typeof item === 'string' && item.trim().length > 0);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return [value.trim()];
  }
  return [];
}

/**
 * 应用禁用态样式与拦截。
 */
function applyDisabledState(el: HTMLElement, state: ExtendedAuthState): void {
  if (state.isDisabled) {
    return;
  }

  // 1. 添加 Element Plus 规范与标准禁用类名
  el.classList.add('is-disabled');

  // 2. 针对 Button 或 Input 等可交互原生元素设置 disabled 属性
  el.setAttribute('disabled', 'disabled');
  if ('disabled' in el) {
    (el as HTMLButtonElement).disabled = true;
  }

  // 3. 施加样式阻断与半透明视觉反馈
  el.style.pointerEvents = 'none';
  el.style.opacity = '0.5';

  // 4. 捕获阶段事件强力拦截器（防止通过原生 dispatchEvent 或特殊冒泡绕过）
  const interceptor = (event: MouseEvent): void => {
    event.stopImmediatePropagation();
    event.preventDefault();
  };
  state.clickInterceptor = interceptor;
  el.addEventListener('click', interceptor, true);

  state.isDisabled = true;
}

/**
 * 移除禁用态样式并恢复交互。
 */
function removeDisabledState(el: HTMLElement, state: ExtendedAuthState): void {
  if (!state.isDisabled) {
    return;
  }

  el.classList.remove('is-disabled');
  el.removeAttribute('disabled');
  if ('disabled' in el) {
    (el as HTMLButtonElement).disabled = false;
  }

  el.style.pointerEvents = '';
  el.style.opacity = '';

  if (state.clickInterceptor) {
    el.removeEventListener('click', state.clickInterceptor, true);
    state.clickInterceptor = null;
  }

  state.isDisabled = false;
}

/**
 * 创建通用鉴权指令。
 *
 * @param options 工厂配置选项
 * @returns Vue 自定义指令定义
 */
export function createAuthDirective(options: CreateAuthDirectiveOptions): AuthDirective {
  const { commentText, evaluator } = options;

  /**
   * 核心鉴权判定与 DOM 调度函数。
   */
  const updateElementAccess = (
    el: HTMLElement,
    binding: DirectiveBinding<string | string[] | undefined | null>,
    vnode?: VNode,
  ): void => {
    const state = directiveStateMap.get(el);
    if (!state) {
      return;
    }

    if (vnode) {
      state.vnode = vnode;
    }

    const auth = useAuth();
    const targets = normalizeBindingValue(binding.value);
    const mode = binding.modifiers.all ? 'every' : 'some';
    const isDisabledMode = Boolean(binding.modifiers.disabled);

    // 未传递任何有效权限/角色标识时，默认无权限放行
    const hasAccess = targets.length > 0 && evaluator(auth, targets, mode);

    if (isDisabledMode) {
      // 若处于置灰模式：根据权限状态切换禁用态
      if (hasAccess) {
        removeDisabledState(el, state);
      } else {
        applyDisabledState(el, state);
      }
    } else {
      // 默认模式：物理移除 DOM 并留存注释锚点
      if (hasAccess) {
        // 若之前被替换为注释锚点，原位插回 DOM
        if (state.comment && state.comment.parentNode) {
          state.comment.parentNode.replaceChild(el, state.comment);
          state.comment = null;
          if (state.vnode) {
            state.vnode.el = el;
          }
        }
      } else {
        // 若当前在 DOM 树中且未被移除，替换为注释节点
        if (!state.comment && el.parentNode) {
          const comment = document.createComment(commentText);
          state.comment = comment;
          el.parentNode.replaceChild(comment, el);
          if (state.vnode) {
            state.vnode.el = comment;
          }
        }
      }
    }
  };

  return {
    mounted(el, binding, vnode) {
      const state: ExtendedAuthState = {
        comment: null,
        stopWatch: null,
        clickInterceptor: null,
        isDisabled: false,
        vnode,
      };
      directiveStateMap.set(el, state);

      const auth = useAuth();

      // 注册响应式权限与角色监听，状态变化时自动更新当前节点
      state.stopWatch = watch(
        [auth.permissions, auth.roles],
        () => {
          updateElementAccess(el, binding);
        },
        { flush: 'post' },
      );

      // 初次挂载时执行判定
      updateElementAccess(el, binding, vnode);
    },

    updated(el, binding, vnode) {
      updateElementAccess(el, binding, vnode);
    },

    beforeUnmount(el, _binding, vnode) {
      const state = directiveStateMap.get(el);
      if (!state) {
        return;
      }

      // 1. 确定性注销响应式监听
      if (state.stopWatch) {
        state.stopWatch();
        state.stopWatch = null;
      }

      // 2. 清理事件拦截器
      if (state.clickInterceptor) {
        el.removeEventListener('click', state.clickInterceptor, true);
        state.clickInterceptor = null;
      }

      // 3. 维护 vnode.el 一致性：若被注释节点替代且由 Vue 接管卸载，让 Vue 自然卸载
      // 仅当注释节点仍游离残留且 vnode 未指向它时，手动清理
      if (state.comment && vnode?.el !== state.comment && state.comment.parentNode) {
        state.comment.parentNode.removeChild(state.comment);
        state.comment = null;
      }

      directiveStateMap.delete(el);
    },
  };
}
