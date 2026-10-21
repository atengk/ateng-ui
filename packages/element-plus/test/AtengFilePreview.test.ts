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
});
