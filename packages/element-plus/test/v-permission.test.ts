/**
 * v-permission 指令单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, defineComponent, ref } from 'vue';
import { useAuth } from '@atengk/vue';
import { vPermission } from '../src/directives/permission';

describe('v-permission 指令规范与边界测试', () => {
  let wrapper: VueWrapper | null = null;
  const auth = useAuth();

  beforeEach(() => {
    // 测试前重置鉴权状态
    auth.logout();
    auth.setPermissions([]);
    auth.setRoles([]);
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    auth.logout();
    auth.setPermissions([]);
    auth.setRoles([]);
  });

  it('无权限时默认物理移除节点并留存注释锚点', async () => {
    const TestComponent = defineComponent({
      directives: { permission: vPermission },
      template: `
        <div id="container">
          <button id="btn" v-permission="'sys:user:add'">添加用户</button>
        </div>
      `,
    });

    wrapper = mount(TestComponent);
    await nextTick();

    const container = wrapper.find('#container');
    expect(wrapper.find('#btn').exists()).toBe(false);
    expect(container.html()).toContain('<!--v-permission-->');
  });

  it('具备匹配权限时正常保留 DOM 节点', async () => {
    auth.setPermissions(['sys:user:add']);

    const TestComponent = defineComponent({
      directives: { permission: vPermission },
      template: `
        <div id="container">
          <button id="btn" v-permission="'sys:user:add'">添加用户</button>
        </div>
      `,
    });

    wrapper = mount(TestComponent);
    await nextTick();

    const btn = wrapper.find('#btn');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toBe('添加用户');
  });

  it('动态数据流：权限就绪时通过注释锚点自动原位插回 DOM', async () => {
    const TestComponent = defineComponent({
      directives: { permission: vPermission },
      template: `
        <div id="container">
          <span id="prefix">前缀</span>
          <button id="btn" v-permission="'sys:user:edit'">编辑</button>
          <span id="suffix">后缀</span>
        </div>
      `,
    });

    wrapper = mount(TestComponent);
    await nextTick();

    // 1. 初始无权限，节点被物理移除
    expect(wrapper.find('#btn').exists()).toBe(false);
    expect(wrapper.find('#container').html()).toContain('<!--v-permission-->');

    // 2. 动态赋予权限
    auth.setPermissions(['sys:user:edit']);
    await nextTick();
    await nextTick();

    // 3. 验证原位插回
    const btn = wrapper.find('#btn');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toBe('编辑');

    // 4. 再次动态移除权限
    auth.setPermissions([]);
    await nextTick();
    await nextTick();
    expect(wrapper.find('#btn').exists()).toBe(false);
    expect(wrapper.find('#container').html()).toContain('<!--v-permission-->');
  });

  it('.disabled 修饰符：无权限置灰且捕获阶段阻断点击，有权限恢复', async () => {
    let clickCount = 0;
    const TestComponent = defineComponent({
      directives: { permission: vPermission },
      setup() {
        const handleClick = () => {
          clickCount++;
        };
        return { handleClick };
      },
      template: `
        <button id="btn" v-permission.disabled="'sys:user:delete'" @click="handleClick">
          删除
        </button>
      `,
    });

    wrapper = mount(TestComponent);
    await nextTick();

    const btn = wrapper.find('#btn');
    expect(btn.exists()).toBe(true);
    expect(btn.classes()).toContain('is-disabled');
    expect(btn.attributes('disabled')).toBeDefined();
    expect(btn.attributes('style') ?? '').toContain('pointer-events: none');

    // 尝试触发点击（应被完全拦截）
    await btn.trigger('click');
    expect(clickCount).toBe(0);

    // 赋予权限后恢复正常可点击
    auth.setPermissions(['sys:user:delete']);
    await nextTick();
    await nextTick();

    expect(btn.classes()).not.toContain('is-disabled');
    expect(btn.attributes('disabled')).toBeUndefined();
    expect(btn.attributes('style') ?? '').not.toContain('pointer-events: none');

    await btn.trigger('click');
    expect(clickCount).toBe(1);
  });

  it('.all 修饰符：严格匹配所有声明权限', async () => {
    const TestComponent = defineComponent({
      directives: { permission: vPermission },
      template: `
        <div id="container">
          <button id="btn" v-permission.all="['order:view', 'order:export']">
            导出订单
          </button>
        </div>
      `,
    });

    // 仅具备单权限，应当被阻断
    auth.setPermissions(['order:view']);
    wrapper = mount(TestComponent);
    await nextTick();
    expect(wrapper.find('#btn').exists()).toBe(false);

    // 补齐第二权限，放行
    auth.setPermissions(['order:view', 'order:export']);
    await nextTick();
    await nextTick();
    expect(wrapper.find('#btn').exists()).toBe(true);
  });

  it('支持 Apache Shiro 通配符匹配', async () => {
    auth.setPermissions(['order:*']);

    const TestComponent = defineComponent({
      directives: { permission: vPermission },
      template: `
        <div id="container">
          <button id="btn" v-permission="'order:refund:audit'">审核退款</button>
        </div>
      `,
    });

    wrapper = mount(TestComponent);
    await nextTick();
    expect(wrapper.find('#btn').exists()).toBe(true);
  });

  it('超级管理员角色享有权限全局放行特权', async () => {
    // 权限列表为空，但具备 admin 角色
    auth.setRoles(['admin']);

    const TestComponent = defineComponent({
      directives: { permission: vPermission },
      template: `
        <div id="container">
          <button id="btn" v-permission="'super:secret:action'">绝密操作</button>
        </div>
      `,
    });

    wrapper = mount(TestComponent);
    await nextTick();
    expect(wrapper.find('#btn').exists()).toBe(true);
  });

  it('组件销毁时确定性清理注释锚点与监听器', async () => {
    const show = ref(true);
    const TestComponent = defineComponent({
      directives: { permission: vPermission },
      setup() {
        return { show };
      },
      template: `
        <div id="root">
          <button v-if="show" id="btn" v-permission="'forbidden'">测试</button>
        </div>
      `,
    });

    wrapper = mount(TestComponent);
    await nextTick();
    expect(wrapper.find('#root').html()).toContain('<!--v-permission-->');

    // 销毁条件分支
    show.value = false;
    await nextTick();
    await nextTick();

    // 验证无任何异常抛出
    expect(wrapper.find('#btn').exists()).toBe(false);
  });
});
