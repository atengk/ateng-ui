/**
 * 文件扩展名与 MIME 类型探测工具。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { PreviewFileType } from './types';

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'ogg', 'mov', 'm4v']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a']);
const CODE_EXTS = new Set(['json', 'sql', 'js', 'ts', 'jsx', 'tsx', 'html', 'xml', 'css', 'scss']);
const TEXT_EXTS = new Set(['txt', 'log', 'md', 'csv', 'yaml', 'yml', 'ini']);

/**
 * 从文件名或 URL 中安全提取扩展名（转小写）。
 */
export function extractExtension(pathOrUrl?: string): string {
  if (!pathOrUrl) return '';
  const beforeQuery = pathOrUrl.split('?')[0] ?? '';
  const cleanPath = beforeQuery.split('#')[0] ?? '';
  const lastDot = cleanPath.lastIndexOf('.');
  if (lastDot < 0) return '';
  return cleanPath.slice(lastDot + 1).toLowerCase();
}

/**
 * 智能探测文件预览分类。
 */
export function detectFileType(nameOrUrl?: string, mime?: string): PreviewFileType {
  if (mime) {
    const lowerMime = mime.toLowerCase();
    if (lowerMime.startsWith('image/')) return 'image';
    if (lowerMime === 'application/pdf') return 'pdf';
    if (lowerMime.startsWith('video/')) return 'video';
    if (lowerMime.startsWith('audio/')) return 'audio';
    if (
      lowerMime === 'application/json' ||
      lowerMime.includes('javascript') ||
      lowerMime.includes('xml')
    ) {
      return 'code';
    }
    if (lowerMime.startsWith('text/')) return 'text';
  }

  const ext = extractExtension(nameOrUrl);
  if (!ext) return 'unknown';

  if (IMAGE_EXTS.has(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (VIDEO_EXTS.has(ext)) return 'video';
  if (AUDIO_EXTS.has(ext)) return 'audio';
  if (CODE_EXTS.has(ext)) return 'code';
  if (TEXT_EXTS.has(ext)) return 'text';

  return 'unknown';
}
