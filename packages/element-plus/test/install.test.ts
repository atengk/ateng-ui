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
  AtengDictSelect,
  AtengDictRadio,
  AtengDictTag,
  AtengDescriptions,
  AtengDescriptionsItem,
  AtengDateRange,
  AtengExcelFeedback,
  AtengUpload,
  DictManager,
  AtDialog,
  AtDrawer,
  AtEmpty,
  AtQueryForm,
  AtTable,
  AtDictSelect,
  AtDictRadio,
  AtDictTag,
  AtDescriptions,
  AtDescriptionsItem,
  AtDateRange,
  AtExcelFeedback,
  AtUpload,
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

    // 验证 Stage 1 & Stage 2 组件原名导出
    expect(AtengDialog).toBeDefined();
    expect(AtengDrawer).toBeDefined();
    expect(AtengEmpty).toBeDefined();
    expect(AtengQueryForm).toBeDefined();
    expect(AtengTable).toBeDefined();

    // 验证 Stage 3 新增组件与门面原名导出
    expect(AtengDictSelect).toBeDefined();
    expect(AtengDictRadio).toBeDefined();
    expect(AtengDictTag).toBeDefined();
    expect(AtengDescriptions).toBeDefined();
    expect(AtengDescriptionsItem).toBeDefined();
    expect(AtengDateRange).toBeDefined();
    expect(AtengExcelFeedback).toBeDefined();
    expect(AtengUpload).toBeDefined();
    expect(DictManager).toBeDefined();

    // 验证便捷 At* 别名导出
    expect(AtDialog).toBe(AtengDialog);
    expect(AtDrawer).toBe(AtengDrawer);
    expect(AtEmpty).toBe(AtengEmpty);
    expect(AtQueryForm).toBe(AtengQueryForm);
    expect(AtTable).toBe(AtengTable);
    expect(AtDictSelect).toBe(AtengDictSelect);
    expect(AtDictRadio).toBe(AtengDictRadio);
    expect(AtDictTag).toBe(AtengDictTag);
    expect(AtDescriptions).toBe(AtengDescriptions);
    expect(AtDescriptionsItem).toBe(AtengDescriptionsItem);
    expect(AtDateRange).toBe(AtengDateRange);
    expect(AtExcelFeedback).toBe(AtengExcelFeedback);
    expect(AtUpload).toBe(AtengUpload);

    // 验证指令导出
    expect(vPermission).toBeDefined();
    expect(vRole).toBeDefined();
    expect(vIdempotent).toBeDefined();
    expect(vCopy).toBeDefined();
    expect(vWatermark).toBeDefined();
  });

  it('全局安装器 install(app)：批量注册全量组件（含 PascalCase 原名与 At 别名）及 DictManager 注入', () => {
    const dummyApp = createApp({});
    dummyApp.use(AtengElementPlus);

    // 1. 验证 Stage 1 & Stage 2 PascalCase 组件原名注册
    expect(dummyApp.component('AtengDialog')).toBeDefined();
    expect(dummyApp.component('AtengDrawer')).toBeDefined();
    expect(dummyApp.component('AtengEmpty')).toBeDefined();
    expect(dummyApp.component('AtengQueryForm')).toBeDefined();
    expect(dummyApp.component('AtengTable')).toBeDefined();

    // 2. 验证 Stage 3 全量组件原名注册
    expect(dummyApp.component('AtengDictSelect')).toBeDefined();
    expect(dummyApp.component('AtengDictRadio')).toBeDefined();
    expect(dummyApp.component('AtengDictTag')).toBeDefined();
    expect(dummyApp.component('AtengDescriptions')).toBeDefined();
    expect(dummyApp.component('AtengDescriptionsItem')).toBeDefined();
    expect(dummyApp.component('AtengDateRange')).toBeDefined();
    expect(dummyApp.component('AtengExcelFeedback')).toBeDefined();
    expect(dummyApp.component('AtengUpload')).toBeDefined();

    // 3. 验证便捷 At* 别名注册
    expect(dummyApp.component('AtDialog')).toBeDefined();
    expect(dummyApp.component('AtDrawer')).toBeDefined();
    expect(dummyApp.component('AtEmpty')).toBeDefined();
    expect(dummyApp.component('AtQueryForm')).toBeDefined();
    expect(dummyApp.component('AtTable')).toBeDefined();
    expect(dummyApp.component('AtDictSelect')).toBeDefined();
    expect(dummyApp.component('AtDictRadio')).toBeDefined();
    expect(dummyApp.component('AtDictTag')).toBeDefined();
    expect(dummyApp.component('AtDescriptions')).toBeDefined();
    expect(dummyApp.component('AtDescriptionsItem')).toBeDefined();
    expect(dummyApp.component('AtDateRange')).toBeDefined();
    expect(dummyApp.component('AtExcelFeedback')).toBeDefined();
    expect(dummyApp.component('AtUpload')).toBeDefined();

    // 4. 验证严格拒绝非标 kebab-case 别名
    expect(dummyApp.component('ateng-dialog')).toBeUndefined();
    expect(dummyApp.component('ateng-table')).toBeUndefined();
    expect(dummyApp.component('at-table')).toBeUndefined();
    expect(dummyApp.component('ateng-date-range')).toBeUndefined();

    // 5. 验证全局注入 DictManager 门面
    expect(dummyApp.config.globalProperties.$dictManager).toBe(DictManager);

    // 6. 验证全部 5 组指令注册
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

  it('挂载体验：全局安装后在模板中直接使用 At 别名组件与指令，无需局部重复声明', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const TestRoot = defineComponent({
      template: `
        <div id="test-root">
          <AtEmpty status="search" description="全局组件已生效" />
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

    // 验证全局注册的 AtEmpty (At 别名) 正常渲染
    expect(wrapper.find('.at-empty--search').exists()).toBe(true);
    expect(wrapper.text()).toContain('全局组件已生效');

    // 验证全局注册的 v-copy 正常执行
    const btn = wrapper.find('#global-copy-btn');
    await btn.trigger('click');
    expect(writeTextMock).toHaveBeenCalledWith('来自全局指令的内容');
  });
});
