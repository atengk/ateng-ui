/**
 * 内存真明文展示脱敏矩阵、金融级金额换算与强类型业务断言场景看板。
 *
 * @author Ateng
 * @since 2026-11-04
 */

import {
  formatMaskPhone,
  formatMaskIdCard,
  formatMaskEmail,
  formatMaskName,
  toCents,
  toYuan,
  formatCurrency,
  assert,
  assertNonNull,
  isEmpty,
  isNotEmpty,
  BusinessException,
} from '@atengk/core';

// 内存真实明文数据模型
const rawUserData = {
  name: '诸葛孔明',
  phone: '13800138000',
  idCard: '110101199003072345',
  email: 'zhuge.kongming@ateng.local',
};

/**
 * 渲染脱敏矩阵、金融金额与断言看板 HTML 模板。
 */
export function renderSecurityCard(): string {
  return `
    <!-- 卡片 7: 内存真明文展示脱敏矩阵 -->
    <div class="dashboard-card full-width" id="card-security-mask">
      <div class="card-title">
        <span>7. 内存真明文展示脱敏工具看板 (In-Memory Plaintext Invariant)</span>
        <span style="font-size: 12px; color: #10b981;">纯函数式计算</span>
      </div>
      <p class="card-desc">内存模型中数据始终保持 100% 原始真实明文，脱敏仅在渲染层动态调用纯函数计算，杜绝脏写数据库。</p>
      <table class="table-preview">
        <thead>
          <tr>
            <th>脱敏字段</th>
            <th>内存真实明文 (Plaintext)</th>
            <th>脱敏纯函数门面</th>
            <th>渲染层最终呈现 (Masked Output)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>手机号码</td>
            <td><code>${rawUserData.phone}</code></td>
            <td><code>formatMaskPhone(phone)</code></td>
            <td><strong style="color: #2563eb;">${formatMaskPhone(rawUserData.phone)}</strong></td>
          </tr>
          <tr>
            <td>身份证号</td>
            <td><code>${rawUserData.idCard}</code></td>
            <td><code>formatMaskIdCard(idCard)</code></td>
            <td><strong style="color: #2563eb;">${formatMaskIdCard(rawUserData.idCard)}</strong></td>
          </tr>
          <tr>
            <td>电子邮箱</td>
            <td><code>${rawUserData.email}</code></td>
            <td><code>formatMaskEmail(email)</code></td>
            <td><strong style="color: #2563eb;">${formatMaskEmail(rawUserData.email)}</strong></td>
          </tr>
          <tr>
            <td>中文姓名</td>
            <td><code>${rawUserData.name}</code></td>
            <td><code>formatMaskName(name)</code></td>
            <td><strong style="color: #2563eb;">${formatMaskName(rawUserData.name)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 卡片 11: 金融级金额高精度换算与强类型业务断言 -->
    <div class="dashboard-card" id="card-security-currency">
      <div class="card-title">
        <span>11. 金融级金额换算与强类型断言</span>
        <span style="font-size: 12px; color: #ea580c;">纯原生零失真</span>
      </div>
      <p class="card-desc">纯原生位移补齐实现元分互转与千分位格式化；业务断言 assert/assertNonNull 编译期类型收窄。</p>
      <div class="actions-row">
        <button class="btn btn-secondary" id="btn-currency-calc">12.34元 ➔ 分 ➔ 千分位</button>
        <button class="btn btn-danger" id="btn-assert-fail">测试 assertNonNull 异常拦截</button>
      </div>
      <div class="log-box" id="log-currency">// 金额计算与断言测试结果...</div>
    </div>
  `;
}

/**
 * 初始化脱敏矩阵、金融金额与断言场景交互事件。
 */
export function initSecurityScenario(): void {
  const logCurrency = document.getElementById('log-currency');

  document.getElementById('btn-currency-calc')?.addEventListener('click', () => {
    const yuan = 12.34;
    const cents = toCents(yuan);
    const backYuan = toYuan(cents);
    const bigMoney = 987654321.05;
    const formatted = formatCurrency(bigMoney);

    const sampleList = [1, 2, 3];
    assert(isNotEmpty(sampleList), '数据集不应为空');
    assert(isEmpty([]), '空集合校验');

    if (logCurrency) {
      logCurrency.textContent = [
        '[金融级高精度金额运算]',
        `1. 元转分: toCents(${yuan}) = ${cents} 分 (纯原生整数位移运算)`,
        `2. 分转元: toYuan(${cents}) = ${backYuan} 元 (零浮点失真)`,
        `3. 格式化千分位: formatCurrency(${bigMoney}) = "${formatted}"`,
        `4. 断言守卫: assert(isNotEmpty([1,2,3])) 与 assert(isEmpty([])) 校验通过`,
      ].join('\n');
    }
  });

  document.getElementById('btn-assert-fail')?.addEventListener('click', () => {
    try {
      const mockInput: string | null = null;
      assertNonNull(mockInput, '用户关键身份标识 (userId) 缺失');
    } catch (err) {
      if (err instanceof BusinessException) {
        if (logCurrency) {
          logCurrency.textContent = `[业务断言拦截成功]\n成功抛出强类型 BusinessException:\n- 错误码: ${err.code}\n- 提示信息: ${err.msg}\n- 校验作用: 快速失败 (Fail-Fast)，并在编译期实现 TypeScript 类型安全收窄！`;
        }
      } else if (logCurrency) {
        logCurrency.textContent = `[错误] ${String(err)}`;
      }
    }
  });
}
