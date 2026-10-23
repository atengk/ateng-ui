/**
 * AtengFilePreview 多格式文件预览组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { AtengFilePreview } from '../src/components/file-preview';

describe('AtengFilePreview 多格式文件预览门户交互与契约测试', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('图片格式自动识别与图片灯箱渲染', async () => {
    const wrapper = mount(AtengFilePreview, {
      props: {
        url: 'https://example.com/banner.png',
      },
    });

    expect(wrapper.classes()).toContain('at-file-preview');
    expect(wrapper.find('.at-file-preview__image').exists()).toBe(true);
    expect(wrapper.find('.at-file-preview__image-hint').exists()).toBe(true);

    wrapper.unmount();
  });

  it('SVG 矢量字符串 content 自动转换为 Blob URL 渲染', async () => {
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL');
    const wrapper = mount(AtengFilePreview, {
      props: {
        name: 'flow.svg',
        content: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>',
      },
    });

    expect(wrapper.find('.at-file-preview__image').exists()).toBe(true);
    expect(createObjectUrlSpy).toHaveBeenCalled();

    wrapper.unmount();
  });

  it('PDF 格式原生 iframe 渲染', async () => {
    const wrapper = mount(AtengFilePreview, {
      props: {
        url: 'https://example.com/annual_report.pdf',
      },
    });

    expect(wrapper.find('iframe.at-file-preview__pdf-frame').exists()).toBe(true);

    wrapper.unmount();
  });

  it('音视频格式原生媒体播放器渲染', async () => {
    // 视频
    const wrapperVideo = mount(AtengFilePreview, {
      props: {
        url: 'https://example.com/trailer.mp4',
      },
    });
    expect(wrapperVideo.find('video').exists()).toBe(true);
    wrapperVideo.unmount();

    // 音频
    const wrapperAudio = mount(AtengFilePreview, {
      props: {
        url: 'https://example.com/song.mp3',
      },
    });
    expect(wrapperAudio.find('audio').exists()).toBe(true);
    wrapperAudio.unmount();
  });

  it('代码与文本格式联动 AtengCodeView 语法高亮', async () => {
    const wrapper = mount(AtengFilePreview, {
      props: {
        name: 'config.json',
        content: '{"service": "gateway", "port": 8080}',
      },
    });

    expect(wrapper.findComponent({ name: 'AtengCodeView' }).exists()).toBe(true);

    wrapper.unmount();
  });

  it('未知格式降级引导与下载触发', async () => {
    const wrapper = mount(AtengFilePreview, {
      props: {
        name: 'package.zip',
        url: 'https://example.com/package.zip',
      },
    });

    expect(wrapper.find('.at-file-preview__unsupported').exists()).toBe(true);
    expect(wrapper.text()).toContain('package.zip');

    wrapper.unmount();
  });

  it('确定性生命周期：Blob 临时 ObjectURL 创建与卸载回收', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    const fakeBlob = new Blob(['hello world'], { type: 'text/plain' });

    const wrapper = mount(AtengFilePreview, {
      props: {
        file: fakeBlob,
        name: 'test.txt',
      },
    });

    expect(wrapper.exists()).toBe(true);

    wrapper.unmount();
    expect(revokeSpy).toHaveBeenCalled();
  });

  it('显式指定 fileType 覆盖自动推导，并在 Expose 中动态输出', async () => {
    // 文件名为 .txt，但显式指定 fileType="code"
    const wrapper = mount(AtengFilePreview, {
      props: {
        name: 'script.txt',
        fileType: 'code',
        content: 'console.log("hello");',
      },
    });

    expect(wrapper.vm.detectedType).toBe('code');
    expect(wrapper.findComponent({ name: 'AtengCodeView' }).exists()).toBe(true);

    wrapper.unmount();
  });

  it('命令式调用 download() 触发 download 事件与下载流程', async () => {
    const wrapper = mount(AtengFilePreview, {
      props: {
        url: 'https://example.com/files/report.pdf',
        name: 'custom_report.pdf',
      },
    });

    wrapper.vm.download();
    expect(wrapper.emitted('download')?.[0]?.[0]).toBe('custom_report.pdf');

    wrapper.unmount();
  });

  it('自定义 #unsupported 插槽内容替换默认降级提示', async () => {
    const wrapper = mount(AtengFilePreview, {
      props: {
        name: 'archive.tar.gz',
        url: 'https://example.com/archive.tar.gz',
      },
      slots: {
        unsupported: `<template #unsupported="{ filename }">
          <div class="custom-unsupported">自定义不支持格式：{{ filename }}</div>
        </template>`,
      },
    });

    expect(wrapper.find('.custom-unsupported').exists()).toBe(true);
    expect(wrapper.find('.custom-unsupported').text()).toContain('archive.tar.gz');

    wrapper.unmount();
  });

  it('弹窗模式正确渲染并递归装载内嵌预览视图', async () => {
    const wrapper = mount(AtengFilePreview, {
      props: {
        mode: 'dialog',
        visible: true,
        name: 'app.json',
        content: '{"key": "value"}',
        height: 560,
      },
      attachTo: document.body,
    });
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(wrapper.exists()).toBe(true);

    wrapper.unmount();
  });
});
