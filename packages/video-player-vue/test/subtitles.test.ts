/**
 * @atengk/video-player-vue 多轨外挂字幕测试套件：
 * 1. WebVTT 语法解析器能力测试 (parseWebVtt)
 * 2. SRT 语法解析器能力测试 (parseSrt)
 * 3. 容错解析与二分时间查找 (findCurrentCue)
 * 4. useVideoSubtitles 状态机多轨切换与加载
 *
 * 恪守全自洽单测 3 项铁律：DOM 严格还原、响应式与存储零污染、100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { describe, expect, it } from 'vitest';
import {
  findCurrentCue,
  parseSrt,
  parseSubtitle,
  parseWebVtt,
} from '../src/subtitles/SubtitleParser';
import { useVideoSubtitles } from '../src/subtitles/useVideoSubtitles';
import type { VideoSubtitleItem } from '../src/types';

describe('工单 #148 多轨外挂字幕测试套件', () => {
  const sampleVtt = `WEBVTT - 示例测试字幕

1
00:00:01.000 --> 00:00:04.500
欢迎来到 Ateng UI 视频播放器展厅！

2
00:00:05.000 --> 00:00:08.200
这是第二句字幕内容。
包含多行文本。

3
01:10.500 --> 01:15.000
短格式时间戳测试
`;

  const sampleSrt = `1
00:00:01,000 --> 00:00:04,500
Welcome to Ateng UI Video Player!

2
00:00:05,000 --> 00:00:08,200
This is the second line of subtitles.
With multiple lines.

3
00:01:10,500 --> 00:01:15,000
Third subtitle block.
`;

  describe('1. WebVTT 解析能力', () => {
    it('1.1 应正确解析标准 WebVTT 时间戳与文本', () => {
      const cues = parseWebVtt(sampleVtt);
      expect(cues).toHaveLength(3);

      expect(cues[0]?.startTime).toBeCloseTo(1.0);
      expect(cues[0]?.endTime).toBeCloseTo(4.5);
      expect(cues[0]?.text).toBe('欢迎来到 Ateng UI 视频播放器展厅！');

      expect(cues[1]?.startTime).toBeCloseTo(5.0);
      expect(cues[1]?.endTime).toBeCloseTo(8.2);
      expect(cues[1]?.text).toBe('这是第二句字幕内容。\n包含多行文本。');

      // 短格式时间 mm:ss.sss
      expect(cues[2]?.startTime).toBeCloseTo(70.5);
      expect(cues[2]?.endTime).toBeCloseTo(75.0);
      expect(cues[2]?.text).toBe('短格式时间戳测试');
    });

    it('1.2 空内容或非法文本应保底返回空数组', () => {
      expect(parseWebVtt('')).toEqual([]);
      expect(parseWebVtt('   \n  ')).toEqual([]);
    });
  });

  describe('2. SRT 解析能力', () => {
    it('2.1 应正确解析 SRT 格式的逗号毫秒时间戳与换行文本', () => {
      const cues = parseSrt(sampleSrt);
      expect(cues).toHaveLength(3);

      expect(cues[0]?.startTime).toBeCloseTo(1.0);
      expect(cues[0]?.endTime).toBeCloseTo(4.5);
      expect(cues[0]?.text).toBe('Welcome to Ateng UI Video Player!');

      expect(cues[1]?.startTime).toBeCloseTo(5.0);
      expect(cues[1]?.endTime).toBeCloseTo(8.2);
      expect(cues[1]?.text).toBe('This is the second line of subtitles.\nWith multiple lines.');
    });

    it('2.2 自动类型识别 parseSubtitle', () => {
      const vttCues = parseSubtitle(sampleVtt);
      expect(vttCues).toHaveLength(3);

      const srtCues = parseSubtitle(sampleSrt);
      expect(srtCues).toHaveLength(3);
    });
  });

  describe('3. 实时时间点检索 (findCurrentCue)', () => {
    const cues = parseWebVtt(sampleVtt);

    it('3.1 在时间范围内的时刻应返回匹配的 cue', () => {
      const cue = findCurrentCue(cues, 2.5);
      expect(cue).not.toBeNull();
      expect(cue?.text).toBe('欢迎来到 Ateng UI 视频播放器展厅！');
    });

    it('3.2 在两个字幕间隙的时间应返回 null', () => {
      const cue = findCurrentCue(cues, 4.8);
      expect(cue).toBeNull();
    });

    it('3.3 边界时刻（刚好等于开始或结束）应正常判定', () => {
      const cueStart = findCurrentCue(cues, 1.0);
      expect(cueStart?.text).toBe('欢迎来到 Ateng UI 视频播放器展厅！');

      const cueEnd = findCurrentCue(cues, 4.5);
      expect(cueEnd?.text).toBe('欢迎来到 Ateng UI 视频播放器展厅！');
    });

    it('3.4 大规模字幕集合应正确通过二分查找命中目标', () => {
      // 构造 1000 条标准字幕序列
      const largeCues = Array.from({ length: 1000 }, (_, i) => ({
        id: `cue_${i}`,
        startTime: i * 2,
        endTime: i * 2 + 1.5,
        text: `字幕第 ${i} 行`,
      }));

      // 命中首项
      expect(findCurrentCue(largeCues, 0.5)?.text).toBe('字幕第 0 行');
      // 命中中间项
      expect(findCurrentCue(largeCues, 1000.5)?.text).toBe('字幕第 500 行');
      // 命中末尾项
      expect(findCurrentCue(largeCues, 1999.0)?.text).toBe('字幕第 999 行');
      // 间隙未命中
      expect(findCurrentCue(largeCues, 1001.8)).toBeNull();
      // 超出两端未命中
      expect(findCurrentCue(largeCues, -1)).toBeNull();
      expect(findCurrentCue(largeCues, 2500)).toBeNull();
    });

    it('3.5 空值与非法时间防御性返回 null', () => {
      expect(findCurrentCue([], 10)).toBeNull();
      expect(findCurrentCue(cues, Number.NaN)).toBeNull();
    });
  });

  describe('4. useVideoSubtitles 状态机多轨管理', () => {
    const subtitles: VideoSubtitleItem[] = [
      {
        id: 'zh',
        label: '简体中文',
        lang: 'zh-CN',
        content: sampleVtt,
        default: true,
      },
      {
        id: 'en',
        label: 'English',
        lang: 'en-US',
        content: sampleSrt,
      },
    ];

    it('4.1 初始应默认选中 default 标识的字幕并自动解析', async () => {
      const state = useVideoSubtitles(() => subtitles);
      await state.init();

      expect(state.activeSubtitleId.value).toBe('zh');
      expect(state.activeSubtitle.value?.label).toBe('简体中文');
      expect(state.cues.value).toHaveLength(3);

      // 更新时间
      state.updateCurrentTime(2.0);
      expect(state.currentText.value).toBe('欢迎来到 Ateng UI 视频播放器展厅！');
    });

    it('4.2 切换字幕语言应实时更新 activeSubtitle 与 cues', async () => {
      const state = useVideoSubtitles(() => subtitles);
      await state.init();

      await state.switchSubtitle('en');
      expect(state.activeSubtitleId.value).toBe('en');
      expect(state.activeSubtitle.value?.label).toBe('English');

      state.updateCurrentTime(2.0);
      expect(state.currentText.value).toBe('Welcome to Ateng UI Video Player!');
    });

    it('4.3 切换为 null 应关闭字幕', async () => {
      const state = useVideoSubtitles(() => subtitles);
      await state.init();

      await state.switchSubtitle(null);
      expect(state.activeSubtitleId.value).toBeNull();
      expect(state.cues.value).toEqual([]);
      expect(state.currentText.value).toBe('');
    });
  });
});
