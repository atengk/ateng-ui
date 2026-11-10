/**
 * AtengPrintSheet 自动分页与动态页码注入单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, afterEach } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount, VueWrapper } from '@vue/test-utils';
import AtengPrintSheet from '../src/components/AtengPrintSheet.vue';
import { vPrintNoSplit } from '../src/directives/vPrintNoSplit';

describe('AtengPrintSheet 自动分页与动态页码', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  it('关闭 autoPaginate 时以单张连续纸张渲染默认插槽', () => {
    wrapper = mount(AtengPrintSheet, {
      props: {
        autoPaginate: false,
        preset: 'a4',
      },
      slots: {
        default: (slotProps: Record<string, unknown>) =>
          h(
            'div',
            { id: 'content' },
            `单张单据 页码: ${slotProps.pageIndex}/${slotProps.totalPages}`,
          ),
      },
    });

    const content = wrapper.find('#content');
    expect(content.exists()).toBe(true);
    expect(content.text()).toContain('单张单据 页码: 1/1');
    expect(wrapper.findAll('.at-print-page')).toHaveLength(0);
  });

  it('开启 autoPaginate 时自动切分子页并在页脚注入动态页码', async () => {
    // 构造测试组件，包含 4 个数据行块
    const TestComp = defineComponent({
      directives: { printNoSplit: vPrintNoSplit },
      components: { AtengPrintSheet },
      template: `
        <AtengPrintSheet
          :auto-paginate="true"
          :height="50"
          :padding="0"
        >
          <template #header="{ pageIndex, totalPages }">
            <div class="test-header">页眉 {{ pageIndex }}/{{ totalPages }}</div>
          </template>

          <div class="test-body">
            <div class="item" data-height="120" v-print-no-split>项目 1</div>
            <div class="item" data-height="120" v-print-no-split>项目 2</div>
            <div class="item" data-height="120" v-print-no-split>项目 3</div>
            <div class="item" data-height="120" v-print-no-split>项目 4</div>
          </div>

          <template #footer="{ pageIndex, totalPages }">
            <div class="test-footer">页脚 {{ pageIndex }}/{{ totalPages }}</div>
          </template>
        </AtengPrintSheet>
      `,
    });

    wrapper = mount(TestComp);
    await nextTick();
    await nextTick();

    const sheetComp = wrapper.findComponent(AtengPrintSheet);
    expect(sheetComp.exists()).toBe(true);

    // 调用暴露的 runPagination 主动执行一次切片
    (sheetComp.vm as unknown as { runPagination: () => void }).runPagination();
    await nextTick();

    const pages = wrapper.findAll('.at-print-page');
    expect(pages.length).toBe(4);

    // 检查每一页的页眉与页脚插槽的动态页码注入
    pages.forEach((pageWrapper, idx) => {
      const pageIndex = idx + 1;
      expect(pageWrapper.find('.test-header').text()).toBe(`页眉 ${pageIndex}/4`);
      expect(pageWrapper.find('.test-footer').text()).toBe(`页脚 ${pageIndex}/4`);
    });
  });

  it('极值空内容时开启 autoPaginate 保底渲染 1 页', async () => {
    wrapper = mount(AtengPrintSheet, {
      props: {
        autoPaginate: true,
        preset: 'a4',
      },
      slots: {
        default: () => '',
        footer: (slotProps: Record<string, unknown>) =>
          h(
            'div',
            { class: 'footer' },
            `第 ${slotProps.pageIndex} 页 / 共 ${slotProps.totalPages} 页`,
          ),
      },
    });

    await nextTick();
    const vm = wrapper.vm as unknown as { runPagination: () => void; totalPages: number };
    vm.runPagination();
    await nextTick();

    expect(vm.totalPages).toBe(1);
    const pages = wrapper.findAll('.at-print-page');
    expect(pages).toHaveLength(1);
  });
});
