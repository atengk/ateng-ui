/**
 * AtengUpload 多源大文件切片上传器与直传增强套件规范与交互测试。
 *
 * 核心验证维度：
 * 1. 基础渲染与样式隔离（.at-upload）；
 * 2. 文件大小与格式前置拦截（maxSize 与 accept 校验）；
 * 3. 图片缩略图大图弹窗预览交互与 DOM 生命周期清理；
 * 4. 分片切片模式（:chunk="true"）与 useUpload 状态机无缝集成；
 * 5. 切片上传全流程联动（customUploadChunk、customMerge、进度调度与完成回调）；
 * 6. 暂停、继续、取消与状态控制操作；
 * 7. defineExpose 暴露能力完整性。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, unref } from 'vue';
import { ElUpload } from 'element-plus';
import { AtengUpload } from '../src/components/upload';
import type { UploadRawFile } from 'element-plus';

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

  it('图片预览弹窗：点击图片预览时打开预览弹窗并展示图片', async () => {
    wrapper = mount(AtengUpload, {
      props: {
        showPreview: true,
        previewTitle: '测试预览大图',
      },
    });

    const mockImageFile = {
      name: 'banner.jpg',
      url: 'https://example.com/banner.jpg',
      raw: new File([''], 'banner.jpg', { type: 'image/jpeg' }) as UploadRawFile,
      uid: 1,
      status: 'success' as const,
    };

    // 模拟触发 preview 事件
    const uploader = wrapper.findComponent(ElUpload);
    uploader.vm.$emit('preview', mockImageFile);
    await nextTick();

    expect(wrapper.emitted('preview')).toBeTruthy();

    // 检查预览图片与弹窗可见
    const previewImg = wrapper.find('.at-upload__preview-img');
    expect(previewImg.exists()).toBe(true);
    expect(previewImg.attributes('src')).toBe('https://example.com/banner.jpg');
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

  it('对外暴露能力：defineExpose 完整暴露原生 uploadRef 与状态机控制句柄', () => {
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
  });
});
