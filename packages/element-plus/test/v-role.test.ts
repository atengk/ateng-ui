/**
 * v-role 指令单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, defineComponent, ref } from 'vue';
import { useAuth } from '@atengk/vue';
import { vRole } from '../src/directives/role';

describe('v-role 指令规范与边界测试', () => {
  let wrapper: VueWrapper | null = null;
  const auth = useAuth();

  beforeEach(() => {
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

  it('无匹配角色时默认物理移除节点并留存注释锚点', async () => {
    const TestComponent = defineComponent({
      directives: { role: vRole },
      template: `
        <div id="container">
          <button id="btn" v-role="'auditor'">审计功能</button>
        </div>
      `,
    });

    wrapper = mount(TestComponent);
    await nextTick();

    const container = wrapper.find('#container');
    expect(wrapper.find('#btn').exists()).toBe(false);
    expect(container.html()).toContain('<!--v-role-->');
  });

  it('具备匹配角色时正常保留 DOM 节点', async () => {
    auth.setRoles(['auditor']);

    const TestComponent = defineComponent({
      directives: { role: vRole },
      template: `
        <div id="container">
          <button id="btn" v-role="'auditor'">审计功能</button>
        </div>
      `,
    });

    wrapper = mount(TestComponent);
    await nextTick();

    const btn = wrapper.find('#btn');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toBe('审计功能');
  });

  it('动态数据流：角色更新时自动原位插回 DOM', async () => {
    const TestComponent = defineComponent({
      directives: { role: vRole },
      template: `
        <div id="container">
          <button id="btn" v-role="'finance'">财务结算</button>
        </div>
      `,
    });

    wrapper = mount(TestComponent);
    await nextTick();

    expect(wrapper.find('#btn').exists()).toBe(false);

    auth.setRoles(['finance']);
    await nextTick();
    await nextTick();

    expect(wrapper.find('#btn').exists()).toBe(true);

    auth.setRoles([]);
    await nextTick();
    await nextTick();

    expect(wrapper.find('#btn').exists()).toBe(false);
  });

  it('.disabled 修饰符：无角色置灰且捕获阶段拦截点击', async () => {
    let clicked = false;
    const TestComponent = defineComponent({
      directives: { role: vRole },
      setup() {
        const onClick = () => {
          clicked = true;
        };
        return { onClick };
      },
      template: `
        <button id="btn" v-role.disabled="'manager'" @click="onClick">管理面板</button>
      `,
    });

    wrapper = mount(TestComponent);
    await nextTick();

    const btn = wrapper.find('#btn');
    expect(btn.exists()).toBe(true);
    expect(btn.classes()).toContain('is-disabled');
    expect(btn.attributes('disabled')).toBeDefined();

    await btn.trigger('click');
    expect(clicked).toBe(false);

    auth.setRoles(['manager']);
    await nextTick();
    await nextTick();

    expect(btn.classes()).not.toContain('is-disabled');
    await btn.trigger('click');
    expect(clicked).toBe(true);
  });

  it('.all 修饰符：必须同时满足所有角色', async () => {
    const TestComponent = defineComponent({
      directives: { role: vRole },
      template: `
        <div id="container">
          <button id="btn" v-role.all="['roleA', 'roleB']">复合权限</button>
        </div>
      `,
    });

    auth.setRoles(['roleA']);
    wrapper = mount(TestComponent);
    await nextTick();
    expect(wrapper.find('#btn').exists()).toBe(false);

    auth.setRoles(['roleA', 'roleB']);
    await nextTick();
    await nextTick();
    expect(wrapper.find('#btn').exists()).toBe(true);
  });

  it('组件销毁时确定性清理注释锚点', async () => {
    const show = ref(true);
    const TestComponent = defineComponent({
      directives: { role: vRole },
      setup() {
        return { show };
      },
      template: `
        <div id="root">
          <button v-if="show" id="btn" v-role="'root'">超级管理</button>
        </div>
      `,
    });

    wrapper = mount(TestComponent);
    await nextTick();
    expect(wrapper.find('#root').html()).toContain('<!--v-role-->');

    show.value = false;
    await nextTick();
    await nextTick();

    expect(wrapper.find('#btn').exists()).toBe(false);
  });
});
