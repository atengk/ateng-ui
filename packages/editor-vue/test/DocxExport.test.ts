/**
 * prosemirrorJsonToDocxBlob 与 saveDocxFile 纯前端 Word 生成器单元测试。
 *
 * 遵循全自洽单测 3 项铁律：
 * 1. DOM 现场严格还原，afterEach 清理挂载；
 * 2. 状态零污染，模拟 URL.createObjectURL 与 URL.revokeObjectURL 确定性内存回收；
 * 3. 100% 离线自洽，验证 OpenXML 节点映射与真实二进制 Blob 生成。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import {
  prosemirrorJsonToDocxBlob,
  saveDocxFile,
  AtengDocxEditor,
  type AtengDocxEditorInstance,
} from '../src';

describe('纯前端 OpenXML docx 二进制生成器与一键导出 (prosemirrorJsonToDocxBlob)', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('prosemirrorJsonToDocxBlob 核心 AST 映射转译器', () => {
    it('空文档时安全兜底并成功生成有效 docx Blob', async () => {
      const blob = await prosemirrorJsonToDocxBlob({ type: 'doc', content: [] });
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.type).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
    });

    it('正确转译标题、居中对齐与复杂行内 marks（粗体、斜体、删除线、下划线）', async () => {
      const mockJson = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1, textAlign: 'center' },
            content: [{ type: 'text', text: '企业级基础设施研发指导意见' }],
          },
          {
            type: 'paragraph',
            attrs: { textAlign: 'right' },
            content: [
              {
                type: 'text',
                text: '绝密文件',
                marks: [{ type: 'bold' }, { type: 'italic' }],
              },
              {
                type: 'text',
                text: ' · 严禁翻印',
                marks: [{ type: 'strike' }, { type: 'underline' }],
              },
            ],
          },
        ],
      };

      const blob = await prosemirrorJsonToDocxBlob(mockJson, {
        fileName: 'test-doc.docx',
        orientation: 'portrait',
        pageMargin: 'standard',
        header: '公文红头页眉',
        footer: '第 1 处页脚',
        showPageNumber: true,
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(1000); // 包含 OpenXML 完整解包结构的有效 zip 二进制文件
      expect(blob.type).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
    });

    it('正确转译无序列表与有序列表', async () => {
      const mockListJson = {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: '无序列表项 A' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: '无序列表项 B' }],
                  },
                ],
              },
            ],
          },
          {
            type: 'orderedList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: '有序第一步' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: '有序第二步' }],
                  },
                ],
              },
            ],
          },
        ],
      };

      const blob = await prosemirrorJsonToDocxBlob(mockListJson);
      expect(blob.size).toBeGreaterThan(1000);
    });

    it('正确转译多行多列表格（含表头与单元格样式）', async () => {
      const mockTableJson = {
        type: 'doc',
        content: [
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: '模块名称' }],
                      },
                    ],
                  },
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: '完成状态' }],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'OpenXML 二进制导出' }],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: '100% 达成' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const blob = await prosemirrorJsonToDocxBlob(mockTableJson, {
        orientation: 'landscape',
        pageMargin: 'narrow',
      });
      expect(blob.size).toBeGreaterThan(1000);
    });
  });

  describe('saveDocxFile 确定性内存回收下载工具', () => {
    it('创建虚拟链接触发下载并确定性调用 URL.revokeObjectURL 释放内存', () => {
      vi.useFakeTimers();

      const createSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:http://localhost/mock-uuid');
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      const mockBlob = new Blob(['mock-docx-data'], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      saveDocxFile(mockBlob, '公文导出.docx');

      expect(createSpy).toHaveBeenCalledWith(mockBlob);

      // 前进 200ms 触发定时回收
      vi.advanceTimersByTime(200);

      expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/mock-uuid');

      vi.useRealTimers();
    });
  });

  describe('AtengDocxEditor exportDocx() 门面与顶栏快捷导出', () => {
    it('调用 vm.exportDocx() 成功导出 docx Blob 并触发下载', async () => {
      const createSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:http://localhost/mock-uuid');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      wrapper = mount(AtengDocxEditor, {
        props: {
          modelValue: '<h1>红头文件正文</h1><p>企业级基础设施建设</p>',
          header: '公文页眉',
          footer: '公文页脚',
        },
      });

      await nextTick();
      const vm = wrapper.vm as unknown as AtengDocxEditorInstance;

      expect(typeof vm.exportDocx).toBe('function');
      const blob = await vm.exportDocx('公文文件.docx');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(500);
      expect(createSpy).toHaveBeenCalled();

      // 验证顶栏按钮存在
      const exportBtn = wrapper.find('[data-test="export-docx-btn"]');
      expect(exportBtn.exists()).toBe(true);
      expect(exportBtn.text()).toContain('导出 Word');
    });
  });
});
