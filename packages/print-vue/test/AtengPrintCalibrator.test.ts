/**
 * AtengPrintCalibrator 预印套打毫米校准器单元测试。
 *
 * 验证偏差微调、localStorage 硬件级持久化、测试标尺单据渲染与重置。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import AtengPrintCalibrator from '../src/components/AtengPrintCalibrator.vue';

describe('AtengPrintCalibrator', () => {
  let wrapper: VueWrapper<unknown> | null = null;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    vi.restoreAllMocks();
  });

  it('初始挂载：默认偏移为 0mm，并成功展示十字标尺测试卡片', () => {
    wrapper = mount(AtengPrintCalibrator, {
      props: {
        printerName: 'DASCOM-DS-620',
      },
    });

    const vm = wrapper.vm as unknown as {
      offsetX: number;
      offsetY: number;
      getOffsets: () => { offsetX: number; offsetY: number };
    };

    expect(vm.offsetX).toBe(0);
    expect(vm.offsetY).toBe(0);
    expect(vm.getOffsets()).toEqual({ offsetX: 0, offsetY: 0 });
    expect(wrapper.find('.at-print-calibrator').exists()).toBe(true);
    expect(wrapper.find('.at-print-calibrator__crosshair').exists()).toBe(true);
  });

  it('微调操作：触发 update:offsetX 与 change 事件', async () => {
    wrapper = mount(AtengPrintCalibrator, {
      props: {
        offsetX: 0,
        offsetY: 0,
        printerName: 'HP-LaserJet',
      },
    });

    const vm = wrapper.vm as unknown as {
      setOffset: (x: number, y: number) => void;
      getOffsets: () => { offsetX: number; offsetY: number };
    };

    vm.setOffset(2.5, -1.5);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:offsetX')?.[0]).toEqual([2.5]);
    expect(wrapper.emitted('update:offsetY')?.[0]).toEqual([-1.5]);
    expect(wrapper.emitted('change')?.[0]).toEqual([{ offsetX: 2.5, offsetY: -1.5 }]);
    expect(vm.getOffsets()).toEqual({ offsetX: 2.5, offsetY: -1.5 });
  });

  it('硬件级持久化：自动将各打印机的校准偏移独立持久化至 localStorage', async () => {
    const printerA = 'Epson-Receipt-01';
    const printerB = 'Dascom-Perforated-02';

    // 针对 Printer A 设置并保存
    const wrapperA = mount(AtengPrintCalibrator, {
      props: { printerName: printerA, autoSave: true },
    });
    const vmA = wrapperA.vm as unknown as {
      setOffset: (x: number, y: number) => void;
    };
    vmA.setOffset(1.5, 2.0);
    await wrapperA.vm.$nextTick();

    // 针对 Printer B 设置并保存
    const wrapperB = mount(AtengPrintCalibrator, {
      props: { printerName: printerB, autoSave: true },
    });
    const vmB = wrapperB.vm as unknown as {
      setOffset: (x: number, y: number) => void;
    };
    vmB.setOffset(-3.0, -1.0);
    await wrapperB.vm.$nextTick();

    wrapperA.unmount();
    wrapperB.unmount();

    // 重新挂载 Printer A，验证自动恢复偏移
    const reloadedA = mount(AtengPrintCalibrator, {
      props: { printerName: printerA },
    });
    const reloadedVmA = reloadedA.vm as unknown as {
      getOffsets: () => { offsetX: number; offsetY: number };
    };
    expect(reloadedVmA.getOffsets()).toEqual({ offsetX: 1.5, offsetY: 2.0 });

    // 重新挂载 Printer B，验证自动恢复偏移
    const reloadedB = mount(AtengPrintCalibrator, {
      props: { printerName: printerB },
    });
    const reloadedVmB = reloadedB.vm as unknown as {
      getOffsets: () => { offsetX: number; offsetY: number };
    };
    expect(reloadedVmB.getOffsets()).toEqual({ offsetX: -3.0, offsetY: -1.0 });

    reloadedA.unmount();
    reloadedB.unmount();
  });

  it('重置校准：reset() 将偏移重置为 0 并同步清空存储', async () => {
    wrapper = mount(AtengPrintCalibrator, {
      props: { printerName: 'Printer-Reset-Test', autoSave: true },
    });

    const vm = wrapper.vm as unknown as {
      setOffset: (x: number, y: number) => void;
      reset: () => void;
      getOffsets: () => { offsetX: number; offsetY: number };
    };

    vm.setOffset(3, 4);
    await wrapper.vm.$nextTick();
    expect(vm.getOffsets()).toEqual({ offsetX: 3, offsetY: 4 });

    vm.reset();
    await wrapper.vm.$nextTick();
    expect(vm.getOffsets()).toEqual({ offsetX: 0, offsetY: 0 });
    expect(wrapper.emitted('reset')).toBeTruthy();
  });
});
