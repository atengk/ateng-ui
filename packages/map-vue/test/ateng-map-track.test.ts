/**
 * AtengMapTrack 组件单元测试。
 *
 * 遵循三铁律与对抗性验证规范。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AtengMapTrack from '../src/components/AtengMapTrack.vue';
import type { AtengMapTrackInstance, TrackPoint } from '../src/types';

describe('AtengMapTrack 组件', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  const mockPoints: TrackPoint[] = [
    { coordinate: { lng: 116.4074, lat: 39.9042 }, name: '起点' },
    { coordinate: { lng: 116.4074, lat: 39.9142 }, name: '途径点' },
    { coordinate: { lng: 116.4174, lat: 39.9142 }, name: '终点', isStop: true, stopDuration: 60 },
  ];

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  it('成功挂载并渲染地图容器与回放控制底栏', () => {
    wrapper = mount(AtengMapTrack, {
      props: {
        trackPoints: mockPoints,
        height: '400px',
      },
    });

    expect(wrapper.find('.at-map-track-container').exists()).toBe(true);
    expect(wrapper.find('.at-map-track-bar').exists()).toBe(true);
    expect(wrapper.find('.at-map-track-play-btn').exists()).toBe(true);
  });

  it('支持关闭控制底栏 (showControlBar: false)', () => {
    wrapper = mount(AtengMapTrack, {
      props: {
        trackPoints: mockPoints,
        showControlBar: false,
      },
    });

    expect(wrapper.find('.at-map-track-bar').exists()).toBe(false);
  });

  it('通过暴露的实例方法 play/pause/stop 操控播放', async () => {
    wrapper = mount(AtengMapTrack, {
      props: {
        trackPoints: mockPoints,
      },
    });

    const vm = wrapper.vm as unknown as AtengMapTrackInstance;
    expect(vm.status).toBe('idle');

    vm.play();
    expect(vm.status).toBe('playing');

    vm.pause();
    expect(vm.status).toBe('paused');

    vm.stop();
    expect(vm.status).toBe('idle');
  });

  it('支持倍速切换与 seek 进度操作', async () => {
    wrapper = mount(AtengMapTrack, {
      props: {
        trackPoints: mockPoints,
      },
    });

    const vm = wrapper.vm as unknown as AtengMapTrackInstance;
    vm.setSpeedRate(4);
    expect(vm.speedRate).toBe(4);

    vm.seek(0.5);
    expect(vm.progress).toBe(0.5);
  });
});
