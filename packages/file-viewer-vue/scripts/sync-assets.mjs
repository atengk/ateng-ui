#!/usr/bin/env node
/**
 * 离线内网静态资产一键本地同步工具。
 *
 * 智能从 @file-viewer 生态依赖（DOCX、PPTX、Sheet、PDF 等）中提取真实生产级 Worker 与 WASM 二进制内核，
 * 同步拷贝至宿主工程的 public/file-viewer/ 目录，彻底杜绝 Worker 启动超时与 404 MIME 类型错误。
 *
 * 用法：
 *   node scripts/sync-assets.mjs [targetDir]
 *   例如：node scripts/sync-assets.mjs ../../apps/sample-file-viewer-vue/public/file-viewer
 *
 * @author Ateng
 * @since 2026-10-26
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 默认目标目录（支持从根目录或子包目录调用自动对齐）
let targetDir;
if (process.argv[2]) {
  const argPath = process.argv[2];
  if (path.isAbsolute(argPath)) {
    targetDir = argPath;
  } else {
    const cwdPath = path.resolve(process.cwd(), argPath);
    const repoRootCandidate = path.resolve(__dirname, '../../../', argPath);
    if (!fs.existsSync(cwdPath) && fs.existsSync(path.dirname(repoRootCandidate))) {
      targetDir = repoRootCandidate;
    } else {
      targetDir = cwdPath;
    }
  }
} else {
  targetDir = path.resolve(process.cwd(), 'public/file-viewer');
}

console.log('📦 [@atengk/file-viewer-vue] 开始同步离线内网静态资产...');
console.log(`📁 目标目录: ${targetDir}`);

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

/**
 * 递归搜索目录寻找匹配的文件或目录。
 */
function findInDir(rootDir, predicate) {
  try {
    if (!fs.existsSync(rootDir)) return null;
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(rootDir, entry.name);
      if (predicate(entry, fullPath)) {
        return fullPath;
      }
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'src') {
        const nested = findInDir(fullPath, predicate);
        if (nested) return nested;
      }
    }
  } catch {
    // 忽略权限或读取错误
  }
  return null;
}

/**
 * 拷贝目录（递归）
 */
