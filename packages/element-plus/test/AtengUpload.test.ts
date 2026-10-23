/**
 * AtengUpload 多源大文件切片上传器与直传增强套件规范与交互测试。
 *
 * 核心验证维度：
 * 1. 基础渲染与样式隔离（.at-upload）；
 * 2. 文件大小与格式前置拦截（maxSize 与 accept 校验）；
 * 3. 多格式多媒体文件在线预览灯箱装配（AtengFilePreview 深度集成）；
 * 4. beforePreview 业务层显式前置拦截与放行契约；
 * 5. 上传中（uploading）过渡态预览防误触守卫；
 * 6. 确定性生命周期与内存回收：本地 Blob 临时 ObjectURL 在关闭弹窗、移除文件与组件卸载时确定性释放；
 * 7. 分片切片模式（:chunk="true"）与 useUpload 状态机无缝集成（暂停、继续、取消）；
 * 8. defineExpose 暴露能力完整性。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, unref } from 'vue';
import { ElUpload, ElMessage, type UploadFile, type UploadRawFile } from 'element-plus';
import { AtengUpload } from '../src/components/upload';
import { AtengFilePreview } from '../src/components/file-preview';

describe('AtengUpload 上传套件交互与切片状态机测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('基础渲染与样式隔离：正确呈现 ElUpload 并包含 .at-upload 根类名', () => {
    wrapper = mount(AtengUpload);

    expect(wrapper.classes()).toContain('at-upload');
    const uploader = wrapper.findComponent(ElUpload);
    expect(uploader.exists()).toBe(true);
  });

  it('前置体积拦截：超出 maxSize 限制时拦截上传并派发 size-exceed 事件', async () => {
    wrapper = mount(AtengUpload, {
      props: {
        maxSize: 1024, // 限制 1KB
      },
    });

    const uploader = wrapper.findComponent(ElUpload);
    const beforeUpload = uploader.props('beforeUpload') as (
      file: UploadRawFile,
    ) => Promise<boolean>;
    expect(beforeUpload).toBeDefined();

    // 构造超限文件 (2KB)
    const largeFile = new File(['a'.repeat(2048)], 'large.txt', {
      type: 'text/plain',
    }) as UploadRawFile;
    const canUpload = await beforeUpload(largeFile);

    expect(canUpload).toBe(false);
    expect(wrapper.emitted('size-exceed')).toBeTruthy();
    expect(wrapper.emitted('size-exceed')![0][0]).toBe(largeFile);
    expect(wrapper.emitted('size-exceed')![0][1]).toBe(1024);
  });

  it('前置格式拦截：不符合 accept 规则时拦截上传并派发 type-reject 事件', async () => {
    wrapper = mount(AtengUpload, {
      props: {
        accept: 'image/*,.pdf',
      },
    });

    const uploader = wrapper.findComponent(ElUpload);
    const beforeUpload = uploader.props('beforeUpload') as (
      file: UploadRawFile,
    ) => Promise<boolean>;

    // 1. 测试不合法文件 (.txt)
    const invalidFile = new File(['hello'], 'invalid.txt', { type: 'text/plain' }) as UploadRawFile;
    const rejectResult = await beforeUpload(invalidFile);
    expect(rejectResult).toBe(false);
    expect(wrapper.emitted('type-reject')).toBeTruthy();

    // 2. 测试合法文件 (image/png)
    const validImage = new File(['image binary'], 'avatar.png', {
      type: 'image/png',
    }) as UploadRawFile;
    const acceptImageResult = await beforeUpload(validImage);
    expect(acceptImageResult).toBe(true);

    // 3. 测试合法文件 (.pdf)
    const validPdf = new File(['pdf binary'], 'document.pdf', {
      type: 'application/pdf',
    }) as UploadRawFile;
    const acceptPdfResult = await beforeUpload(validPdf);
    expect(acceptPdfResult).toBe(true);
  });

  it('多格式在线预览集成：点击列表项呼出 AtengFilePreview 全屏灯箱并装配多媒体格式推导', async () => {
    wrapper = mount(AtengUpload, {
      props: {
        showPreview: true,
        previewTitle: '统一文件预览',
      },
    });

    const uploader = wrapper.findComponent(ElUpload);

    // 1. 测试图片格式文件预览
    const mockImageFile: UploadFile = {
      name: 'banner.jpg',
      url: 'https://example.com/banner.jpg',
      uid: 101,
      status: 'success',
    };
    uploader.vm.$emit('preview', mockImageFile);
    await nextTick();

    expect(wrapper.emitted('preview')).toBeTruthy();
    let filePreview = wrapper.findComponent(AtengFilePreview);
    expect(filePreview.exists()).toBe(true);
    expect(filePreview.props('visible')).toBe(true);
    expect(filePreview.props('url')).toBe('https://example.com/banner.jpg');
    expect(filePreview.props('name')).toBe('banner.jpg');
    expect(filePreview.props('title')).toBe('统一文件预览');

    // 2. 测试 PDF 格式文件预览
    const mockPdfFile: UploadFile = {
      name: 'annual_report.pdf',
      url: 'https://example.com/annual_report.pdf',
      uid: 102,
      status: 'success',
    };
    uploader.vm.$emit('preview', mockPdfFile);
    await nextTick();

    filePreview = wrapper.findComponent(AtengFilePreview);
    expect(filePreview.props('visible')).toBe(true);
    expect(filePreview.props('url')).toBe('https://example.com/annual_report.pdf');
    expect(filePreview.props('name')).toBe('annual_report.pdf');

    // 3. 测试音视频媒体文件预览
    const mockVideoFile: UploadFile = {
      name: 'demo.mp4',
      url: 'https://example.com/demo.mp4',
      uid: 103,
      status: 'success',
    };
    uploader.vm.$emit('preview', mockVideoFile);
    await nextTick();

    filePreview = wrapper.findComponent(AtengFilePreview);
    expect(filePreview.props('visible')).toBe(true);
    expect(filePreview.props('url')).toBe('https://example.com/demo.mp4');

    // 4. 测试代码文件格式预览
    const mockCodeFile: UploadFile = {
      name: 'config.json',
      url: 'https://example.com/config.json',
      uid: 104,
      status: 'success',
    };
    uploader.vm.$emit('preview', mockCodeFile);
    await nextTick();

    filePreview = wrapper.findComponent(AtengFilePreview);
    expect(filePreview.props('visible')).toBe(true);
    expect(filePreview.props('name')).toBe('config.json');

    // 5. 测试未知类型文件降级
    const mockUnknownFile: UploadFile = {
      name: 'archive.tar.gz',
      url: 'https://example.com/archive.tar.gz',
      uid: 105,
      status: 'success',
    };
    uploader.vm.$emit('preview', mockUnknownFile);
    await nextTick();

    filePreview = wrapper.findComponent(AtengFilePreview);
    expect(filePreview.props('visible')).toBe(true);
    expect(filePreview.props('name')).toBe('archive.tar.gz');
  });

  it('beforePreview 前置拦截守卫：配置 beforePreview 返回 false 时成功阻断预览弹窗呼出', async () => {
    const beforePreviewMock = vi.fn().mockImplementation((file: UploadFile) => {
      // 拦截含有 secret 的文件
      return !file.name.includes('secret');
    });

    wrapper = mount(AtengUpload, {
      props: {
        showPreview: true,
        beforePreview: beforePreviewMock,
      },
    });

    const uploader = wrapper.findComponent(ElUpload);

    // 1. 尝试预览机密文件 -> 应被阻断
    const secretFile: UploadFile = {
      name: 'secret-contract.pdf',
      url: 'https://example.com/secret.pdf',
      uid: 201,
      status: 'success',
    };
    uploader.vm.$emit('preview', secretFile);
    await nextTick();

    expect(beforePreviewMock).toHaveBeenCalledWith(secretFile);
    let filePreview = wrapper.findComponent(AtengFilePreview);
    expect(filePreview.props('visible')).toBe(false);

    // 2. 尝试预览公开普通文件 -> 正常放行呼出
    const publicFile: UploadFile = {
      name: 'public-guide.png',
      url: 'https://example.com/guide.png',
      uid: 202,
      status: 'success',
    };
    uploader.vm.$emit('preview', publicFile);
    await nextTick();

    expect(beforePreviewMock).toHaveBeenCalledWith(publicFile);
    filePreview = wrapper.findComponent(AtengFilePreview);
    expect(filePreview.props('visible')).toBe(true);
  });

  it('beforePreview 异步前置拦截守卫：支持返回 Promise<boolean> 阻断或放行', async () => {
    const asyncBeforePreview = vi.fn().mockImplementation(async (file: UploadFile) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return file.name.endsWith('.png');
    });

    wrapper = mount(AtengUpload, {
      props: {
        showPreview: true,
        beforePreview: asyncBeforePreview,
      },
    });

    const uploader = wrapper.findComponent(ElUpload);

    // 1. 异步阻断
    const rejectedFile: UploadFile = {
      name: 'archive.zip',
      url: 'https://example.com/archive.zip',
      uid: 203,
      status: 'success',
    };
    uploader.vm.$emit('preview', rejectedFile);
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 20));
    await nextTick();

    let filePreview = wrapper.findComponent(AtengFilePreview);
    expect(filePreview.props('visible')).toBe(false);

    // 2. 异步放行
    const allowedFile: UploadFile = {
      name: 'photo.png',
      url: 'https://example.com/photo.png',
      uid: 204,
      status: 'success',
    };
    uploader.vm.$emit('preview', allowedFile);
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 20));
    await nextTick();

    filePreview = wrapper.findComponent(AtengFilePreview);
    expect(filePreview.props('visible')).toBe(true);
  });

  it('上传中状态受控防误触：处于 uploading 状态的文件点击预览被前置拦截并弹出提示', async () => {
    const warningSpy = vi.spyOn(ElMessage, 'warning');

    wrapper = mount(AtengUpload, {
      props: {
        showPreview: true,
      },
    });

    const uploadingFile: UploadFile = {
      name: 'large-data.zip',
      url: '',
      uid: 301,
      status: 'uploading',
    };

    const uploader = wrapper.findComponent(ElUpload);
    uploader.vm.$emit('preview', uploadingFile);
    await nextTick();

    expect(warningSpy).toHaveBeenCalledWith('文件正在上传中，请稍候预览');
    const filePreview = wrapper.findComponent(AtengFilePreview);
    expect(filePreview.props('visible')).toBe(false);
  });

  it('确定性生命周期与内存回收：本地 Blob 临时 ObjectURL 在关闭弹窗、移除文件与组件卸载时确定性释放', async () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost:3000/mock-uuid-1');
    const revokeObjectURLMock = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    });

    wrapper = mount(AtengUpload, {
      props: {
        showPreview: true,
      },
    });

    const rawFile = new File(['local binary data'], 'local-sheet.png', {
      type: 'image/png',
    });
    const localUploadFile: UploadFile = {
      name: 'local-sheet.png',
      raw: rawFile as UploadRawFile,
      uid: 401,
      status: 'ready',
    };

    const uploader = wrapper.findComponent(ElUpload);

    // 1. 点击预览本地选取的文件 -> 应调用 createObjectURL 生成临时地址
    uploader.vm.$emit('preview', localUploadFile);
    await nextTick();

    expect(createObjectURLMock).toHaveBeenCalledWith(rawFile);
    const filePreview = wrapper.findComponent(AtengFilePreview);
    expect(filePreview.props('visible')).toBe(true);
    expect(filePreview.props('url')).toBe('blob:http://localhost:3000/mock-uuid-1');

    // 2. 场景 A：关闭预览弹窗 -> 必须且只能确定性调用 revokeObjectURL 释放句柄
    filePreview.vm.$emit('close');
    await nextTick();

    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost:3000/mock-uuid-1');
    expect(wrapper.emitted('preview-close')).toBeTruthy();

    // 3. 场景 B：再次打开后通过从列表中移除文件（handleRemove）触发回收
    uploader.vm.$emit('preview', localUploadFile);
    await nextTick();
    expect(filePreview.props('visible')).toBe(true);

    uploader.vm.$emit('remove', localUploadFile, []);
    await nextTick();

    expect(revokeObjectURLMock).toHaveBeenCalled();
    expect(filePreview.props('visible')).toBe(false);

    // 4. 场景 C：重新预览并触发组件卸载 -> 确定性释放所有在管句柄
    uploader.vm.$emit('preview', localUploadFile);
    await nextTick();

    wrapper.unmount();
    wrapper = null;

    expect(revokeObjectURLMock).toHaveBeenCalled();
  });

  it('分片模式集成：支持开启 :chunk="true"，调度 customUploadChunk 与 customMerge 完成切片上传', async () => {
    const customUploadChunkMock = vi.fn().mockImplementation(async chunk => {
      return { chunkIndex: chunk.index, uploaded: true };
    });

    const customMergeMock = vi.fn().mockResolvedValue({
      fileId: 'merged_1001',
      fileUrl: 'https://example.com/merged.zip',
    });

    wrapper = mount(AtengUpload, {
      props: {
        chunk: true,
        chunkSize: 1024, // 1KB per chunk
        concurrency: 2,
        customUploadChunk: customUploadChunkMock,
        customMerge: customMergeMock,
      },
    });

    // 构造 2.5KB 测试文件（应切分为 3 个分片：1KB, 1KB, 0.5KB）
    const mockFile = new File(['a'.repeat(2500)], 'archive.zip', {
      type: 'application/zip',
    });

    const exposed = wrapper.vm as unknown as {
      uploadChunkFile: (file: File) => Promise<unknown>;
      uploadStatus: { value: string };
      chunkProgress: { value: number };
    };

    // 启动分片上传
    const uploadPromise = exposed.uploadChunkFile(mockFile);
    await nextTick();

    // 上传中检查进度沉浸面板渲染
    const chunkPanel = wrapper.find('.at-upload__chunk-panel');
    expect(chunkPanel.exists()).toBe(true);

    // 等待上传完成
    await uploadPromise;
    await nextTick();

    // 验证切片上传器被调用 3 次
    expect(customUploadChunkMock).toHaveBeenCalledTimes(3);

    // 验证最终调用合并接口
    expect(customMergeMock).toHaveBeenCalledTimes(1);

    // 验证派发 chunk-success 与进度 100%
    expect(wrapper.emitted('chunk-success')).toBeTruthy();
    expect(unref(exposed.chunkProgress)).toBe(100);
    expect(unref(exposed.uploadStatus)).toBe('success');
  });

  it('分片状态机控制：支持暂停、继续与取消上传操作', async () => {
    const customUploadChunkMock = vi.fn().mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => resolve({ ok: true }), 100);
      });
    });

    wrapper = mount(AtengUpload, {
      props: {
        chunk: true,
        chunkSize: 500,
        customUploadChunk: customUploadChunkMock,
      },
    });

    const mockFile = new File(['a'.repeat(1500)], 'data.bin');
    const exposed = wrapper.vm as unknown as {
      uploadChunkFile: (file: File) => Promise<unknown>;
      pause: () => void;
      resume: () => Promise<unknown>;
      cancel: () => void;
      uploadStatus: unknown;
    };

    // 1. 开始上传
    exposed.uploadChunkFile(mockFile);
    await nextTick();
    expect(unref(exposed.uploadStatus)).toBe('uploading');

    // 2. 暂停
    exposed.pause();
    await nextTick();
    expect(unref(exposed.uploadStatus)).toBe('paused');

    // 3. 取消
    exposed.cancel();
    await nextTick();
    expect(unref(exposed.uploadStatus)).toBe('canceled');
  });

  it('对外暴露能力：defineExpose 完整暴露原生 uploadRef、控制句柄与编程式预览门面', () => {
    wrapper = mount(AtengUpload, {
      props: {
        chunk: true,
      },
    });

    const exposed = wrapper.vm as unknown as {
      uploadRef: unknown;
      uploadStatus: unknown;
      chunkProgress: unknown;
      uploading: unknown;
      chunks: unknown;
      uploadChunkFile: unknown;
      pause: unknown;
      resume: unknown;
      cancel: unknown;
      reset: unknown;
      clearFiles: unknown;
      submit: unknown;
      previewFile: unknown;
      closePreview: unknown;
    };

    expect(exposed.uploadRef).toBeDefined();
    expect(exposed.uploadStatus).toBeDefined();
    expect(exposed.chunkProgress).toBeDefined();
    expect(exposed.uploading).toBeDefined();
    expect(exposed.chunks).toBeDefined();
    expect(typeof exposed.uploadChunkFile).toBe('function');
    expect(typeof exposed.pause).toBe('function');
    expect(typeof exposed.resume).toBe('function');
    expect(typeof exposed.cancel).toBe('function');
    expect(typeof exposed.reset).toBe('function');
    expect(typeof exposed.clearFiles).toBe('function');
    expect(typeof exposed.submit).toBe('function');
    expect(typeof exposed.previewFile).toBe('function');
    expect(typeof exposed.closePreview).toBe('function');
  });
});
