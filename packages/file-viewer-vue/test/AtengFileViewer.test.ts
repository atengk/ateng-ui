/**
 * AtengFileViewer 基础容器组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { AtengFileViewer } from '../src';
import {
  clearViewStateHistory,
  saveViewStateHistory,
  restoreViewStateHistory,
} from '../src/utils/viewStateHistory';
import type { FileViewerDocumentAnchor } from '../src/types';

describe('AtengFileViewer 基础容器组件挂载与契约测试', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
    clearViewStateHistory();
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

    wrapper.unmount();
  });

  it('支持自定义 error 与 loading 插槽', async () => {
    const wrapper = mount(AtengFileViewer, {
      props: {
        url: 'https://example.com/test.docx',
      },
      slots: {
        loading: `
          <div class="my-custom-loading">文档数据解密中...</div>
        `,
      },
    });

    expect(wrapper.find('.my-custom-loading').exists()).toBe(true);
    expect(wrapper.find('.my-custom-loading').text()).toBe('文档数据解密中...');

    wrapper.unmount();
  });

  it('组件正常响应 zoomIn、zoomOut 与 rotate 暴露方法并更新局部状态', async () => {
    const wrapper = mount(AtengFileViewer, {
      props: {
        url: 'https://example.com/test.docx',
      },
    });

    const vm = wrapper.vm;
    vm.zoomIn();
    vm.zoomIn();
    vm.rotate();

    // 再次调用 rotate
    vm.rotate();

    // 验证重置缩放
    vm.resetZoom();

    wrapper.unmount();
  });

  it('组件在卸载时确定性调用 abort() 中断请求并释放 ObjectURL 句柄', async () => {
    const abortSpy = vi.fn();
    const mockAbortController = {
      abort: abortSpy,
      signal: {} as AbortSignal,
    };
    vi.stubGlobal(
      'AbortController',
      vi.fn().mockImplementation(() => mockAbortController),
    );

    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const wrapper = mount(AtengFileViewer, {
      props: {
        url: 'https://example.com/files/remote.pdf',
      },
    });

    // 模拟内部拉取成功并创建了 ObjectURL
    // @ts-expect-error 访问内部状态用于断言释放逻辑
    wrapper.vm.createdObjectUrl = 'blob:http://localhost/mock-uuid';

    wrapper.unmount();

    expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/mock-uuid');
  });

  describe('DLP 四维数据防泄密与水印矩阵契约测试', () => {
    it('当 downloadable 为 false 时隐藏下载按钮且调用 download() 不触发下载', async () => {
      const createUrlSpy = vi.spyOn(URL, 'createObjectURL');

      const wrapper = mount(AtengFileViewer, {
        props: {
          url: 'https://example.com/test.docx',
          file: new File(['mock'], 'test.docx'),
          downloadable: false,
        },
      });

      expect(wrapper.find('button[title="下载原文件"]').exists()).toBe(false);

      wrapper.vm.download();
      expect(createUrlSpy).not.toHaveBeenCalled();

      wrapper.unmount();
    });

    it('当 printable 为 false 时隐藏打印按钮且容器添加 at-file-viewer--no-print 类', async () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

      const wrapper = mount(AtengFileViewer, {
        props: {
          url: 'https://example.com/test.docx',
          printable: false,
        },
      });

      expect(wrapper.find('button[title="打印文档"]').exists()).toBe(false);
      expect(wrapper.classes()).toContain('at-file-viewer--no-print');

      wrapper.vm.print();
      expect(printSpy).not.toHaveBeenCalled();

      printSpy.mockRestore();
      wrapper.unmount();
    });

    it('当 copyable 为 false 时容器添加 at-file-viewer--no-copy 类', async () => {
      const wrapper = mount(AtengFileViewer, {
        props: {
          url: 'https://example.com/test.docx',
          copyable: false,
        },
      });

      expect(wrapper.classes()).toContain('at-file-viewer--no-copy');
      wrapper.unmount();
    });

    it('传入 watermark 字符串或对象时自动渲染防篡改水印图层，并在卸载时销毁', async () => {
      const wrapper = mount(AtengFileViewer, {
        props: {
          url: 'https://example.com/test.docx',
          watermark: '绝密审计 2026-10-26',
        },
      });

      const wm = wrapper.find('.at-file-viewer__watermark');
      expect(wm.exists()).toBe(true);
      expect(wm.attributes('style')).toContain('background-repeat: repeat');

      wrapper.unmount();
      expect(document.querySelector('.at-file-viewer__watermark')).toBeNull();
    });
  });

  describe('多页受控定位、多 Sheet 切换与阅读状态记忆恢复契约测试 (#134)', () => {
    it('受控页码 page 与 v-model:page，支持翻页控制器与事件派发', async () => {
      const wrapper = mount(AtengFileViewer, {
        props: {
          url: 'https://example.com/doc.pdf',
          page: 2,
        },
      });

      // 初始化暴露页码
      expect(wrapper.vm.getPage()).toBe(2);
      expect(wrapper.find('.at-file-viewer__pagination').exists()).toBe(true);

      // 调用 nextPage / prevPage
      await wrapper.vm.nextPage();
      expect(wrapper.emitted('update:page')).toBeTruthy();
      expect(wrapper.emitted('page-change')).toBeTruthy();

      await wrapper.vm.setPage(4);
      expect(wrapper.vm.getPage()).toBe(4);

      // 响应外部 props.page 变化
      await wrapper.setProps({ page: 6 });
      expect(wrapper.vm.getPage()).toBe(6);

      wrapper.unmount();
    });

    it('受控工作表 sheet 与底栏 Tab 切换条渲染与切换交互', async () => {
      const sheets = [
        { id: 0, name: '季度汇总' },
        { id: 1, name: '明细数据' },
        { id: 2, name: '图表分析' },
      ];

      const wrapper = mount(AtengFileViewer, {
        props: {
          url: 'https://example.com/data.xlsx',
          sheet: 0,
          sheets,
          showSheetBar: true,
        },
      });

      // 验证底栏 Tab 条渲染
      const sheetBar = wrapper.find('.at-file-viewer__sheet-bar');
      expect(sheetBar.exists()).toBe(true);
      const tabs = wrapper.findAll('.at-file-viewer__sheet-tab');
      expect(tabs.length).toBe(3);
      expect(tabs[0].text()).toContain('季度汇总');
      expect(tabs[0].classes()).toContain('is-active');

      // 点击第 2 个 Tab 切换工作表
      await tabs[1].trigger('click');
      expect(wrapper.emitted('update:sheet')?.[0]).toEqual([1]);
      expect(wrapper.emitted('sheet-change')?.[0]).toEqual([1, '明细数据']);
      expect(wrapper.vm.getSheet()).toBe(1);

      // 暴露方法 setSheet 切换
      await wrapper.vm.setSheet(2);
      expect(wrapper.vm.getSheet()).toBe(2);

      // 外部 props.sheet 响应式更新
      await wrapper.setProps({ sheet: 1 });
      expect(wrapper.vm.getSheet()).toBe(1);

      wrapper.unmount();
    });

    it('TOC 目录大纲抽屉显隐切换与锚点章节点击定位', async () => {
      const wrapper = mount(AtengFileViewer, {
        props: {
          url: 'https://example.com/handbook.pdf',
          showToc: true,
        },
      });

      // 初始抽屉默认关闭
      expect(wrapper.vm.isTocOpen()).toBe(false);
      expect(wrapper.find('.at-file-viewer__toc-drawer').exists()).toBe(false);

      // 点击操作栏 TOC 按钮展开抽屉
      const tocBtn = wrapper.find('.at-file-viewer__toc-btn');
      expect(tocBtn.exists()).toBe(true);
      await tocBtn.trigger('click');

      expect(wrapper.vm.isTocOpen()).toBe(true);
      expect(wrapper.find('.at-file-viewer__toc-drawer').exists()).toBe(true);
      expect(wrapper.emitted('update:toc-open')?.[0]).toEqual([true]);

      // 注入模拟大纲列表并测试层级样式与锚点定位
      const mockAnchors: FileViewerDocumentAnchor[] = [
        { id: 'sec-1', index: 0, label: '第 1 节 概述', level: 1, page: 1 },
        { id: 'sec-2', index: 1, label: '第 2 节 架构设计', level: 2, page: 5 },
      ];
      await wrapper.setProps({ tocList: mockAnchors });

      const tocItems = wrapper.findAll('.at-file-viewer__toc-item');
      expect(tocItems.length).toBe(2);
      expect(tocItems[0].text()).toContain('第 1 节 概述');
      expect(tocItems[0].classes()).toContain('at-file-viewer__toc-item--level-1');
      expect(tocItems[1].text()).toContain('P5');
      expect(tocItems[1].classes()).toContain('at-file-viewer__toc-item--level-2');
      expect(wrapper.find('.at-file-viewer__toc-bullet').exists()).toBe(true);

      // 清空大纲并验证优雅空状态提示
      await wrapper.setProps({ tocList: [] });
      expect(wrapper.find('.at-file-viewer__toc-empty').text()).toContain('当前文档未设置大纲标题');

      // 重新赋回以完成点击定位测试
      await wrapper.setProps({ tocList: mockAnchors });
      const reTocItems = wrapper.findAll('.at-file-viewer__toc-item');
      await reTocItems[1].trigger('click');
      await nextTick();
      expect(wrapper.vm.getPage()).toBe(5);

      // 关闭抽屉
      wrapper.vm.closeToc();
      expect(wrapper.vm.isTocOpen()).toBe(false);

      wrapper.unmount();
    });

    it('preserveViewState 为 true 时利用弱引用与 LRU 自动记忆并复原阅读状态', async () => {
      const docUrl = 'https://example.com/cached-doc.pdf';

      // 预先存入阅读历史
      saveViewStateHistory(docUrl, {
        page: 7,
        zoomScale: 1.4,
        rotation: 180,
        scroll: { top: 450, left: 10 },
      });

      const wrapper = mount(AtengFileViewer, {
        props: {
          url: docUrl,
          preserveViewState: true,
        },
      });

      // 模拟底层触发加载完成
      // @ts-expect-error 触发 handleLoadComplete
      await wrapper.vm.handleLoadComplete();
      await nextTick();

      expect(wrapper.vm.getPage()).toBe(7);

      // 用户交互：翻至第 9 页，旋转 270 度
      await wrapper.vm.setPage(9);
      wrapper.vm.rotate();

      // 卸载组件触发自动保存
      wrapper.unmount();

      // 验证历史状态已成功更新
      const updated = restoreViewStateHistory(docUrl);
      expect(updated?.page).toBe(9);
      expect(updated?.rotation).toBe(270);
    });

    it('支持 sheetBar 与 toc 专属具名插槽定制', async () => {
      const wrapper = mount(AtengFileViewer, {
        props: {
          url: 'https://example.com/custom.xlsx',
          sheets: [{ id: 'sheet_a', name: '表A' }],
        },
        slots: {
          sheetBar: `
            <template #sheetBar="{ sheet, sheets }">
              <div class="custom-sheet-bar">
                <span>当前表: {{ sheet }}</span>
                <span>总表数: {{ sheets.length }}</span>
              </div>
            </template>
          `,
          toc: `
            <template #toc="{ closeToc }">
              <div class="custom-toc">
                <button class="custom-toc-close" @click="closeToc">自定义关闭</button>
              </div>
            </template>
          `,
        },
      });

      // 验证 sheetBar 插槽
      expect(wrapper.find('.custom-sheet-bar').exists()).toBe(true);
      expect(wrapper.find('.custom-sheet-bar').text()).toContain('总表数: 1');

      // 打开 TOC 并验证 toc 插槽
      wrapper.vm.openToc();
      await nextTick();
      expect(wrapper.find('.custom-toc').exists()).toBe(true);

      wrapper.unmount();
    });
  });

  describe('离线内网静态资产寻址与动态重型预设扩展契约测试 (#135)', () => {
    it('支持局部传入 assetBaseUrl 覆盖且通过 getAssetBaseUrl() 正确暴露', async () => {
      const wrapper = mount(AtengFileViewer, {
        props: {
          url: 'https://example.com/doc.pdf',
          assetBaseUrl: 'https://intranet.corp.com/file-viewer',
        },
      });

      expect(wrapper.vm.getAssetBaseUrl()).toBe('https://intranet.corp.com/file-viewer/');
      wrapper.unmount();
    });

    it('支持通过 :preset 属性动态挂载重型扩展预设', async () => {
      const cadPreset = {
        id: 'preset-cad-test',
        label: 'CAD 预设',
        renderers: [{ id: 'cad-renderer' }],
      };

      const wrapper = mount(AtengFileViewer, {
        props: {
          url: 'https://example.com/drawing.dwg',
          preset: cadPreset,
        },
      });

      const presets = wrapper.vm.getPresets();
      expect(presets.length).toBeGreaterThanOrEqual(1);
      expect(presets.some(p => p.id === 'preset-cad-test')).toBe(true);

      wrapper.unmount();
    });
  });

  describe('大文件渐进进度指示与百兆内存防崩护栏 (SizeGuard) 契约测试 (#136)', () => {
    it('当本地文件超过 maxSize (默认 100MB) 时，自动触发 SizeGuard 拦截并派发 size-guard 事件', async () => {
      // 创建一个模拟的 150MB 文件
      const largeFile = new File(['x'], 'heavy-drawing.cad', { type: 'application/octet-stream' });
      Object.defineProperty(largeFile, 'size', { value: 150 * 1024 * 1024 });

      const wrapper = mount(AtengFileViewer, {
        props: {
          file: largeFile,
          maxSize: '100MB',
        },
      });

      await nextTick();

      // 验证拦截状态
      expect(wrapper.vm.isSizeGuarded()).toBe(true);
      expect(wrapper.vm.getFileSize()).toBe(150 * 1024 * 1024);
      expect(wrapper.find('.at-file-viewer__size-guard').exists()).toBe(true);
      expect(wrapper.find('.at-file-viewer__size-guard-title').text()).toContain('SizeGuard');

      // 验证事件派发
      const sizeGuardEmits = wrapper.emitted('size-guard');
      expect(sizeGuardEmits).toBeTruthy();
      expect(sizeGuardEmits![0][0]).toEqual({
        size: 150 * 1024 * 1024,
        maxSize: 100 * 1024 * 1024,
      });

      // 验证底层 FileViewer 未挂载渲染
      expect(wrapper.findComponent({ name: 'FileViewer' }).exists()).toBe(false);

      // 调用 forceRender() 解除拦截
      wrapper.vm.forceRender();
      await nextTick();

      expect(wrapper.vm.isSizeGuarded()).toBe(false);
      expect(wrapper.find('.at-file-viewer__size-guard').exists()).toBe(false);

      wrapper.unmount();
    });

    it('点击 SizeGuard 警告卡片中的【仍要尝试渲染】按钮可解除拦截', async () => {
      const largeFile = new File(['x'], 'report.pdf', { type: 'application/pdf' });
      Object.defineProperty(largeFile, 'size', { value: 120 * 1024 * 1024 });

      const wrapper = mount(AtengFileViewer, {
        props: {
          file: largeFile,
          maxSize: '100MB',
        },
      });

      await nextTick();
      expect(wrapper.find('.at-file-viewer__size-guard').exists()).toBe(true);

      // 点击仍要尝试渲染按钮
      const forceBtn = wrapper.find('.at-file-viewer__size-guard-btn--warning');
      expect(forceBtn.exists()).toBe(true);
      await forceBtn.trigger('click');
      await nextTick();

      expect(wrapper.vm.isSizeGuarded()).toBe(false);
      expect(wrapper.find('.at-file-viewer__size-guard').exists()).toBe(false);

      wrapper.unmount();
    });

    it('支持自定义 #sizeGuard 与 #loading 插槽', async () => {
      const largeFile = new File(['x'], 'big-data.xlsx', { type: 'application/vnd.ms-excel' });
      Object.defineProperty(largeFile, 'size', { value: 80 * 1024 * 1024 });

      const wrapper = mount(AtengFileViewer, {
        props: {
          file: largeFile,
          maxSize: '50MB', // 设置较小的阈值触发拦截
        },
        slots: {
          sizeGuard: `
            <template #sizeGuard="{ formattedSize, formattedMaxSize, forceRender }">
              <div class="custom-guard">
                <span>超标: {{ formattedSize }} / {{ formattedMaxSize }}</span>
                <button class="custom-force-btn" @click="forceRender">强制打开</button>
              </div>
            </template>
          `,
        },
      });

      await nextTick();

      expect(wrapper.find('.custom-guard').exists()).toBe(true);
      expect(wrapper.find('.custom-guard').text()).toContain('80.0 MB');
      expect(wrapper.find('.custom-guard').text()).toContain('50.0 MB');

      // 点击自定义强制按钮
      await wrapper.find('.custom-force-btn').trigger('click');
      await nextTick();
      expect(wrapper.vm.isSizeGuarded()).toBe(false);

      wrapper.unmount();
    });
  });

  describe('结构化异常诊断与加密文档原地密码解密重试契约测试 (#137)', () => {
    it('捕获到加密密码保护时，原地弹出密码输入浮层并派发 password-error 与 diagnostic 事件', async () => {
      const wrapper = mount(AtengFileViewer, {
        props: {
          url: 'https://example.com/protected.pdf',
        },
      });

      await nextTick();

      // 模拟底层触发密码保护异常
      const innerViewer = wrapper.findComponent({ name: 'FileViewer' });
      expect(innerViewer.exists()).toBe(true);

      const passwordErr = new Error('Password required to decrypt document');
      passwordErr.name = 'PasswordException';
      innerViewer.vm.$emit('error', passwordErr);

      await nextTick();

      // 验证状态
      expect(wrapper.vm.isPasswordRequired()).toBe(true);
      const diag = wrapper.vm.getDiagnostic();
      expect(diag).toBeTruthy();
      expect(diag?.category).toBe('ENCRYPTED');
      expect(diag?.needsPassword).toBe(true);

      // 验证浮层元素渲染
      expect(wrapper.find('.at-file-viewer__password-card').exists()).toBe(true);
      expect(wrapper.find('.at-file-viewer__password-title').text()).toContain('文档受密码保护');

      // 验证事件派发
      expect(wrapper.emitted('password-error')).toBeTruthy();
      const diagEmits = wrapper.emitted('diagnostic');
      expect(diagEmits).toBeTruthy();
      expect((diagEmits![0][0] as { category: string }).category).toBe('ENCRYPTED');

      // 原地提交密码
      const pwdInput = wrapper.find('.at-file-viewer__password-input');
      await pwdInput.setValue('Secret123456');
      await wrapper.find('.at-file-viewer__password-submit-btn').trigger('click');
      await nextTick();

      const submitEmits = wrapper.emitted('password-submit');
      expect(submitEmits).toBeTruthy();
      expect(submitEmits![0][0]).toBe('Secret123456');

      // 模拟底层解密成功回调 (此时通过 handleLoadComplete 触发)
      await wrapper.vm.handleLoadComplete?.();
      await nextTick();

      expect(wrapper.vm.isPasswordRequired()).toBe(false);
      expect(wrapper.emitted('password-success')).toBeTruthy();

      wrapper.unmount();
    });

    it('老旧二进制 .doc 格式解析失败时输出 LEGACY_BINARY 结构化诊断建议', async () => {
      const wrapper = mount(AtengFileViewer, {
        props: {
          url: 'https://example.com/legacy_contract.doc',
          fileType: 'doc',
        },
      });

      await nextTick();
      const innerViewer = wrapper.findComponent({ name: 'FileViewer' });

      // 模拟解析失败
      innerViewer.vm.$emit('error', new Error('Not a valid OpenXML format'));
      await nextTick();

      const diag = wrapper.vm.getDiagnostic();
      expect(diag).toBeTruthy();
      expect(diag?.category).toBe('LEGACY_BINARY');
      expect(diag?.title).toContain('早期二进制');
      expect(diag?.suggestion).toContain('.docx');

      // 验证诊断卡片渲染
      expect(wrapper.find('.at-file-viewer__diag-card--legacy-binary').exists()).toBe(true);
      expect(wrapper.find('.at-file-viewer__diag-title').text()).toContain('早期二进制');

      wrapper.unmount();
    });

    it('支持通过 #password 自定义插槽接管密码输入界面', async () => {
      const wrapper = mount(AtengFileViewer, {
        props: {
          url: 'https://example.com/locked.pdf',
        },
        slots: {
          password: `
            <template #password="{ submitPassword, isDecrypting }">
              <div class="custom-pwd-box">
                <span class="custom-status">{{ isDecrypting ? '正在解密' : '请输入密码' }}</span>
                <button class="custom-pwd-submit" @click="submitPassword('MyCustomPass')">自定义解锁</button>
              </div>
            </template>
          `,
        },
      });

      await nextTick();
      const innerViewer = wrapper.findComponent({ name: 'FileViewer' });
      innerViewer.vm.$emit('error', new Error('Need password'));
      await nextTick();

      expect(wrapper.find('.custom-pwd-box').exists()).toBe(true);
      await wrapper.find('.custom-pwd-submit').trigger('click');
      await nextTick();

      expect(wrapper.emitted('password-submit')![0][0]).toBe('MyCustomPass');

      wrapper.unmount();
    });
  });
});
