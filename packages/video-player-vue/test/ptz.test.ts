/**
 * 工单 #147: 安防云台控制盘 AtengPtzControl、画面手势联动与硬件加速电子放大单测套件。
 *
 * 遵循前端自洽单测 3 铁律，100% 离线断言与 DOM 现场还原。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AtengPtzControl,
  calculatePtzDirection,
  useDigitalZoom,
  usePtzGesture,
  type PtzCommand,
  type PtzPresetItem,
} from '../src';

describe('工单 #147 安防云台与电子放大测试套件', () => {
  let wrappers: ReturnType<typeof mount>[] = [];

  beforeEach(() => {
    wrappers = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    wrappers.forEach(w => w.unmount());
    wrappers = [];
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  describe('1. calculatePtzDirection 8 方向向量数学推导', () => {
    it('应精准判定 8 个 45° 扇区方向', () => {
      // 0° (向右)
      expect(calculatePtzDirection(10, 0)).toBe('right');
      // 45° (右下)
      expect(calculatePtzDirection(10, 10)).toBe('down-right');
      // 90° (向下)
      expect(calculatePtzDirection(0, 10)).toBe('down');
      // 135° (左下)
      expect(calculatePtzDirection(-10, 10)).toBe('down-left');
      // 180° / -180° (向左)
      expect(calculatePtzDirection(-10, 0)).toBe('left');
      // -135° (左上)
      expect(calculatePtzDirection(-10, -10)).toBe('up-left');
      // -90° (向上)
      expect(calculatePtzDirection(0, -10)).toBe('up');
      // -45° (右上)
      expect(calculatePtzDirection(10, -10)).toBe('up-right');
    });
  });

  describe('2. useDigitalZoom 纯前端硬件加速电子放大状态机', () => {
    it('默认初始缩放为 1.0x，支持 zoomIn / zoomOut 与极限区间约束', () => {
      const zoom = useDigitalZoom({ minScale: 1.0, maxScale: 4.0, step: 0.5 });
      expect(zoom.scale.value).toBe(1.0);
      expect(zoom.offsetX.value).toBe(0);
      expect(zoom.offsetY.value).toBe(0);

      // 放大 0.5
      zoom.zoomIn();
      expect(zoom.scale.value).toBe(1.5);

      // 放大至超过 4.0 上限被阻尼 clamp
      zoom.setZoom(10.0);
      expect(zoom.scale.value).toBe(4.0);

      // 缩小至低于 1.0 下限被阻尼 clamp
      zoom.setZoom(0.2);
      expect(zoom.scale.value).toBe(1.0);
      expect(zoom.offsetX.value).toBe(0);
      expect(zoom.offsetY.value).toBe(0);
    });

    it('resetZoom 应将倍率还原为 1.0 并清空平移偏移', () => {
      const zoom = useDigitalZoom();
      zoom.setZoom(2.5);
      zoom.setOffset(50, -30);
      expect(zoom.scale.value).toBe(2.5);

      zoom.resetZoom();
      expect(zoom.scale.value).toBe(1.0);
      expect(zoom.offsetX.value).toBe(0);
      expect(zoom.offsetY.value).toBe(0);
    });

    it('transformStyle 应在 scale > 1.0 时激活硬件加速 willChange 与 grab 光标', () => {
      const zoom = useDigitalZoom();
      expect(zoom.transformStyle.value.willChange).toBe('auto');
      expect(zoom.transformStyle.value.cursor).toBe('default');

      zoom.setZoom(2.0);
      expect(zoom.transformStyle.value.willChange).toBe('transform');
      expect(zoom.transformStyle.value.cursor).toBe('grab');
      expect(zoom.transformStyle.value.transform).toContain('scale(2)');
    });

    it('handleWheel 滚轮应正确增减缩放倍率', () => {
      const zoom = useDigitalZoom({ step: 0.25 });
      const wheelUp = {
        preventDefault: vi.fn(),
        deltaY: -100,
        clientX: 200,
        clientY: 150,
      } as unknown as WheelEvent;

      zoom.handleWheel(wheelUp);
      expect(zoom.scale.value).toBe(1.25);

      const wheelDown = {
        preventDefault: vi.fn(),
        deltaY: 100,
        clientX: 200,
        clientY: 150,
      } as unknown as WheelEvent;

      zoom.handleWheel(wheelDown);
      expect(zoom.scale.value).toBe(1.0);
    });
  });

  describe('3. usePtzGesture 视频画面手势联动状态机', () => {
    it('鼠标位移未达门限不触发指令，超过门限派发对应方向并在松手时派发 stop', () => {
      const commands: PtzCommand[] = [];
      const gesture = usePtzGesture({
        threshold: 20,
        speed: 6,
        onCommand: cmd => commands.push(cmd),
      });

      // 1. 鼠标按下
      gesture.handleMouseDown({ clientX: 100, clientY: 100, button: 0 } as MouseEvent);
      expect(gesture.isInteracting.value).toBe(true);

      // 2. 微小移动 (5px < 20px)
      gesture.handleMouseMove({ clientX: 104, clientY: 100 } as MouseEvent);
      expect(commands.length).toBe(0);

      // 3. 超过门限 (向右移动 30px)
      gesture.handleMouseMove({ clientX: 130, clientY: 100 } as MouseEvent);
      expect(commands.length).toBe(1);
      expect(commands[0]?.action).toBe('right');
      expect(commands[0]?.speed).toBe(6);
      expect(gesture.activeAction.value).toBe('right');

      // 4. 鼠标松开 -> 必须派发 stop 指令
      gesture.handleMouseUp();
      expect(gesture.isInteracting.value).toBe(false);
      expect(gesture.activeAction.value).toBeNull();
      expect(commands.length).toBe(2);
      expect(commands[1]?.action).toBe('stop');
    });

    it('滚轮滚动手势应连续派发变焦动作与 stop 脉冲', () => {
      const commands: PtzCommand[] = [];
      const gesture = usePtzGesture({
        speed: 8,
        onCommand: cmd => commands.push(cmd),
      });

      const wheelEvent = {
        preventDefault: vi.fn(),
        deltaY: -100,
      } as unknown as WheelEvent;

      gesture.handleWheel(wheelEvent);
      expect(commands.length).toBe(2);
      expect(commands[0]?.action).toBe('zoom-in');
      expect(commands[0]?.speed).toBe(8);
      expect(commands[1]?.action).toBe('stop');
    });
  });

  describe('4. AtengPtzControl 云台控制盘组件交互与指令派发', () => {
    it('点击八方向罗盘按钮应派发对应 command，松手/移出派发 stop', async () => {
      const wrapper = mount(AtengPtzControl, {
        props: {
          speed: 7,
        },
      });
      wrappers.push(wrapper);

      // 向上按钮
      const upBtn = wrapper.find('.at-ptz-btn--u');
      expect(upBtn.exists()).toBe(true);

      // 按下向上
      await upBtn.trigger('mousedown');
      const emittedCmds = wrapper.emitted('command') as unknown[][];
      expect(emittedCmds).toBeTruthy();
      expect(emittedCmds.length).toBe(1);
      const firstCmd = emittedCmds[0]?.[0] as PtzCommand;
      expect(firstCmd.action).toBe('up');
      expect(firstCmd.speed).toBe(7);

      // 松开按钮
      await upBtn.trigger('mouseup');
      expect(emittedCmds.length).toBe(2);
      const stopCmd = emittedCmds[1]?.[0] as PtzCommand;
      expect(stopCmd.action).toBe('stop');

      // 中心停止按钮点击
      const centerBtn = wrapper.find('.at-ptz-btn--center');
      await centerBtn.trigger('click');
      expect(emittedCmds.length).toBe(3);
      expect((emittedCmds[2]?.[0] as PtzCommand).action).toBe('stop');
    });

    it('光学调节区 (Zoom/Focus/Iris) 应正常派发动作并在松手时 stop', async () => {
      const wrapper = mount(AtengPtzControl, {
        props: {
          speed: 4,
          showOptical: true,
        },
      });
      wrappers.push(wrapper);

      const opticalBtns = wrapper.findAll('.at-ptz-btn--opt');
      expect(opticalBtns.length).toBe(6);

      // 变焦放大 Zoom-in
      const zoomInBtn = opticalBtns[0];
      await zoomInBtn?.trigger('mousedown');
      const emitted = wrapper.emitted('command') as unknown[][];
      expect((emitted[0]?.[0] as PtzCommand).action).toBe('zoom-in');
      expect((emitted[0]?.[0] as PtzCommand).speed).toBe(4);

      await zoomInBtn?.trigger('mouseleave');
      expect((emitted[1]?.[0] as PtzCommand).action).toBe('stop');
    });

    it('调速滑块拖动应触发 speed-change 与 update:speed 事件', async () => {
      const wrapper = mount(AtengPtzControl, {
        props: {
          speed: 5,
        },
      });
      wrappers.push(wrapper);

      const slider = wrapper.find('.at-ptz-speed__slider');
      expect(slider.exists()).toBe(true);

      await slider.setValue(9);
      expect(wrapper.emitted('speed-change')?.[0]).toEqual([9]);
      expect(wrapper.emitted('update:speed')?.[0]).toEqual([9]);
    });

    it('预置位点击调用、新增与删除事件派发', async () => {
      const initialPresets: PtzPresetItem[] = [
        { index: 1, name: '东门全景' },
        { index: 2, name: '西门卡口' },
      ];

      const wrapper = mount(AtengPtzControl, {
        props: {
          presets: initialPresets,
          showPresets: true,
        },
      });
      wrappers.push(wrapper);

      // 1. 点击调用预置位 1
      const callBtns = wrapper.findAll('.at-ptz-preset-item__call');
      expect(callBtns.length).toBe(2);
      await callBtns[0]?.trigger('click');

      const commands = wrapper.emitted('command') as unknown[][];
      const gotoCmd = commands[0]?.[0] as PtzCommand;
      expect(gotoCmd.action).toBe('preset-goto');
      expect(gotoCmd.presetIndex).toBe(1);
      expect(gotoCmd.presetName).toBe('东门全景');

      // 2. 点击删除预置位 2
      const delBtns = wrapper.findAll('.at-ptz-preset-item__del');
      await delBtns[1]?.trigger('click');
      expect(wrapper.emitted('preset-delete')?.[0]).toEqual([2]);
      const delCmd = commands[1]?.[0] as PtzCommand;
      expect(delCmd.action).toBe('preset-delete');
      expect(delCmd.presetIndex).toBe(2);

      // 3. 新增预置位
      const nameInput = wrapper.find('.at-ptz-input--name');
      await nameInput.setValue('北区大厅');
      const addBtn = wrapper.find('.at-ptz-btn--add');
      await addBtn.trigger('click');

      expect(wrapper.emitted('preset-add')?.[0]).toEqual([{ index: 1, name: '北区大厅' }]);
    });

    it('当 disabled 为 true 时应阻止动作指令派发', async () => {
      const wrapper = mount(AtengPtzControl, {
        props: {
          disabled: true,
        },
      });
      wrappers.push(wrapper);

      const upBtn = wrapper.find('.at-ptz-btn--u');
      await upBtn.trigger('mousedown');
      expect(wrapper.emitted('command')).toBeUndefined();
    });
  });
});
