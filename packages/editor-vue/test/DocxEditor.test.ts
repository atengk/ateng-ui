/**
 * AtengDocxEditor、AtengPageCanvas 与 AtengPageRuler 单元测试。
 *
 * 遵循全自洽单测 3 项铁律：
 * 1. DOM 现场严格还原，afterEach 清理 DOM 与组件挂载；
 * 2. 状态零污染；
 * 3. 100% 离线自洽，验证 A4 物理仿真、断页计算与交互式页眉页脚。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import {
  AtengDocxEditor,
  AtengPageCanvas,
  AtengPageRuler,
  AtengEditor,
  AtengStatusBar,
  type AtengDocxEditorInstance,
} from '../src';

describe('DOCX Editor A4 物理分页排版与纸张仿真体系', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  describe('AtengPageRuler 毫米刻度标尺组件', () => {
    it('正确挂载并渲染纵向 210mm 刻度与边距区', () => {
      wrapper = mount(AtengPageRuler, {
        props: {
          orientation: 'portrait',
          marginLeft: 25.4,
          marginRight: 25.4,
        },
      });

      expect(wrapper.classes()).toContain('at-page-ruler--portrait');
      const svg = wrapper.find('.at-page-ruler__svg');
      expect(svg.exists()).toBe(true);
      expect(svg.attributes('viewBox')).toContain('210');

      // 验证边距不可编辑区与正文有效排版区
      const marginZones = wrapper.findAll('.at-page-ruler__margin-zone');
      expect(marginZones.length).toBe(2);
      expect(wrapper.find('.at-page-ruler__content-zone').exists()).toBe(true);

      // 验证刻度线生成
      const tickLines = wrapper.findAll('.at-page-ruler__tick-line');
      expect(tickLines.length).toBeGreaterThan(200);
    });

    it('横向 (landscape) 模式下动态扩展标尺宽度为 297mm', () => {
      wrapper = mount(AtengPageRuler, {
        props: {
          orientation: 'landscape',
          marginLeft: 30,
          marginRight: 30,
        },
      });

      expect(wrapper.classes()).toContain('at-page-ruler--landscape');
      const svg = wrapper.find('.at-page-ruler__svg');
      expect(svg.attributes('viewBox')).toContain('297');
    });
  });

  describe('AtengPageCanvas A4 仿真纸张排版容器', () => {
    it('正确挂载纸张容器、页眉与页脚，并展示默认页码', () => {
      wrapper = mount(AtengPageCanvas, {
        props: {
          orientation: 'portrait',
          header: '数字化基础设施转型的指导意见',
          footer: '绝密文件 · 内部流转',
          showPageNumber: true,
          showRuler: true,
        },
        slots: {
          default: '<div class="test-doc-content"><p>第一条 总体目标</p></div>',
        },
      });

      expect(wrapper.find('[data-test="page-canvas"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="page-sheet"]').exists()).toBe(true);
      expect(wrapper.find('.at-page-canvas__ruler-wrapper').exists()).toBe(true);

      // 验证页眉与页脚
      const header = wrapper.find('[data-test="page-header"]');
      expect(header.text()).toContain('数字化基础设施转型的指导意见');

      const footer = wrapper.find('[data-test="page-footer"]');
      expect(footer.text()).toContain('绝密文件 · 内部流转');
      expect(footer.text()).toContain('第 1 页 / 共 1 页');

      // 验证插槽内容
      expect(wrapper.find('.test-doc-content').text()).toBe('第一条 总体目标');
    });

    it('支持横向与窄边距 (narrow) 解析', () => {
      wrapper = mount(AtengPageCanvas, {
        props: {
          orientation: 'landscape',
          pageMargin: 'narrow',
        },
      });

      expect(wrapper.classes()).toContain('at-page-canvas--landscape');
      const sheet = wrapper.find('[data-test="page-sheet"]');
      expect(sheet.attributes('style')).toContain('297mm');
      expect(sheet.attributes('style')).toContain('12.7mm');
    });

    it('双击页眉进入行内编辑态，修改完成并触发 update:header 事件', async () => {
      wrapper = mount(AtengPageCanvas, {
        props: {
          header: '原页眉文本',
          editableHeaderFooter: true,
        },
      });

      const header = wrapper.find('[data-test="page-header"]');
      // 初始非编辑态
      expect(wrapper.find('.at-page-canvas__input').exists()).toBe(false);

      // 双击激活编辑态
      await header.trigger('dblclick');
      await nextTick();

      const input = wrapper.find('.at-page-canvas__input');
      expect(input.exists()).toBe(true);

      // 修改输入并按 Enter 完成
      await input.setValue('新修改的公文红头');
      await input.trigger('keydown.enter');
      await nextTick();

      expect(wrapper.emitted('update:header')).toBeTruthy();
      expect(wrapper.emitted('update:header')?.[0]).toEqual(['新修改的公文红头']);
    });

    it('双击页脚进入行内编辑态，失焦完成并触发 update:footer 事件', async () => {
      wrapper = mount(AtengPageCanvas, {
        props: {
          footer: '原页脚',
          editableHeaderFooter: true,
        },
      });

      const footer = wrapper.find('[data-test="page-footer"]');
      await footer.trigger('dblclick');
      await nextTick();

      const input = wrapper.find('.at-page-canvas__input');
      expect(input.exists()).toBe(true);

      await input.setValue('新保密等级说明');
      await input.trigger('blur');
      await nextTick();

      expect(wrapper.emitted('update:footer')).toBeTruthy();
      expect(wrapper.emitted('update:footer')?.[0]).toEqual(['新保密等级说明']);
    });
  });

  describe('AtengDocxEditor 预设独立组件', () => {
    it('正确挂载并渲染根容器、操作栏与 A4 纸张排版区', async () => {
      wrapper = mount(AtengDocxEditor, {
        props: {
          modelValue: '<p>公文正文测试内容</p>',
          header: '企业级基础设施研发标准',
          footer: '内部发布',
          showRuler: true,
          showToolbar: true,
          showStatusBar: true,
        },
      });

      await nextTick();

      expect(wrapper.find('[data-test="docx-editor"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="docx-toolbar"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="page-canvas"]').exists()).toBe(true);
      expect(wrapper.findComponent(AtengStatusBar).exists()).toBe(true);

      // 验证 Expose 门面方法
      const vm = wrapper.vm as unknown as AtengDocxEditorInstance;
      expect(vm.editor).toBeDefined();
      expect(vm.totalPages).toBeGreaterThanOrEqual(1);
      expect(vm.orientation).toBe('portrait');
      expect(typeof vm.print).toBe('function');
      expect(typeof vm.clear).toBe('function');
      expect(typeof vm.focus).toBe('function');
    });

    it('调用 vm.clear() 成功清空文档内容', async () => {
      wrapper = mount(AtengDocxEditor, {
        props: {
          modelValue: '<p>待清空的内容</p>',
        },
      });

      await nextTick();
      const vm = wrapper.vm as unknown as AtengDocxEditorInstance;
      expect(vm.editor?.getText()).toContain('待清空的内容');

      vm.clear();
      await nextTick();
      expect(vm.editor?.getText().trim()).toBe('');
    });
  });

  describe('AtengEditor 多态门面 mode="docx" 分发', () => {
    it('mode="docx" 时正确装配 AtengPageCanvas 仿真纸张容器', async () => {
      wrapper = mount(AtengEditor, {
        props: {
          mode: 'docx',
          modelValue: '<p>多态分发公文内容</p>',
          header: '多态页眉',
          showRuler: true,
        },
      });

      await nextTick();

      expect(wrapper.classes()).toContain('at-docx-editor');
      expect(wrapper.find('[data-test="page-canvas"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="page-sheet"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="page-ruler"]').exists()).toBe(true);
    });
  });
});
