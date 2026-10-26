/**
 * 结构化异常诊断与分类识别引擎。
 *
 * 针对现代 Web 文档预览场景，自动识别并结构化归类以下 5 大核心异常：
 * 1. ENCRYPTED: 受密码保护的加密文档 (PDF/Office 等)；
 * 2. LEGACY_BINARY: 早期二进制格式 (Office 97-2003 .doc/.xls/.ppt)；
 * 3. NETWORK_CORS: 网络连接失败、跨域 CORS 拦截或超时；
 * 4. CORRUPTED: 文件流损坏、未闭合或结构解析失败；
 * 5. BUSINESS_ERROR: 业务系统异常 (鉴权 401/403，携带全链路 traceId)。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { BusinessException } from '@atengk/core';

export type FileViewerErrorCategory =
  'ENCRYPTED' | 'LEGACY_BINARY' | 'NETWORK_CORS' | 'CORRUPTED' | 'BUSINESS_ERROR';

export interface FileViewerDiagnostic {
  /**
   * 结构化错误分类。
   */
  category: FileViewerErrorCategory;

  /**
   * 错误主标题 (如 "文档受密码保护", "早期二进制版本提示")。
   */
  title: string;

  /**
   * 错误核心描述信息。
   */
  message: string;

  /**
   * 详细技术信息 (原始报错、错误代码等)。
   */
  detail?: string;

  /**
   * 针对性排查与解决建议。
   */
  suggestion: string;

  /**
   * 全链路追踪 traceId (若为业务系统异常时携带)。
   */
  traceId?: string;

  /**
   * 原始异常对象。
   */
  rawError?: unknown;

  /**
   * 是否允许重试加载。
   */
  canRetry: boolean;

  /**
   * 是否需要/允许输入密码原地解密。
   */
  needsPassword: boolean;
}

export interface DiagnoseContext {
  fileName?: string;
  fileType?: string;
  url?: string;
}

/**
 * 判断文件扩展名是否为早期 Office 97-2003 OLE2 二进制格式。
 */
function isLegacyBinaryExtension(ext?: string): boolean {
  if (!ext) return false;
  const clean = ext.toLowerCase().replace(/^\./, '');
  return ['doc', 'xls', 'ppt', 'vsd', 'wps', 'et', 'dps'].includes(clean);
}

/**
 * 从入参中提取扩展名。
 */
function extractExtension(context?: DiagnoseContext): string {
  if (context?.fileType) {
    return context.fileType.toLowerCase().replace(/^\./, '');
  }
  if (context?.fileName) {
    const dotIdx = context.fileName.lastIndexOf('.');
    if (dotIdx >= 0) {
      return context.fileName.slice(dotIdx + 1).toLowerCase();
    }
  }
  if (context?.url) {
    const cleanUrl = context.url.split('?')[0]?.split('#')[0] || '';
    const dotIdx = cleanUrl.lastIndexOf('.');
    if (dotIdx >= 0) {
      return cleanUrl.slice(dotIdx + 1).toLowerCase();
    }
  }
  return '';
}

/**
 * 核心智能诊断函数：分析原始异常与上下文，输出完备的结构化诊断实体。
 *
 * @param error 捕获到的原始异常对象
 * @param context 当前文档上下文 (文件名、扩展名、URL 等)
 * @returns 规范化的结构化诊断实体
 */
