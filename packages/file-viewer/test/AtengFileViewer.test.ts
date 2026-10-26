/**
 * AtengFileViewer 基础容器组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { AtengFileViewer } from '../src';

describe('AtengFileViewer 基础容器组件挂载与契约测试', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('组件正常挂载并渲染根类名与默认工具栏', async () => {
    const wrapper = mount(AtengFileViewer, {
      props: {
        url: 'https://example.com/files/contract.docx',
      },
    });

    expect(wrapper.classes()).toContain('at-file-viewer');
    expect(wrapper.find('.at-file-viewer__toolbar').exists()).toBe(true);
    expect(wrapper.find('.at-file-viewer__badge').text()).toBe('DOCX');
    expect(wrapper.find('.at-file-viewer__filename').text()).toBe('contract.docx');

    wrapper.unmount();
  });

  it('显式传入 fileName 与 fileType 时优先采用', async () => {
    const wrapper = mount(AtengFileViewer, {
      props: {
        url: 'https://example.com/api/stream?id=1001',
        fileName: '财务季度报表.xlsx',
        fileType: 'xlsx',
      },
    });

    expect(wrapper.find('.at-file-viewer__badge').text()).toBe('XLSX');
    expect(wrapper.find('.at-file-viewer__filename').text()).toBe('财务季度报表.xlsx');

    const vm = wrapper.vm;
    expect(vm.getFileName()).toBe('财务季度报表.xlsx');
    expect(vm.getFileType()).toBe('xlsx');

    wrapper.unmount();
  });

  it('传入本地 File 对象时自动提取文件名与类型', async () => {
    const file = new File(['fake content'], 'annual_plan.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });

    const wrapper = mount(AtengFileViewer, {
      props: {
        file,
      },
    });

    expect(wrapper.find('.at-file-viewer__badge').text()).toBe('PPTX');
    expect(wrapper.find('.at-file-viewer__filename').text()).toBe('annual_plan.pptx');

    wrapper.unmount();
  });

  it('showToolbar 为 false 时隐藏默认操作栏', async () => {
    const wrapper = mount(AtengFileViewer, {
      props: {
        url: 'https://example.com/demo.pdf',
        showToolbar: false,
      },
    });

    expect(wrapper.find('.at-file-viewer__toolbar').exists()).toBe(false);

    wrapper.unmount();
  });

  it('支持自定义 toolbar 插槽完全接管操作栏', async () => {
    const wrapper = mount(AtengFileViewer, {
      props: {
        url: 'https://example.com/test.docx',
      },
      slots: {
        toolbar: `
          <template #toolbar="{ fileName, fileType, zoomIn }">
            <div class="custom-bar">
              <span class="custom-title">{{ fileName }}</span>
              <button class="custom-zoom" @click="zoomIn">自定义放大</button>
            </div>
          </template>
        `,
      },
    });

    expect(wrapper.find('.custom-bar').exists()).toBe(true);
    expect(wrapper.find('.custom-title').text()).toBe('test.docx');

    await wrapper.find('.custom-zoom').trigger('click');

    wrapper.unmount();
  });

  it('对外暴露方法调用正常且不抛出异常', async () => {
    const wrapper = mount(AtengFileViewer, {
      props: {
        url: 'https://example.com/report.pdf',
      },
    });

    const vm = wrapper.vm;
    expect(() => {
      vm.zoomIn();
      vm.zoomOut();
      vm.rotate();
      vm.retry();
    }).not.toThrow();

    wrapper.unmount();
  });

  it('无任何文件输入时呈现空状态提示', async () => {
    const wrapper = mount(AtengFileViewer, {
      props: {},
    });

    expect(wrapper.find('.at-file-viewer__empty').exists()).toBe(true);
    expect(wrapper.find('.at-file-viewer__empty').text()).toContain('暂无文件输入');

    wrapper.unmount();
  });

  it('远程加载报错且为 BusinessException 时展示结构化错误信息与 traceId', async () => {
    const wrapper = mount(AtengFileViewer, {
      props: {
        url: 'https://example.com/api/files/stream?id=fail',
      },
    });

    // 触发内部报错
    const customError = new (await import('@atengk/core')).BusinessException(
      403,
      '当前附件无权限查看',
      'trace-403-assert-id',
    );

    type TestViewerVm = {
      handleError: (err: unknown) => void;
      createdObjectUrl: string | null;
    };

    // 派发错误或模拟内部错误状态
    (wrapper.vm as unknown as TestViewerVm).handleError(customError);
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.at-file-viewer__error').exists()).toBe(true);
    expect(wrapper.find('.at-file-viewer__error-msg').text()).toBe('当前附件无权限查看');
    expect(wrapper.find('.at-file-viewer__error-trace').text()).toContain('trace-403-assert-id');

    wrapper.unmount();
  });

  it('组件卸载时确定性释放资源并撤销 ObjectURL', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    const wrapper = mount(AtengFileViewer, {
      props: {
        url: 'https://example.com/test.docx',
      },
    });

    type TestViewerVm = {
      createdObjectUrl: string | null;
    };

    // 挂载一个模拟 objectUrl
    (wrapper.vm as unknown as TestViewerVm).createdObjectUrl = 'blob:http://localhost/mock-uuid';

    wrapper.unmount();

    expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/mock-uuid');
  });
});
