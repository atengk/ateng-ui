/**
 * usePtzGesture 视频画面手势联动状态机。
 *
 * 将用户在播放器画面上的鼠标拖拽与滚轮操作，实时转化为标准语义化 PTZ 动作指令，
 * 与具体的 GB28181/ONVIF 协议 100% 解耦。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { getCurrentScope, onScopeDispose, ref, toValue } from 'vue';
import type { PtzAction, PtzCommand, PtzGestureOptions, UsePtzGestureReturn } from '../types';

/**
 * 根据位移向量角度，计算八方向云台动作。
 *
 * @param dx X轴位移
 * @param dy Y轴位移
 * @returns 八方向动作
 */
export function calculatePtzDirection(dx: number, dy: number): PtzAction {
  // Math.atan2 返回弧度 [-π, π]，转换为角度 [-180, 180]
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  // 8 个 45° 扇区判定
  if (angle >= -22.5 && angle < 22.5) {
    return 'right';
  }
  if (angle >= 22.5 && angle < 67.5) {
    return 'down-right';
  }
  if (angle >= 67.5 && angle < 112.5) {
    return 'down';
  }
  if (angle >= 112.5 && angle < 157.5) {
    return 'down-left';
  }
  if ((angle >= 157.5 && angle <= 180) || (angle >= -180 && angle < -157.5)) {
    return 'left';
  }
  if (angle >= -157.5 && angle < -112.5) {
    return 'up-left';
  }
  if (angle >= -112.5 && angle < -67.5) {
    return 'up';
  }
  return 'up-right';
}

/**
 * 视频画面手势联动状态机。
 *
 * @param options 配置选项
 * @returns 手势状态与事件处理器
 */
export function usePtzGesture(options: PtzGestureOptions = {}): UsePtzGestureReturn {
  const threshold = options.threshold ?? 15;
  const isInteracting = ref<boolean>(false);
  const activeAction = ref<PtzAction | null>(null);

  let startX = 0;
  let startY = 0;
  let hasMoved = false;

  /**
   * 派发云台动作指令。
   */
  const emitCommand = (action: PtzAction): void => {
    if (options.onCommand) {
      const currentSpeed = toValue(options.speed) ?? 5;
      const cmd: PtzCommand = {
        action,
        speed: currentSpeed,
        timestamp: Date.now(),
      };
      options.onCommand(cmd);
    }
  };

  /**
   * 鼠标在画面按下。
   */
  const handleMouseDown = (event: MouseEvent): void => {
    // 仅响应鼠标左键
    if (event.button !== 0) {
      return;
    }

    isInteracting.value = true;
    startX = event.clientX;
    startY = event.clientY;
    hasMoved = false;

    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
  };

  /**
   * 鼠标在画面移动。
   */
  const handleMouseMove = (event: MouseEvent): void => {
    if (!isInteracting.value) {
      return;
    }

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const distance = Math.hypot(dx, dy);

    // 超过位移门限，推导云台转动方向
    if (distance >= threshold) {
      hasMoved = true;
      const nextAction = calculatePtzDirection(dx, dy);
      if (nextAction !== activeAction.value) {
        activeAction.value = nextAction;
        emitCommand(nextAction);
      }
    }
  };

  /**
   * 鼠标抬起结束手势。
   */
  const handleMouseUp = (_event?: MouseEvent): void => {
    if (!isInteracting.value) {
      return;
    }

    isInteracting.value = false;
    cleanupWindowListeners();

    // 若此前已触发云台移动，必须派发 stop 指令确保设备停止
    if (hasMoved && activeAction.value !== null) {
      activeAction.value = null;
      emitCommand('stop');
    }
  };

  const handleGlobalMouseUp = (event: MouseEvent): void => {
    handleMouseUp(event);
  };

  /**
   * 解绑全局事件。
   */
  const cleanupWindowListeners = (): void => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  };

  /**
   * 鼠标滚轮缩放触发变焦。
   */
  const handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const action: PtzAction = event.deltaY < 0 ? 'zoom-in' : 'zoom-out';
    emitCommand(action);

    // 滚轮步进后立即触发停止，符合点动变焦规范
    emitCommand('stop');
  };

  if (getCurrentScope()) {
    onScopeDispose(() => {
      cleanupWindowListeners();
    });
  }

  return {
    isInteracting,
    activeAction,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
  };
}