function copyDirRecursive(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 寻找根 node_modules 目录
const candidates = [
  path.resolve(__dirname, '../../../node_modules'),
  path.resolve(__dirname, '../node_modules'),
  path.resolve(process.cwd(), 'node_modules'),
  path.resolve(process.cwd(), '../../node_modules'),
];

let rootNodeModules = candidates.find(dir => fs.existsSync(dir));
if (!rootNodeModules) {
  console.warn('⚠️ 未探测到根 node_modules 目录，回退到当前目录查找');
  rootNodeModules = path.resolve(process.cwd(), 'node_modules');
}

const pnpmDir = path.join(rootNodeModules, '.pnpm');
const searchBase = fs.existsSync(pnpmDir) ? pnpmDir : rootNodeModules;

/**
 * 核心资产定位清单
 */
const assetCopyJobs = [
  // 1. Word (DOCX)
  {
    targetName: 'docx.worker.js',
    desc: 'Word DOCX 流式渲染 Worker',
    finder: () =>
      findInDir(
        searchBase,
        (entry, p) =>
          entry.isFile() &&
          entry.name === 'docx-preview.worker.js' &&
          p.includes('@file-viewer+docx'),
      ),
  },
  {
    targetName: 'jszip.min.js',
    desc: 'DOCX 压缩流快速解包库',
    finder: () =>
      findInDir(
        searchBase,
        (entry, p) =>
          entry.isFile() && entry.name === 'jszip.min.js' && p.includes('@file-viewer+docx'),
      ),
  },
  // 2. PPT / PPTX
  {
    targetName: 'pptx.worker.js',
    desc: 'PPTX 演示文稿流式 Worker',
    finder: () =>
      findInDir(
        searchBase,
        (entry, p) =>
          entry.isFile() && entry.name === 'pptx.worker.js' && p.includes('@file-viewer+pptx'),
      ),
  },
  {
    targetName: 'ppt-native.wasm',
    desc: 'PPT 矢量图形 Native WASM 渲染核心',
    finder: () =>
      findInDir(
        searchBase,
        (entry, p) =>
          entry.isFile() && entry.name === 'ppt-native.wasm' && p.includes('@file-viewer+ppt'),
      ),
  },
  // 3. Excel (Spreadsheet)
  {
    targetName: 'sheet.worker.js',
    desc: 'Excel 表格虚拟化解析 Worker',
    finder: () =>
      findInDir(
        searchBase,
        (entry, p) =>
          entry.isFile() &&
          entry.name === 'sheet.worker.js' &&
          p.includes('@file-viewer+renderer-spreadsheet') &&
          p.includes('dist' + path.sep + 'worker'),
      ),
  },
  // 4. PDF (PDF.js)
  {
    targetName: 'pdf.worker.js',
    desc: 'PDF.js 渲染 Worker 线程',
    finder: () =>
      findInDir(
        searchBase,
        (entry, p) =>
          entry.isFile() &&
          entry.name === 'pdf.worker.mjs' &&
          p.includes('@file-viewer+renderer-pdf'),
      ),
  },
];

let syncedCount = 0;

for (const job of assetCopyJobs) {
  const destPath = path.join(targetDir, job.targetName);
  const sourcePath = job.finder();

  if (sourcePath && fs.existsSync(sourcePath)) {
    const stat = fs.statSync(sourcePath);
    fs.copyFileSync(sourcePath, destPath);
    console.log(
      `  ✔ [已同步] ${job.targetName.padEnd(18)} (${(stat.size / 1024).toFixed(1)} KB) ➔ ${job.desc}`,
    );
    syncedCount++;
  } else {
    // 若找不到真实源，检查是否已存在
    if (fs.existsSync(destPath)) {
      console.log(`  ⚪ [保留存量] ${job.targetName.padEnd(18)} ➔ ${job.desc}`);
    } else {
      fs.writeFileSync(
        destPath,
        `/* [@atengk/file-viewer-vue] Offline Asset: ${job.targetName} (${job.desc}) */\n`,
        'utf-8',
      );
      console.log(`  ⚠ [轻量占位] ${job.targetName.padEnd(18)} ➔ 未在 node_modules 找到源文件`);
    }
  }
}

// 同步 PDF 的 wasm、cmaps 与 standard_fonts 目录 (如果存在)
const wasmSource = findInDir(
  searchBase,
  (entry, p) =>
    entry.isDirectory() && entry.name === 'wasm' && p.includes('@file-viewer+renderer-pdf'),
);
if (wasmSource) {
  const destWasm = path.join(targetDir, 'wasm');
  copyDirRecursive(wasmSource, destWasm);
  console.log(`  ✔ [已同步目录] wasm ➔ PDF WASM 二进制加速模块`);
}

const cmapsSource = findInDir(
  searchBase,
  (entry, p) =>
    entry.isDirectory() && entry.name === 'cmaps' && p.includes('@file-viewer+renderer-pdf'),
);
if (cmapsSource) {
  const destCmaps = path.join(targetDir, 'cmaps');
  copyDirRecursive(cmapsSource, destCmaps);
  console.log(`  ✔ [已同步目录] cmaps ➔ PDF 字符集映射表`);
}

const fontsSource = findInDir(
  searchBase,
  (entry, p) =>
    entry.isDirectory() &&
    entry.name === 'standard_fonts' &&
    p.includes('@file-viewer+renderer-pdf'),
);
if (fontsSource) {
  const destFonts = path.join(targetDir, 'standard_fonts');
  copyDirRecursive(fontsSource, destFonts);
  console.log(`  ✔ [已同步目录] standard_fonts ➔ PDF 标准字体集`);
}

console.log(
  `\n🎉 离线静态资产同步完成: 共处理 ${assetCopyJobs.length} 项核心资产，成功同步 ${syncedCount} 个生产内核文件。`,
);
console.log(
  `💡 提示: 部署时可配合 configureFileViewer({ assetBaseUrl: '${targetDir.replace(/\\/g, '/')}' }) 实现完全离线内网加载。`,
);
