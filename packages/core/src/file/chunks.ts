/**
 * 大文件纯原生切片纯函数与切片切分能力实现。
 *
 * 坚持纯原生 Blob.prototype.slice 实现，零第三方库依赖，
 * 精确计算各切片字节区间与序号元数据。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { FileChunk } from './types';

/**
 * 默认单个切片字节大小：5MB (5 * 1024 * 1024 字节)。
 */
export const DEFAULT_CHUNK_SIZE: number = 5 * 1024 * 1024;

/**
 * 将指定的文件或二进制 Blob 按固定字节大小安全切分成若干分片。
 *
 * @param file 待切分的文件或 Blob
 * @param chunkSize 单个切片字节大小（默认 5MB，若传非正数则回退为默认值）
 * @returns 切片元数据数组（若文件大小为 0 则保底返回空数组）
 */
export function createFileChunks(
  file: File | Blob,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
): FileChunk[] {
  if (!file || typeof file !== 'object' || typeof file.size !== 'number') {
    return [];
  }

  const totalSize = file.size;
  if (totalSize <= 0) {
    return [];
  }

  const validChunkSize = chunkSize > 0 ? chunkSize : DEFAULT_CHUNK_SIZE;
  const totalChunks = Math.ceil(totalSize / validChunkSize);
  const chunks: FileChunk[] = [];

  let cur = 0;
  let index = 0;

  while (cur < totalSize) {
    const end = Math.min(cur + validChunkSize, totalSize);
    const chunkBlob = file.slice(cur, end);

    chunks.push({
      chunk: chunkBlob,
      index,
      start: cur,
      end,
      size: chunkBlob.size,
      totalChunks,
    });

    cur = end;
    index++;
  }

  return chunks;
}
