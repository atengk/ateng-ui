/**
 * sample-cropper-vue 离线自洽高保真测试位图生成工具。
 *
 * 依托原生 Canvas 离线绘制，100% 杜绝外部网络依赖与 CORS 跨域污染。
 *
 * @author Ateng
 * @since 2026-11-10
 */

/**
 * 绘制一张企业商务风景/办公位图 DataURL。
 */
export function createOfficeLandscapeImage(width = 1200, height = 800): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. 背景渐变
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#1e3a8a');
  bgGrad.addColorStop(0.5, '#3b82f6');
  bgGrad.addColorStop(1, '#93c5fd');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. 商务网格与饰条
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  for (let x = 0; x < width; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 3. 几何图形
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.arc(width * 0.75, height * 0.35, 180, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(80, height * 0.5, width * 0.45, height * 0.35);

  // 4. 文字标题
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px sans-serif';
  ctx.fillText('ateng-ui 企业级图像工作台', 120, height * 0.62);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '22px sans-serif';
  ctx.fillText(`规格：${width} × ${height} px | 离线自洽高保真画质`, 120, height * 0.72);

  return canvas.toDataURL('image/png');
}

/**
 * 绘制一张人像特写/头像模拟位图 DataURL。
 */
export function createAvatarSampleImage(size = 800): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. 柔和人像背景渐变
  const bgGrad = ctx.createRadialGradient(size / 2, size / 2, 50, size / 2, size / 2, size / 2);
  bgGrad.addColorStop(0, '#fef3c7');
  bgGrad.addColorStop(0.7, '#fde68a');
  bgGrad.addColorStop(1, '#f59e0b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // 2. 头部轮廓
  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.arc(size / 2, size * 0.42, size * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // 3. 躯干轮廓
  ctx.fillStyle = '#4f46e5';
  ctx.beginPath();
  ctx.ellipse(size / 2, size * 0.88, size * 0.35, size * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4. 标识文字
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('User Avatar Sample', size / 2, size * 0.44);

  return canvas.toDataURL('image/png');
}

/**
 * 绘制一张电商商品模拟位图 DataURL。
 */
export function createProductSampleImage(width = 900, height = 900): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. 时尚浅灰纯净展台
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, width, height);

  // 2. 展台底座光影
  const shadowGrad = ctx.createRadialGradient(
    width / 2,
    height * 0.72,
    10,
    width / 2,
    height * 0.72,
    280,
  );
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(width / 2, height * 0.72, 280, 50, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. 商品包装盒主体
  const boxGrad = ctx.createLinearGradient(width * 0.3, height * 0.25, width * 0.7, height * 0.7);
  boxGrad.addColorStop(0, '#0ea5e9');
  boxGrad.addColorStop(1, '#0284c7');
  ctx.fillStyle = boxGrad;
  ctx.beginPath();
  ctx.roundRect(width * 0.28, height * 0.26, width * 0.44, height * 0.42, 24);
  ctx.fill();

  // 4. 包装盒徽标与文案
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PREMIUM PRODUCT', width / 2, height * 0.45);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '20px sans-serif';
  ctx.fillText('Natural Essence 500ml', width / 2, height * 0.52);

  return canvas.toDataURL('image/png');
}

/**
 * 绘制一张超大尺寸位图 DataURL（如 5000 x 4000，用于极限压力测试）。
 */
export function createGiantStressImage(width = 5000, height = 4000): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 渐变背景
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#7c3aed');
  grad.addColorStop(1, '#db2777');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 180px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`超大尺寸极限压力位图 (${width}×${height})`, width / 2, height / 2);

  ctx.font = '90px sans-serif';
  ctx.fillText('用于 4096 护栏防爆降采样校验', width / 2, height / 2 + 160);

  return canvas.toDataURL('image/jpeg', 0.85);
}
