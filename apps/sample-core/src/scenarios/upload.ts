/**
 * Blob 双态异常识别安全下载与大文件分片受控并发上传场景看板。
 *
 * @author Ateng
 * @since 2026-11-04
 */

import { http, BusinessException, createFileChunks, createUploadCoordinator } from '@atengk/core';

/**
 * 渲染文件下载与分片上传看板 HTML 模板。
 */
export function renderUploadCard(): string {
  return `
    <!-- 卡片 6: Blob 双态异常与安全下载 -->
    <div class="dashboard-card" id="card-upload-blob">
      <div class="card-title">
        <span>6. Blob 双态异常与安全下载</span>
        <span style="font-size: 12px; color: #ec4899;">RFC 5987 / 异常嗅探</span>
      </div>
      <p class="card-desc">正常文件提取中文名下载并确定性释放内存；业务异常 JSON 自动阻断并抛出 BusinessException。</p>
      <div class="actions-row">
        <button class="btn btn-success" id="btn-download-normal">下载正常清单 (CSV)</button>
        <button class="btn btn-danger" id="btn-download-error">下载异常文件 (JSON拦截)</button>
      </div>
      <div class="log-box" id="log-download">// 下载状态与异常拦截日志...</div>
    </div>

    <!-- 卡片 13: 大文件分片切片与受控并发上传协调器 -->
    <div class="dashboard-card full-width" id="card-upload-chunks">
      <div class="card-title">
        <span>13. 大文件分片切片与受控并发上传 (UploadCoordinator)</span>
        <span style="font-size: 12px; color: #16a34a;">并发数受控限制 (concurrency: 2)</span>
      </div>
      <p class="card-desc">将大文件按安全字节区间切分，受控限制最大并发上传连接数，提供单调递增加权进度统计、单片局部重试与外部中断。</p>
      <div class="progress-container">
        <div class="progress-bar" id="upload-progress-bar"></div>
      </div>
      <div style="font-size: 12px; color: #64748b; margin-top: -6px;">
        当前上传进度: <strong id="upload-percent-text">0%</strong> | 已上传: <span id="upload-loaded-text">0 B / 0 B</span>
      </div>
      <div class="actions-row">
        <button class="btn btn-success" id="btn-upload-start">切片 15MB 虚拟文件并并发上传</button>
        <button class="btn btn-danger" id="btn-upload-cancel">中途取消上传</button>
      </div>
      <div class="log-box" id="log-upload">// 分片切片与并发上传调度日志...</div>
    </div>
  `;
}

/**
 * 初始化文件下载与分片上传场景交互事件。
 */
export function initUploadScenario(): void {
  // 1. Blob 双态异常与安全下载
  const logDownload = document.getElementById('log-download');
  document.getElementById('btn-download-normal')?.addEventListener('click', async () => {
    if (logDownload) logDownload.textContent = '请求下载正常清单...';
    try {
      const ok = await http.download('/api/download/normal');
      if (logDownload) {
        logDownload.textContent = `[下载触发] 状态: ${ok ? '已成功通过浏览器触发下载' : '在非浏览器环境安全降级'}\n已解析 RFC 5987 文件名: 用户清单_2026.csv\n临时 ObjectURL 已安排确定性释放`;
      }
    } catch (err) {
      if (logDownload) logDownload.textContent = `[下载失败] ${String(err)}`;
    }
  });

  document.getElementById('btn-download-error')?.addEventListener('click', async () => {
    if (logDownload) logDownload.textContent = '请求下载异常文件 (模拟服务端故障)...';
    try {
      await http.download('/api/download/error');
      if (logDownload) logDownload.textContent = '[异常] 预期被阻断但未被捕获！';
    } catch (err) {
      if (err instanceof BusinessException) {
        if (logDownload) {
          logDownload.textContent = `[已安全拦截损坏伪文件]\n成功捕获 BusinessException:\n- 错误码: ${err.code}\n- 错误消息: ${err.msg}\n- 链路追踪: ${err.traceId}\n彻底避免了损坏伪文件的下载落地！`;
        }
      } else {
        if (logDownload) logDownload.textContent = `[错误] ${String(err)}`;
      }
    }
  });

  // 2. 大文件分片并发上传
  const logUpload = document.getElementById('log-upload');
  const progressBar = document.getElementById('upload-progress-bar');
  const percentText = document.getElementById('upload-percent-text');
  const loadedText = document.getElementById('upload-loaded-text');
  let uploadController: AbortController | null = null;

  document.getElementById('btn-upload-start')?.addEventListener('click', async () => {
    if (uploadController) {
      uploadController.abort();
    }
    uploadController = new AbortController();

    // 创建 15MB 虚拟大文件
    const totalBytes = 15 * 1024 * 1024;
    const chunkSize = 3 * 1024 * 1024; // 3MB / 片，共 5 片
    const dummyBlob = new Blob([new Uint8Array(totalBytes)]);

    if (logUpload) {
      logUpload.textContent = `[开始切片] 文件总大小: 15 MB，按 3 MB/片切分...\n`;
    }

    const chunks = createFileChunks(dummyBlob, chunkSize);
    if (logUpload) {
      logUpload.textContent += `成功切分为 ${chunks.length} 个分片，受控并发数: 2\n`;
    }

    const coordinator = createUploadCoordinator({
      concurrency: 2,
      maxRetries: 2,
      retryDelay: 300,
      onProgress: (percent, loaded, total) => {
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (percentText) percentText.textContent = `${percent}%`;
        if (loadedText) {
          loadedText.textContent = `${(loaded / (1024 * 1024)).toFixed(1)} MB / ${(total / (1024 * 1024)).toFixed(1)} MB`;
        }
      },
      onChunkSuccess: chunk => {
        if (logUpload) {
          logUpload.textContent += `[切片 #${chunk.index} 完成] 起始偏移: ${chunk.start} B, 大小: ${(chunk.size / 1024 / 1024).toFixed(1)} MB\n`;
          logUpload.scrollTop = logUpload.scrollHeight;
        }
      },
      uploadChunk: async (chunk, signal) => {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 250);
          signal?.addEventListener(
            'abort',
            () => {
              clearTimeout(timer);
              reject(new Error('Chunk upload aborted'));
            },
            { once: true },
          );
        });
        return { chunkIndex: chunk.index, status: 'uploaded' };
      },
    });

    try {
      const results = await coordinator.upload(chunks, uploadController.signal);
      if (logUpload) {
        logUpload.textContent += `\n[全部上传完成] 共计 ${results.length} 个分片 100% 成功交付！`;
      }
    } catch (err) {
      if (logUpload) {
        logUpload.textContent += `\n[上传中止/异常] ${String(err)}`;
      }
    }
  });

  document.getElementById('btn-upload-cancel')?.addEventListener('click', () => {
    if (uploadController) {
      uploadController.abort();
      uploadController = null;
      if (logUpload) {
        logUpload.textContent += `\n[用户操作] 已通过 AbortSignal 级联取消所有在途与等待中的分片上传！`;
      }
    }
  });
}
