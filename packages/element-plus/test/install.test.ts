/**
 * 全局插件安装器与统一导出单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, defineComponent, nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import AtengElementPlus, {
  install,
  installer,
  VERSION,
  AtengDialog,
  AtengDrawer,
  AtengEmpty,
  AtengQueryForm,
  AtengTable,
  vPermission,
  vRole,
  vIdempotent,
  vCopy,
  vWatermark,
} from '../src/index';

describe('全局插件安装器与统一导出规范测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('顶级入口纯声明式具名导出全部核心门面与元数据', () => {
    expect(VERSION).toBe('0.1.0');
    expect(typeof install).toBe('function');
    expect(installer).toBeDefined();
    expect(AtengElementPlus).toBe(installer);

    // 验证组件导出
    expect(AtengDialog).toBeDefined();
    expect(AtengDrawer).toBeDefined();
    expect(AtengEmpty).toBeDefined();
    expect(AtengQueryForm).toBeDefined();
    expect(AtengTable).toBeDefined();

    // 验证指令导出
    expect(vPermission).toBeDefined();
    expect(vRole).toBeDefined();
    expect(vIdempotent).toBeDefined();
    expect(vCopy).toBeDefined();
    expect(vWatermark).toBeDefined();
  });

  it('全局安装器 install(app)：批量注册官方规范组件与指令', () => {
    const dummyApp = createApp({});
    dummyApp.use(AtengElementPlus);

    // 验证 PascalCase 组件注册
    expect(dummyApp.component('AtengDialog')).toBeDefined();
    expect(dummyApp.component('AtengDrawer')).toBeDefined();
    expect(dummyApp.component('AtengEmpty')).toBeDefined();
    expect(dummyApp.component('AtengQueryForm')).toBeDefined();
    expect(dummyApp.component('AtengTable')).toBeDefined();

    // 验证严格拒绝非标别名
    expect(dummyApp.component('ateng-dialog')).toBeUndefined();
    expect(dummyApp.component('ateng-drawer')).toBeUndefined();
    expect(dummyApp.component('ateng-empty')).toBeUndefined();
    expect(dummyApp.component('ateng-query-form')).toBeUndefined();
    expect(dummyApp.component('ateng-table')).toBeUndefined();

    // 验证全部 5 组指令注册
    expect(dummyApp.directive('permission')).toBeDefined();
    expect(dummyApp.directive('role')).toBeDefined();
    expect(dummyApp.directive('idempotent')).toBeDefined();
    expect(dummyApp.directive('copy')).toBeDefined();
    expect(dummyApp.directive('watermark')).toBeDefined();
  });

  it('重复调用 app.use 具备严格幂等性，不产生冲突', () => {
    const dummyApp = createApp({});
    expect(() => {
      dummyApp.use(AtengElementPlus);
      dummyApp.use(AtengElementPlus);
      dummyApp.use(install);
    }).not.toThrow();
  });

  it('挂载体验：全局安装后在模板中直接使用组件与指令，无需局部重复声明', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const TestRoot = defineComponent({
      template: `
        <div id="test-root">
          <AtengEmpty status="search" description="全局组件已生效" />
          <button id="global-copy-btn" v-copy="'来自全局指令的内容'">全局复制</button>
        </div>
      `,
    });

    wrapper = mount(TestRoot, {
      global: {
        plugins: [AtengElementPlus],
      },
      attachTo: document.body,
    });
    await nextTick();

    // 验证全局注册的 AtengEmpty 正常渲染
    expect(wrapper.find('.at-empty--search').exists()).toBe(true);
    expect(wrapper.text()).toContain('全局组件已生效');

    // 验证全局注册的 v-copy 正常执行
    const btn = wrapper.find('#global-copy-btn');
    await btn.trigger('click');
    expect(writeTextMock).toHaveBeenCalledWith('来自全局指令的内容');
  });
});
