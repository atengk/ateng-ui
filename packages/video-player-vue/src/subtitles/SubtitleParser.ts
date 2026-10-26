/**
 * @atengk/video-player-vue 外挂字幕解析器核心。
 *
 * 纯原生 TypeScript 实现 WebVTT 与 SRT 格式字幕解析与毫秒级时间片元检索。
 * 恪守空安全保底律，零外部重量依赖。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import type { VideoSubtitleCue } from './types';

/**
 * 将时间戳字符串转换为秒数（浮点数）。
 *
 * 支持格式：
 * - 00:01:23,456 (SRT)
 * - 00:01:23.456 (WebVTT)
 * - 01:23.456 (WebVTT 短格式)
 */
export function parseTimestamp(timeStr: string): number {
  if (!timeStr) {
    return 0;
  }

  const cleanStr = timeStr.trim().replace(',', '.');
  const parts = cleanStr.split(':');

  if (parts.length === 3) {
    const hours = Number.parseFloat(parts[0] || '0');
    const minutes = Number.parseFloat(parts[1] || '0');
    const seconds = Number.parseFloat(parts[2] || '0');
    return hours * 3600 + minutes * 60 + seconds;
  }

  if (parts.length === 2) {
    const minutes = Number.parseFloat(parts[0] || '0');
    const seconds = Number.parseFloat(parts[1] || '0');
    return minutes * 60 + seconds;
  }

  const sec = Number.parseFloat(cleanStr);
  return Number.isNaN(sec) ? 0 : sec;
}

/**
 * 解析 SRT 格式字幕文本为 Cue 数组。
 *
 * @param content SRT 文本内容
 * @returns 规范化的字幕片元数组，无数据保底返回 []
 */
export function parseSrt(content: string): VideoSubtitleCue[] {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  const blocks = normalized.split(/\n\n+/);
  const cues: VideoSubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      continue;
    }

    // 寻找包含 --> 的时间行
    const timeIndex = lines.findIndex(l => l.includes('-->'));
    if (timeIndex === -1) {
      continue;
    }

    const timeLine = lines[timeIndex]!;
    const [startStr, endStr] = timeLine.split('-->').map(s => s.trim());

    if (!startStr || !endStr) {
      continue;
    }

    const startTime = parseTimestamp(startStr);
    const endTime = parseTimestamp(endStr);

    const textLines = lines.slice(timeIndex + 1);
    const text = textLines.join('\n');

    const id = timeIndex > 0 ? lines[0] : undefined;

    cues.push({
      id,
      startTime,
      endTime,
      text,
    });
  }

  return cues;
}

/**
 * 解析 WebVTT 格式字幕文本为 Cue 数组。
 *
 * @param content WebVTT 文本内容
 * @returns 规范化的字幕片元数组，无数据保底返回 []
 */
export function parseWebVtt(content: string): VideoSubtitleCue[] {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  const blocks = normalized.split(/\n\n+/);
  const cues: VideoSubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      continue;
    }

    // 忽略开头的 WEBVTT 头与注释块
    if (lines[0]?.startsWith('WEBVTT') || lines[0]?.startsWith('NOTE')) {
      continue;
    }

    // 寻找包含 --> 的时间行
    const timeIndex = lines.findIndex(l => l.includes('-->'));
    if (timeIndex === -1) {
      continue;
    }

    const timeLine = lines[timeIndex]!;
    const timeParts = timeLine.split('-->').map(s => s.trim());
    if (timeParts.length < 2) {
      continue;
    }

    const startStr = timeParts[0]!;
    // 结尾可能附带对齐参数等设置（例如 00:00:04.000 align:center）
    const endStr = timeParts[1]!.split(/\s+/)[0]!;

    const startTime = parseTimestamp(startStr);
    const endTime = parseTimestamp(endStr);

    const textLines = lines.slice(timeIndex + 1);
    const text = textLines.join('\n');

    const id = timeIndex > 0 ? lines[0] : undefined;

    cues.push({
      id,
      startTime,
      endTime,
      text,
    });
  }

  return cues;
}

/**
 * 自动识别类型并解析字幕文本。
 *
 * @param content 字幕文本内容
 * @param type 指定格式类型（可选）
 */
export function parseSubtitle(content: string, type?: 'vtt' | 'srt'): VideoSubtitleCue[] {
  if (!content) {
    return [];
  }

  if (type === 'vtt' || content.trim().startsWith('WEBVTT')) {
    return parseWebVtt(content);
  }

  if (type === 'srt') {
    return parseSrt(content);
  }

  // 默认尝试判断
  if (content.includes('WEBVTT')) {
    return parseWebVtt(content);
  }
  return parseSrt(content);
}

/**
 * 根据当前播放时间检索匹配的字幕片元。
 *
 * @param cues 字幕片元列表
 * @param currentTime 当前播放时间（秒）
 * @returns 命中的片元，若无匹配返回 null
 */
export function findCurrentCue(
  cues: VideoSubtitleCue[],
  currentTime: number,
): VideoSubtitleCue | null {
  if (!cues || cues.length === 0) {
    return null;
  }

  // 二分查找或快速匹配
  for (const cue of cues) {
    if (cue.startTime <= currentTime && currentTime <= cue.endTime) {
      return cue;
    }
  }

  return null;
}
