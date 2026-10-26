/**
 * 四维 DLP (防下载、防打印、防复制、防右键) 数据防泄密控制单元测试。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupDlpProtection } from '../src/utils/dlp';
import type { DlpOptions } from '../src/utils/dlp';

describe('DLP 四维数据防泄密控制模块', () => {
  let container: HTMLDivElement;
  let childTarget: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    childTarget = document.createElement('div');
    container.appendChild(childTarget);
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = '';
  });

  describe('downloadable 控制', () => {
    it('当 downloadable 为 false 时，拦截 Ctrl+S 与 Cmd+S 保存快捷键', () => {
      const currentOptions: DlpOptions = { downloadable: false };
      const dlp = setupDlpProtection(container, () => currentOptions);

      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      const preventSpy = vi.spyOn(event, 'preventDefault');
      const stopSpy = vi.spyOn(event, 'stopPropagation');

      // 在内部子节点触发事件
      childTarget.dispatchEvent(event);

      expect(preventSpy).toHaveBeenCalled();
      expect(stopSpy).toHaveBeenCalled();

      dlp.destroy();
    });

    it('当 downloadable 为 true 时，不拦截 Ctrl+S', () => {
      const currentOptions: DlpOptions = { downloadable: true };
      const dlp = setupDlpProtection(container, () => currentOptions);

      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      const preventSpy = vi.spyOn(event, 'preventDefault');

      childTarget.dispatchEvent(event);

      expect(preventSpy).not.toHaveBeenCalled();

      dlp.destroy();
    });
  });

  describe('printable 控制', () => {
    it('当 printable 为 false 时，拦截 Ctrl+P / Cmd+P 打印快捷键并添加防打印样式类', () => {
      const currentOptions: DlpOptions = { printable: false };
      const dlp = setupDlpProtection(container, () => currentOptions);

      expect(container.classList.contains('at-file-viewer--no-print')).toBe(true);

      const event = new KeyboardEvent('keydown', {
        key: 'p',
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });
      const preventSpy = vi.spyOn(event, 'preventDefault');

      childTarget.dispatchEvent(event);

      expect(preventSpy).toHaveBeenCalled();

      dlp.destroy();
      expect(container.classList.contains('at-file-viewer--no-print')).toBe(false);
    });
  });

  describe('copyable 控制', () => {
    it('当 copyable 为 false 时，拦截 copy、cut 与 selectstart 事件并添加防复制样式类', () => {
      const currentOptions: DlpOptions = { copyable: false };
      const dlp = setupDlpProtection(container, () => currentOptions);

      expect(container.classList.contains('at-file-viewer--no-copy')).toBe(true);

      const copyEvent = new Event('copy', { bubbles: true, cancelable: true });
      const preventCopySpy = vi.spyOn(copyEvent, 'preventDefault');
      childTarget.dispatchEvent(copyEvent);
      expect(preventCopySpy).toHaveBeenCalled();

      const cutEvent = new Event('cut', { bubbles: true, cancelable: true });
      const preventCutSpy = vi.spyOn(cutEvent, 'preventDefault');
      childTarget.dispatchEvent(cutEvent);
      expect(preventCutSpy).toHaveBeenCalled();

      const selectEvent = new Event('selectstart', { bubbles: true, cancelable: true });
      const preventSelectSpy = vi.spyOn(selectEvent, 'preventDefault');
      childTarget.dispatchEvent(selectEvent);
      expect(preventSelectSpy).toHaveBeenCalled();

      dlp.destroy();
      expect(container.classList.contains('at-file-viewer--no-copy')).toBe(false);
    });
  });

  describe('contextMenu 控制', () => {
    it('当 contextMenu 为 false 时，拦截鼠标右键 contextmenu 事件', () => {
      const currentOptions: DlpOptions = { contextMenu: false };
      const dlp = setupDlpProtection(container, () => currentOptions);

      const menuEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      const preventMenuSpy = vi.spyOn(menuEvent, 'preventDefault');

      childTarget.dispatchEvent(menuEvent);
      expect(preventMenuSpy).toHaveBeenCalled();

      dlp.destroy();
    });

    it('当 contextMenu 为 true 时，放行鼠标右键', () => {
      const currentOptions: DlpOptions = { contextMenu: true };
      const dlp = setupDlpProtection(container, () => currentOptions);

      const menuEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      const preventMenuSpy = vi.spyOn(menuEvent, 'preventDefault');

      childTarget.dispatchEvent(menuEvent);
      expect(preventMenuSpy).not.toHaveBeenCalled();

      dlp.destroy();
    });
  });

  describe('动态更新与销毁清理', () => {
    it('调用 update() 动态切换权限状态', () => {
      let currentOptions: DlpOptions = { copyable: true };
      const dlp = setupDlpProtection(container, () => currentOptions);

      expect(container.classList.contains('at-file-viewer--no-copy')).toBe(false);

      currentOptions = { copyable: false };
      dlp.update();
      expect(container.classList.contains('at-file-viewer--no-copy')).toBe(true);

      dlp.destroy();
    });

    it('destroy() 彻底清理所有监听器，后续事件不再被拦截', () => {
      const currentOptions: DlpOptions = { downloadable: false, copyable: false };
      const dlp = setupDlpProtection(container, () => currentOptions);

      dlp.destroy();

      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      const preventSpy = vi.spyOn(event, 'preventDefault');

      childTarget.dispatchEvent(event);
      expect(preventSpy).not.toHaveBeenCalled();
    });
  });
});
