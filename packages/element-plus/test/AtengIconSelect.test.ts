/**
 * AtengIconSelect 通用图标选择器组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import { AtengIconSelect, DEFAULT_ICONS } from '../src/components/icon-select';
import IconPanel from '../src/components/icon-select/IconPanel.vue';
import type { IconItem } from '../src/components/icon-select/types';

describe('AtengIconSelect 通用图标选择器交互与契约测试', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('初始渲染与选中值回显：正确呈现选中图标名称与 SVG 预览', async () => {
    const wrapper = mount(AtengIconSelect, {
      props: {
        modelValue: 'Search',
      },
    });

    expect(wrapper.classes()).toContain('at-icon-select');
    const input = wrapper.find('input');
    expect(input.element.value).toBe('Search');
    expect(wrapper.find('.at-icon-select__preview svg').exists()).toBe(true);

    wrapper.unmount();
  });

  it('IconPanel 面板：拼音/全拼/首字母/中文检索精准收敛', async () => {
    const wrapper = mount(IconPanel, {
      props: {
        icons: DEFAULT_ICONS,
        modelValue: '',
        isDialog: true,
      },
    });

    const searchInput = wrapper.find('.at-icon-select__search input');
    expect(searchInput.exists()).toBe(true);

    // 1. 搜索拼音首字母 'yh' (用户)
    await searchInput.setValue('yh');
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.at-icon-select__item').length).toBeGreaterThanOrEqual(1);
    expect(wrapper.text()).toContain('User');

    // 2. 搜索中文 '设置'
    await searchInput.setValue('设置');
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.at-icon-select__item').length).toBe(1);
    expect(wrapper.text()).toContain('Setting');

    // 3. 搜索英文 'Edit'
    await searchInput.setValue('edit');
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.at-icon-select__item').length).toBe(1);
    expect(wrapper.text()).toContain('Edit');

    wrapper.unmount();
  });

  it('IconPanel 面板：点击图标触发 select 事件', async () => {
    const wrapper = mount(IconPanel, {
      props: {
        icons: DEFAULT_ICONS,
        modelValue: 'Search',
      },
    });

    const items = wrapper.findAll('.at-icon-select__item');
    expect(items.length).toBeGreaterThan(0);

    // 点击第二个图标
    await items[1]?.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')?.[0]?.[0]).toBeDefined();

    wrapper.unmount();
  });

  it('一键清空契约：触发 update:modelValue 与 clear 事件', async () => {
    const wrapper = mount(AtengIconSelect, {
      props: {
        modelValue: 'Edit',
      },
    });

    wrapper.vm.clear();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['']);
    expect(wrapper.emitted('clear')).toBeTruthy();

    wrapper.unmount();
  });

  it('一键复制代码组件契约：支持 copyIconCode 与剪贴板回写', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    const wrapper = mount(AtengIconSelect, {
      props: {
        modelValue: 'Setting',
      },
    });

    const success = await wrapper.vm.copyIconCode();
    expect(success).toBe(true);
    expect(writeText).toHaveBeenCalledWith('<el-icon><Setting /></el-icon>');
    expect(wrapper.emitted('copy')?.[0]?.[0]).toBe('<el-icon><Setting /></el-icon>');

    // 测试未选图标时复制失败
    await wrapper.setProps({ modelValue: '' });
    const failRes = await wrapper.vm.copyIconCode();
    expect(failRes).toBe(false);

    wrapper.unmount();
  });

  it('Dialog 模式交互与禁用态', async () => {
    const wrapper = mount(AtengIconSelect, {
      props: {
        mode: 'dialog',
        disabled: true,
      },
    });

    const input = wrapper.find('input');
    expect(input.attributes('disabled')).toBeDefined();

    // 禁用态调用 open 不应打开
    wrapper.vm.open();
    await wrapper.vm.$nextTick();

    wrapper.unmount();
  });

  it('自定义企业级图标合并支持与 getCurrentIcon', async () => {
    const custom: IconItem[] = [
      {
        name: 'CustomCloud',
        label: '自定义云',
        pinyin: 'zidingyiyun,zdy',
        svgPath: '<path d="M100 100h200v200H100z" />',
      },
    ];

    const wrapper = mount(AtengIconSelect, {
      props: {
        customIcons: custom,
        modelValue: 'CustomCloud',
      },
    });

    const input = wrapper.find('input');
    expect(input.element.value).toBe('CustomCloud');
    expect(wrapper.find('.at-icon-select__preview svg').exists()).toBe(true);
    expect(wrapper.vm.getCurrentIcon()?.name).toBe('CustomCloud');

    wrapper.unmount();
  });

  it('#icon 作用域插槽透传（popover 与 dialog 双模）：自定义图标节点且保留 dialog 名称标签', async () => {
    let popoverWrapper: VueWrapper | null = null;
    let dialogWrapper: VueWrapper | null = null;

    try {
      // 1. Popover 模式
      popoverWrapper = mount(AtengIconSelect, {
        props: {
          modelValue: 'Search',
          mode: 'popover',
        },
        slots: {
          icon: ({ item, selected }: { item: IconItem; selected: boolean }) =>
            h(
              'span',
              {
                class: 'custom-slot-icon',
                'data-name': item.name,
                'data-selected': String(selected),
              },
              item.label || item.name,
            ),
        },
      });
      await popoverWrapper.vm.$nextTick();

      const customIcons = document.body.querySelectorAll('.custom-slot-icon');
      expect(customIcons.length).toBeGreaterThan(0);
      const activeIcon = document.body.querySelector('.custom-slot-icon[data-name="Search"]');
      expect(activeIcon).not.toBeNull();
      expect(activeIcon?.getAttribute('data-selected')).toBe('true');

      const inactiveIcon = document.body.querySelector('.custom-slot-icon[data-name="User"]');
      expect(inactiveIcon?.getAttribute('data-selected')).toBe('false');
      expect(document.body.querySelector('.at-icon-select__item svg')).toBeNull();

      // 2. Dialog 模式：自定义图标节点并保留内置 .item-name 标签
      dialogWrapper = mount(AtengIconSelect, {
        props: {
          modelValue: 'User',
          mode: 'dialog',
        },
        slots: {
          icon: ({ item, selected }: { item: IconItem; selected: boolean }) =>
            h(
              'span',
              {
                class: 'custom-dialog-icon',
                'data-name': item.name,
                'data-selected': String(selected),
              },
              `★${item.name}`,
            ),
        },
      });

      dialogWrapper.vm.open();
      await dialogWrapper.vm.$nextTick();

      const dialogActiveIcon = document.body.querySelector(
        '.at-icon-select__dialog .custom-dialog-icon[data-name="User"]',
      );
      expect(dialogActiveIcon).not.toBeNull();
      expect(dialogActiveIcon?.getAttribute('data-selected')).toBe('true');
      const dialogItem = dialogActiveIcon?.closest('.at-icon-select__item');
      expect(dialogItem?.querySelector('.item-name')?.textContent).toBe('User');
    } finally {
      popoverWrapper?.unmount();
      dialogWrapper?.unmount();
    }
  });

  it('#footer 作用域插槽透传与分页共存（popover 与 dialog 双模）：透传 { selectedItem, copyCode } 且保留分页栏', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    let popoverWrapper: VueWrapper | null = null;
    let dialogWrapper: VueWrapper | null = null;

    try {
      // 1. Popover 模式验证自定义 footer 与分页共存及 copyCode 调用
      popoverWrapper = mount(AtengIconSelect, {
        props: {
          modelValue: 'Setting',
          mode: 'popover',
          pageSize: 10,
        },
        slots: {
          footer: ({
            selectedItem,
            copyCode,
          }: {
            selectedItem?: IconItem;
            copyCode: () => Promise<boolean>;
          }) =>
            h('div', { class: 'custom-icon-footer' }, [
              h('span', { class: 'custom-footer-label' }, selectedItem?.label || '未选择'),
              h(
                'button',
                {
                  type: 'button',
                  class: 'custom-footer-copy-btn',
                  onClick: () => copyCode(),
                },
                '自定义复制',
              ),
            ]),
        },
      });
      await popoverWrapper.vm.$nextTick();

      expect(document.body.querySelector('.custom-footer-label')?.textContent).toBe(
        '设置/系统配置',
      );
      expect(document.body.querySelector('.at-icon-select__info')).toBeNull();
      expect(document.body.querySelector('.at-icon-select__pagination')).not.toBeNull();

      const copyBtn = document.body.querySelector('.custom-footer-copy-btn') as HTMLButtonElement;
      expect(copyBtn).not.toBeNull();
      copyBtn.click();
      await vi.waitFor(() => {
        expect(writeText).toHaveBeenCalledWith('<el-icon><Setting /></el-icon>');
        expect(popoverWrapper?.emitted('copy')?.[0]?.[0]).toBe('<el-icon><Setting /></el-icon>');
      });

      // 2. Dialog 模式验证 footer 透传
      dialogWrapper = mount(AtengIconSelect, {
        props: {
          modelValue: 'User',
          mode: 'dialog',
          pageSize: 10,
        },
        slots: {
          footer: ({ selectedItem }: { selectedItem?: IconItem }) =>
            h('div', { class: 'custom-dialog-footer' }, selectedItem?.name || ''),
        },
      });

      dialogWrapper.vm.open();
      await dialogWrapper.vm.$nextTick();

      expect(
        document.body.querySelector('.at-icon-select__dialog .custom-dialog-footer')?.textContent,
      ).toBe('User');
      expect(
        document.body.querySelector('.at-icon-select__dialog .at-icon-select__pagination'),
      ).not.toBeNull();
    } finally {
      popoverWrapper?.unmount();
      dialogWrapper?.unmount();
    }
  });
});
