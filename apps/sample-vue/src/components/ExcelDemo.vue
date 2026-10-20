<script setup lang="ts">
/**
 * sample-vue Fesod 流式 Excel 导出与批注回写自验卡片组件。
 *
 * 演示 useExcel 在正常流式下载、Blob-JSON 双态异常拦截（防伪损坏文件）、Fesod 错误标红批注回写下载以及在途中止 (abort) 场景。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref } from 'vue';
import { useExcel } from '@atengk/vue';
import { BusinessException } from '@atengk/core';

// 1. 界面状态与日志
const logs = ref<string[]>([]);
const customFilename = ref<string>('');
const lastDownloadedFilename = ref<string>('');
const lastErrorMessage = ref<string>('');

const addLog = (msg: string): void => {
  logs.value.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
  if (logs.value.length > 20) {
    logs.value.pop();
  }
};

// 2. 实例化 useExcel 状态机
const excel = useExcel({
  defaultFilename: '默认销售报表_2026.xlsx',
  onSuccess: (_blob, filename) => {
    lastDownloadedFilename.value = filename;
    lastErrorMessage.value = '';
    addLog(`[导出成功] 文件已交付下载: ${filename}`);
  },
  onError: err => {
    if (err instanceof BusinessException) {
      lastErrorMessage.value = `[${err.code}] ${err.msg} (traceId: ${err.traceId || '无'})`;
      addLog(`[双态拦截] 拦截到服务端结构化异常: ${lastErrorMessage.value}`);
    } else {
      lastErrorMessage.value = String(err);
      addLog(`[导出中断/失败] ${String(err)}`);
    }
  },
});

// 3. 模拟正向导出（包含 RFC 5987 Header 响应）
const handleNormalExport = async (): Promise<void> => {
  addLog('[启动导出] 正在请求服务端生成流式 Excel (模拟耗时 600ms)...');

  const mockService = async () => {
    await new Promise(resolve => setTimeout(resolve, 600));
    // 创建一个包含简单 CSV/文本的模拟 Excel 二进制 Blob
    const content = '工号,姓名,部门,薪资\n1001,张三,研发部,25000\n1002,李四,产品部,22000';
    const blob = new Blob([content], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    return {
      data: blob,
      headers: {
        'content-disposition':
          "attachment; filename*=UTF-8''%E5%91%98%E5%B7%A5%E5%90%8D%E5%8D%95_2026.xlsx",
      },
    };
  };

  try {
    await excel.exportExcel(mockService, customFilename.value || undefined);
  } catch {
    // 异常由 onError 回调接管
  }
};

// 4. 模拟服务端返回业务异常（Blob-JSON 双态拦截）
const handleBlobJsonErrorExport = async (): Promise<void> => {
  addLog('[双态测试] 模拟导出时后端由于数据量过大返回 JSON 格式业务异常...');

  const mockErrorService = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const errorJson = JSON.stringify({
      code: 40003,
      msg: '当前筛选条件导出数据量超出限制 (50000条)，请缩小时间范围',
      traceId: 'trace-fesod-sample-001',
    });
    // 服务端虽然声明为 blob 请求，但实际写入了 application/json 错误实体
    return new Blob([errorJson], { type: 'application/json' });
  };

  try {
    await excel.exportExcel(mockErrorService);
  } catch {
    // 预期捕获 BusinessException，不下载任何破坏伪文件
  }
};

// 5. 模拟 Fesod 错误批注回写文件下载 (downloadFeedback)
const handleFeedbackDownload = async (): Promise<void> => {
  addLog('[批注回写] 模拟用户导入出现 3 条错误行，后端返回标红批注反馈文件...');

  const mockFeedbackService = async () => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const content =
      '工号,姓名,校验批注\n1003,王五,[错误: 手机号格式不合规]\n1004,赵六,[错误: 身份证号校验位错误]';
    return new Blob([content], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  };

  try {
    await excel.downloadFeedback(mockFeedbackService, '用户导入_标红批注回写_2026.xlsx');
  } catch {
    // 异常由 onError 接管
  }
};

// 6. 模拟慢任务与手动取消 (abort)
const handleSlowExport = async (): Promise<void> => {
  addLog('[慢任务测试] 启动 5 秒慢导出任务，可随时点击 [中止导出 (abort)] 测试中断...');

  const slowService = async () => {
    await new Promise(resolve => setTimeout(resolve, 5000));
    return new Blob(['slow-excel-data']);
  };

  try {
    await excel.exportExcel(slowService);
  } catch {
    // 中断或异常处理
  }
};

const handleAbort = (): void => {
  excel.abort();
  addLog('[手动中断] 已触发 excel.abort() 中断在途任务');
};

const clearLogs = (): void => {
  logs.value = [];
  lastErrorMessage.value = '';
};
</script>

<template>
  <section class="card">
    <h2>8. Fesod 流式 Excel 导出与批注回写自验 (useExcel)</h2>
    <p class="desc">
      支持流式 Excel 导出、RFC 5987 / UTF-8 中文文件名双向解析、Blob-JSON
      双态异常精准识别（绝不下载损坏伪文件）、以及 Fesod
      批注回写与安全内存回收（URL.revokeObjectURL）。
    </p>

    <!-- 状态监控条 -->
    <div class="meta-bar">
      <div class="meta-item">
        导出状态机:
        <span :class="['status-tag', excel.exporting.value ? 'status-active' : 'status-idle']">
          {{ excel.exporting.value ? '导出处理中 (EXPORTING)' : '空闲中 (IDLE)' }}
        </span>
      </div>
      <div v-if="lastDownloadedFilename" class="meta-item">
        最近下载文件:
        <strong style="color: #059669">{{ lastDownloadedFilename }}</strong>
      </div>
      <div v-if="excel.error.value" class="meta-item">
        错误状态:
        <span class="status-tag status-error">异常拦截已激活</span>
      </div>
    </div>

    <!-- 错误横幅展示 -->
    <div v-if="lastErrorMessage" class="error-banner">
      <div class="error-title">⚠️ 捕获到服务端业务异常（已安全拦截，杜绝伪损坏文件下载）：</div>
      <div class="error-detail">{{ lastErrorMessage }}</div>
    </div>

    <div class="demo-grid">
      <!-- 1. 正常流式导出 -->
      <div class="section-box">
        <h3>1. 正常流式导出下载</h3>
        <p class="desc">
          模拟服务端响应 RFC 5987 <code>员工名单_2026.xlsx</code>，或指定自定义文件名：
        </p>
        <input
          v-model="customFilename"
          type="text"
          placeholder="自定义文件名（可选，留空则读取 Header）"
          class="input"
          :disabled="excel.exporting.value"
        />
        <div class="btn-group">
          <button class="btn" :disabled="excel.exporting.value" @click="handleNormalExport">
            {{ excel.exporting.value ? '导出处理中...' : '开始流式导出 Excel' }}
          </button>
        </div>
      </div>

      <!-- 2. Blob-JSON 双态拦截 -->
      <div class="section-box">
        <h3>2. Blob-JSON 双态异常防御</h3>
        <p class="desc">
          服务端报错时返回 JSON 载荷，前端自动嗅探解包为
          <code>BusinessException</code>，绝对禁止生成损坏伪文件：
        </p>
        <div class="btn-group">
          <button
            class="btn btn-danger"
            :disabled="excel.exporting.value"
            @click="handleBlobJsonErrorExport"
          >
            模拟后端报错 (超限50000条)
          </button>
        </div>
      </div>

      <!-- 3. Fesod 错误批注回写 -->
      <div class="section-box">
        <h3>3. Fesod 错误批注回写 (downloadFeedback)</h3>
        <p class="desc">
          数据导入校验失败后，快速下载服务端回传的标红批注 Excel 文件，指引用户精准纠错：
        </p>
        <div class="btn-group">
          <button
            class="btn btn-success"
            :disabled="excel.exporting.value"
            @click="handleFeedbackDownload"
          >
            下载标红批注反馈文件
          </button>
        </div>
      </div>

      <!-- 4. 任务中止与防重锁 -->
      <div class="section-box">
        <h3>4. 在途任务中断与取消 (abort)</h3>
        <p class="desc">模拟耗时 5 秒的长导出任务，可在任务进行中通过取消令牌即时中止：</p>
        <div class="btn-group">
          <button
            class="btn btn-warning"
            :disabled="excel.exporting.value"
            @click="handleSlowExport"
          >
            启动 5s 慢导出
          </button>
          <button
            class="btn btn-secondary btn-sm"
            :disabled="!excel.exporting.value"
            @click="handleAbort"
          >
            中止导出 (abort)
          </button>
        </div>
      </div>
    </div>

    <!-- 事件控制台 -->
    <div class="section-box">
      <div style="display: flex; justify-content: space-between; align-items: center">
        <h3>流式 Excel 事件控制台</h3>
        <button class="btn btn-secondary btn-sm" @click="clearLogs">清空日志</button>
      </div>
      <div class="log-console">
        <div v-for="(log, idx) in logs" :key="idx">{{ log }}</div>
        <div v-if="logs.length === 0" style="color: #64748b; font-style: italic">
          (暂无导出日志，点击上方演示按钮体验)
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped src="./excel-demo.css"></style>
