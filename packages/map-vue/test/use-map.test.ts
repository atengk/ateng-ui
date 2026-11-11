/**
 * useMap 与 useMapThemeSync 状态机单元测试。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMap, useMapThemeSync, detectHostIsDark } from '../src';

describe('useMapThemeSync 响应式暗黑主题跟随', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  it('应当正确检测宿主 .dark 与 [data-theme=dark] 状态', () => {
    expect(detectHostIsDark()).toBe(false);

    document.documentElement.classList.add('dark');
    expect(detectHostIsDark()).toBe(true);

    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    expect(detectHostIsDark()).toBe(true);
  });

  it('显式配置 theme=true 时应当保持暗黑生效', () => {
    const onThemeChange = vi.fn();
    const { isDark, dispose } = useMapThemeSync({
      theme: true,
      onThemeChange,
    });

    expect(isDark.value).toBe(true);
    expect(onThemeChange).toHaveBeenCalledWith(true);
    dispose();
  });
});

describe('useMap 核心无头状态机', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('初始化挂载应当正确就绪并暴露门面方法', async () => {
    const onReady = vi.fn();
    const mapState = useMap({
      container,
      center: { lng: 116.4, lat: 39.9 },
      zoom: 12,
      onReady,
    });

    expect(mapState.ready.value).toBe(false);

    await mapState.mount();

    expect(mapState.ready.value).toBe(true);
    expect(mapState.getDriver()).toBeDefined();
    expect(mapState.getRawInstance()).toBeDefined();
    expect(onReady).toHaveBeenCalled();

    // 命令式操作测试
    mapState.setCenter({ lng: 116.5, lat: 39.8 }, false);
    expect(mapState.currentCenter.value.lng).toBe(116.5);

    mapState.setZoom(15, false);
    expect(mapState.currentZoom.value).toBe(15);

    mapState.addMarker({
      id: 'm-1',
      coordinate: { lng: 116.5, lat: 39.8 },
      title: 'Marker 1',
    });

    mapState.removeMarker('m-1');
    mapState.clearMarkers();
    mapState.invalidateSize();

    // 确定性销毁
    mapState.dispose();
    expect(mapState.ready.value).toBe(false);
    expect(mapState.getDriver()).toBeNull();
  });
});
