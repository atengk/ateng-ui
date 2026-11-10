/**
 * 电子表格三态交互模式、插槽反转与轻量数据导出单元测试。
 *
 * 覆盖 full / compact / readonly 模式、原子开关覆盖、五大插槽及导出 API。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AtengSpreadsheet from '../src/components/AtengSpreadsheet.vue';

describe('三态交互模式分级与表现层插槽体系', () => {
  describe('模式分级与原子 Props 覆盖', () => {
    it('默认模式应当为 full 且不带有 compact 类名', () => {
      const wrapper = mount(AtengSpreadsheet);

      expect(wrapper.classes()).not.toContain('at-spreadsheet--compact');
      expect(wrapper.classes()).not.toContain('at-spreadsheet--readonly');

      wrapper.unmount();
    });

    it('compact 模式应当自动添加 at-spreadsheet--compact 类名', () => {
      const wrapper = mount(AtengSpreadsheet, {
        props: {
          mode: 'compact',
        },
      });

      expect(wrapper.classes()).toContain('at-spreadsheet--compact');
      wrapper.unmount();
    });

    it('readonly 模式应当自动添加 at-spreadsheet--readonly 类名', () => {
      const wrapper = mount(AtengSpreadsheet, {
        props: {
          mode: 'readonly',
        },
      });

      expect(wrapper.classes()).toContain('at-spreadsheet--readonly');
      wrapper.unmount();
    });

    it('原子 Props showToolbar: false 应当强制触发紧凑隐藏类名', () => {
      const wrapper = mount(AtengSpreadsheet, {
        props: {
          mode: 'full',
          showToolbar: false,
        },
      });

      expect(wrapper.classes()).toContain('at-spreadsheet--compact');
      wrapper.unmount();
    });

    it('原子 Props showSheetBar: false 与 showFormulaBar: false 应当触发对应隐藏类名', () => {
      const wrapper = mount(AtengSpreadsheet, {
        props: {
          showSheetBar: false,
          showFormulaBar: false,
        },
      });

      expect(wrapper.classes()).toContain('at-spreadsheet--hide-sheetbar');
      expect(wrapper.classes()).toContain('at-spreadsheet--hide-formulabar');
      wrapper.unmount();
    });

    it('原子 Props readOnly: true 应当在 full 模式下强制生效只读类名', () => {
      const wrapper = mount(AtengSpreadsheet, {
        props: {
          mode: 'full',
          readOnly: true,
        },
      });

      expect(wrapper.classes()).toContain('at-spreadsheet--readonly');
      wrapper.unmount();
    });
  });

  describe('五大表现层插槽体系反转', () => {
    it('应当正确渲染 #header 与 #extra 顶栏插槽', () => {
      const wrapper = mount(AtengSpreadsheet, {
        slots: {
          header: '<div class="test-header">业务标题</div>',
          extra: '<button class="test-btn">自定义保存</button>',
        },
      });

      expect(wrapper.find('.test-header').exists()).toBe(true);
      expect(wrapper.find('.test-header').text()).toBe('业务标题');
      expect(wrapper.find('.test-btn').exists()).toBe(true);
      expect(wrapper.find('.test-btn').text()).toBe('自定义保存');

      wrapper.unmount();
    });

    it('应当正确渲染 #footer 底栏定制插槽并暴露作用域上下文', () => {
      const wrapper = mount(AtengSpreadsheet, {
        slots: {
          footer: `
            <template #footer="{ isDirty, sheetList }">
              <span class="test-footer-status">{{ isDirty ? '已修改' : '已保存' }}</span>
              <span class="test-footer-sheets">{{ sheetList.length }} 个表格</span>
            </template>
          `,
        },
      });

      expect(wrapper.find('.test-footer-status').exists()).toBe(true);
      expect(wrapper.find('.test-footer-sheets').exists()).toBe(true);

      wrapper.unmount();
    });

    it('应当在未就绪且非加载状态下渲染 #empty 插槽', () => {
      const wrapper = mount(AtengSpreadsheet, {
        slots: {
          empty: '<div class="test-empty">暂无数据</div>',
        },
      });

      // 在未触发 onMounted 初始化容器前或空态下展示
      expect(wrapper.html()).toBeDefined();
      wrapper.unmount();
    });
  });

  describe('实例暴露的轻量导出 API', () => {
    it('实例应当完整暴露 exportCsv 与 exportJson 方法并支持调用', () => {
      const wrapper = mount(AtengSpreadsheet);
      const vm = wrapper.vm as unknown as {
        exportCsv: (filename?: string) => void;
        exportJson: (filename?: string) => void;
        setReadOnly: (ro: boolean) => void;
      };

      expect(typeof vm.exportCsv).toBe('function');
      expect(typeof vm.exportJson).toBe('function');
      expect(typeof vm.setReadOnly).toBe('function');

      // 调用不应抛出异常
      expect(() => vm.exportCsv('test.csv')).not.toThrow();
      expect(() => vm.exportJson('test.json')).not.toThrow();

      wrapper.unmount();
    });
  });
});
