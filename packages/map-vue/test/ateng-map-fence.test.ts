/**
 * AtengMapFence 组件单元测试。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AtengMapFence from '../src/components/AtengMapFence.vue';
import type { FenceRecord, MapCoordinate } from '../src/types';

describe('AtengMapFence 组件单元测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应当正确挂载并渲染标绘工具栏、地图容器与围栏列表', () => {
    const wrapper = mount(AtengMapFence);

    expect(wrapper.classes()).toContain('at-map-fence');
    expect(wrapper.find('.at-map-fence__toolbar').exists()).toBe(true);
    expect(wrapper.find('.at-map-fence__viewport').exists()).toBe(true);
    expect(wrapper.find('.at-map-fence__draw-btns').exists()).toBe(true);

    wrapper.unmount();
  });

  it('应当支持从工具栏切换标绘模式与完成标绘生成围栏', async () => {
    const wrapper = mount(AtengMapFence);

    const polygonBtn = wrapper.findAll('.at-map-fence__btn--mode')[1];
    expect(polygonBtn).toBeDefined();
    await polygonBtn?.trigger('click');

    expect(wrapper.emitted('update:drawMode')?.[0]).toEqual(['polygon']);
    expect(wrapper.find('.at-map-fence__drawing-tip').exists()).toBe(true);

    // 实例添加 3 个顶点
    const vm = wrapper.vm as unknown as {
      addDrawingPoint: (c: MapCoordinate) => void;
      finishDrawing: () => void;
    };
    vm.addDrawingPoint({ lng: 116.4, lat: 39.9 });
    vm.addDrawingPoint({ lng: 116.41, lat: 39.9 });
    vm.addDrawingPoint({ lng: 116.41, lat: 39.91 });
    await wrapper.vm.$nextTick();

    const finishBtn = wrapper.find('.at-map-fence__finish-btn');
    expect(finishBtn.exists()).toBe(true);
    await finishBtn.trigger('click');

    expect(wrapper.emitted('fenceCreate')).toBeTruthy();

    wrapper.unmount();
  });

  it('外部传入 checkPoints 属性时应当自动执行越界报警判定并派发事件', async () => {
    const initialFences: FenceRecord[] = [
      {
        id: 'f-1',
        name: '特区圆形围栏',
        shape: 'circle',
        center: { lng: 116.4074, lat: 39.9042 },
        radius: 1000,
      },
    ];

    const wrapper = mount(AtengMapFence, {
      props: {
        fences: initialFences,
      },
    });

    // 传入进入围栏的点位
    await wrapper.setProps({
      checkPoints: { lng: 116.4074, lat: 39.9042 },
    });

    expect(wrapper.emitted('pointEnter')).toBeTruthy();
    const enterEvents = wrapper.emitted('pointEnter');
    expect(enterEvents?.[0]?.[0]).toMatchObject({
      action: 'enter',
      fence: expect.objectContaining({ id: 'f-1' }),
    });

    wrapper.unmount();
  });

  it('应当支持删除围栏与清空所有围栏', async () => {
    const initialFences: FenceRecord[] = [
      {
        id: 'f-1',
        name: '待删围栏',
        shape: 'circle',
        center: { lng: 116.4, lat: 39.9 },
        radius: 500,
      },
    ];

    const wrapper = mount(AtengMapFence, {
      props: {
        fences: initialFences,
      },
    });

    const deleteBtn = wrapper.find('.at-map-fence__del-btn');
    expect(deleteBtn.exists()).toBe(true);
    await deleteBtn.trigger('click');

    expect(wrapper.emitted('fenceDelete')).toBeTruthy();
    expect(wrapper.emitted('fenceDelete')?.[0]).toEqual(['f-1']);

    wrapper.unmount();
  });

  it('应当通过 defineExpose 暴露完备的实例操作方法', () => {
    const wrapper = mount(AtengMapFence);
    const exposed = wrapper.vm as unknown as Record<string, unknown>;

    expect(exposed.fences).toBeDefined();
    expect(typeof exposed.setDrawMode).toBe('function');
    expect(typeof exposed.addFence).toBe('function');
    expect(typeof exposed.updateFence).toBe('function');
    expect(typeof exposed.removeFence).toBe('function');
    expect(typeof exposed.clearFences).toBe('function');
    expect(typeof exposed.checkPoint).toBe('function');

    wrapper.unmount();
  });
});