export function diagnoseFileViewerError(
  error: unknown,
  context: DiagnoseContext = {},
): FileViewerDiagnostic {
  const ext = extractExtension(context);

  // 1. 业务系统异常 (BusinessException 优先识别)
  if (error instanceof BusinessException) {
    return {
      category: 'BUSINESS_ERROR',
      title: '业务接口异常',
      message: error.msg || error.message || '业务系统返回未决错误',
      detail: `业务状态码: ${error.code}`,
      suggestion: '请确认是否已获取该机密文档的访问权限，或联系系统管理员。',
      traceId: error.traceId,
      rawError: error,
      canRetry: true,
      needsPassword: false,
    };
  }

  // 提取原始异常错误信息
  let rawMsg = '';
  let errorName = '';
  if (error instanceof Error) {
    rawMsg = error.message || '';
    errorName = error.name || '';
  } else if (typeof error === 'string') {
    rawMsg = error;
  } else if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    rawMsg = String(obj.message || obj.msg || obj.reason || '');
    errorName = String(obj.name || '');
  }

  const lowerMsg = rawMsg.toLowerCase();
  const lowerName = errorName.toLowerCase();

  // 2. 加密保护文档 (ENCRYPTED 识别)
  const isEncrypted =
    lowerName.includes('password') ||
    lowerMsg.includes('password') ||
    lowerMsg.includes('encrypt') ||
    lowerMsg.includes('decrypt') ||
    lowerMsg.includes('bad password') ||
    lowerMsg.includes('need-password') ||
    lowerMsg.includes('code 1'); // PDF.js PasswordResponses.NEED_PASSWORD === 1

  if (isEncrypted) {
    return {
      category: 'ENCRYPTED',
      title: '文档受密码保护',
      message: '该文档已设置安全访问密码，需要输入正确密码后方可解密阅读。',
      detail: rawMsg || undefined,
      suggestion: '请输入密码并点击“解密并阅读”；若未知密码，请向文档提供方获取。',
      rawError: error,
      canRetry: true,
      needsPassword: true,
    };
  }

  // 3. 早期二进制格式 (LEGACY_BINARY 识别)
  if (isLegacyBinaryExtension(ext)) {
    return {
      category: 'LEGACY_BINARY',
      title: '早期二进制格式提示',
      message: `该文件为 Office 97-2003 早期二进制格式 (.${ext})，浏览器现代原生引擎仅支持 OpenXML 格式。`,
      detail: rawMsg || 'Unsupported legacy binary format in pure web environment',
      suggestion: `建议在本地通过桌面 Office 将其另存为现代格式 (.${ext === 'doc' ? 'docx' : ext === 'xls' ? 'xlsx' : 'pptx'}) 后上传，或直接下载原文件查看。`,
      rawError: error,
      canRetry: false,
      needsPassword: false,
    };
  }

  // 4. 网络与跨域拦截 (NETWORK_CORS 识别)
  const isNetworkCors =
    lowerMsg.includes('network error') ||
    lowerMsg.includes('cors') ||
    lowerMsg.includes('failed to fetch') ||
    lowerMsg.includes('timeout') ||
    lowerMsg.includes('econnrefused') ||
    lowerMsg.includes('econnreset') ||
    lowerMsg.includes('404') ||
    lowerMsg.includes('502') ||
    lowerMsg.includes('503') ||
    lowerMsg.includes('504');

  if (isNetworkCors) {
    return {
      category: 'NETWORK_CORS',
      title: '网络加载受阻',
      message: '无法成功从远程服务器拉取文档二进制流，可能由于跨域安全策略 (CORS) 或网络中断导致。',
      detail: rawMsg || undefined,
      suggestion:
        '请检查网络连通性、确认资源地址有效，或在服务端响应头中补充 Access-Control-Allow-Origin 跨域 (CORS) 配置。',
      rawError: error,
      canRetry: true,
      needsPassword: false,
    };
  }

  // 5. 损坏与未知解析错误保底 (CORRUPTED)
  return {
    category: 'CORRUPTED',
    title: '文档损坏或解析失败',
    message: '文档内部数据结构损坏或包含非标准字节流，原生引擎无法完成渲染。',
    detail: rawMsg || 'Document parsing or rendering failed',
    suggestion: '请尝试刷新重试，或直接点击下方按钮下载原始文件使用本地专业软件打开。',
    rawError: error,
    canRetry: true,
    needsPassword: false,
  };
}
