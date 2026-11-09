/**
 * @atengk/form-designer-vue 异步时序抗竞态校验引擎 (AsyncValidatorEngine)。
 *
 * 遵循 ADR-0013 与 ADR-0044 规约，全面对齐 async-validator 标准规范；
 * 内置防抖与逻辑流水号（Sequence Number）时序双重校验，彻底根绝高频输入下异步接口校验先发后至的竞态覆盖缺陷。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { FormRule, FormValidationErrors } from '../types';

/**
 * 常用正则规则预设。
 */
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const URL_REGEX = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
const INTEGER_REGEX = /^-?\d+$/;

export interface ValidationResult {
  /** 整体是否通过校验 */
  valid: boolean;
  /** 首个未通过规则的错误提示信息 */
  error?: string;
}

export class AsyncValidatorEngine {
  /** 各字段独立的递增时序流水号映射 */
  private readonly seqMap = new Map<string, number>();
  /** 各字段在途的 AbortController 映射（支持物理中断） */
  private readonly abortMap = new Map<string, AbortController>();
  /** 各字段防抖定时器与挂起 Resolve 映射 */
  private readonly timerMap = new Map<
    string,
    { timer: ReturnType<typeof setTimeout>; resolve: () => void }
  >();

  /**
   * 判定值是否为空（null、undefined、空字符串或空数组）。
   */
  public static isEmptyValue(val: unknown): boolean {
    if (val == null) {
      return true;
    }
    if (typeof val === 'string' && val.trim() === '') {
      return true;
    }
    if (Array.isArray(val) && val.length === 0) {
      return true;
    }
    return false;
  }

  /**
   * 获取或初始化字段时序流水号。
   */
  private getSeq(field: string): number {
    return this.seqMap.get(field) ?? 0;
  }

  /**
   * 取消指定字段所有正在等待中或在途的校验（物理中断 + 逻辑废弃）。
   */
  public cancelField(field: string): void {
    // 递增流水号，使正在进行中的校验失效
    const nextSeq = this.getSeq(field) + 1;
    this.seqMap.set(field, nextSeq);

    // 清理防抖定时器并立即唤醒挂起的 Promise 防止挂死
    const pending = this.timerMap.get(field);
    if (pending) {
      clearTimeout(pending.timer);
      this.timerMap.delete(field);
      pending.resolve();
    }

    // 物理中断在途的 AbortSignal
    const controller = this.abortMap.get(field);
    if (controller) {
      controller.abort('Canceled by subsequent validation or cancelField');
      this.abortMap.delete(field);
    }
  }

  /**
   * 清理全量字段的在途校验与定时器。
   */
  public clearAll(): void {
    const fields = new Set([
      ...this.seqMap.keys(),
      ...this.timerMap.keys(),
      ...this.abortMap.keys(),
    ]);
    for (const field of fields) {
      this.cancelField(field);
    }
    this.seqMap.clear();
    this.timerMap.clear();
    this.abortMap.clear();
  }

  /**
   * 单条同步/异步规则解析器。
   */
  private async evaluateSingleRule(
    rule: FormRule,
    value: unknown,
    source: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<string | undefined> {
    const isValueEmpty = AsyncValidatorEngine.isEmptyValue(value);

    // 1. 必填规则 (required)
    if (rule.required && isValueEmpty) {
      return rule.message || '此项为必填项';
    }

    // 非必填且值为空时，跳过后续格式校验
    if (!rule.required && isValueEmpty) {
      return undefined;
    }

    // 2. 数据类型规则 (type)
    if (rule.type) {
      const typeError = this.checkType(rule.type, value, rule.message);
      if (typeError) {
        return typeError;
      }
    }

    // 3. 正则表达式规则 (pattern)
    if (rule.pattern) {
      const regex = typeof rule.pattern === 'string' ? new RegExp(rule.pattern) : rule.pattern;
      if (!regex.test(String(value))) {
        return rule.message || '内容格式不符合要求';
      }
    }

    // 4. 长度与区间规则 (len / min / max)
    const rangeError = this.checkRange(rule, value);
    if (rangeError) {
      return rangeError;
    }

    // 5. 自定义异步校验规则 (asyncValidator)
    if (typeof rule.asyncValidator === 'function') {
      let customErr: string | undefined;
      await rule.asyncValidator(
        rule,
        value,
        err => {
          if (err) {
            customErr = typeof err === 'string' ? err : err.message;
          }
        },
        source,
        signal,
      );
      if (customErr) {
        return customErr;
      }
    }

    // 6. 自定义同步/异步规则 (validator)
    if (typeof rule.validator === 'function') {
      let customErr: string | undefined;
      const res = rule.validator(
        rule,
        value,
        err => {
          if (err) {
            customErr = typeof err === 'string' ? err : err.message;
          }
        },
        source,
      );
      if (res instanceof Promise) {
        await res;
      }
      if (customErr) {
        return customErr;
      }
    }

    return undefined;
  }

  /**
   * 数据类型校验。
   */
  private checkType(type: string, value: unknown, customMsg?: string): string | undefined {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return customMsg || '必须为字符串类型';
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return customMsg || '必须为有效数值类型';
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return customMsg || '必须为布尔类型';
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          return customMsg || '必须为数组类型';
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return customMsg || '必须为对象类型';
        }
        break;
      case 'email':
        if (!EMAIL_REGEX.test(String(value))) {
          return customMsg || '请输入有效的邮箱地址';
        }
        break;
      case 'url':
        if (!URL_REGEX.test(String(value))) {
          return customMsg || '请输入有效的 URL 地址';
        }
        break;
      case 'integer':
        if (!INTEGER_REGEX.test(String(value))) {
          return customMsg || '必须为整数';
        }
        break;
    }
    return undefined;
  }

  /**
   * 长度与数值区间校验。
   */
  private checkRange(rule: FormRule, value: unknown): string | undefined {
    const isStringOrArray = typeof value === 'string' || Array.isArray(value);
    const isNum = typeof value === 'number' && !isNaN(value);

    // 精确长度
    if (rule.len != null) {
      if (isStringOrArray && value.length !== rule.len) {
        return rule.message || `长度必须为 ${rule.len} 个字符`;
      }
      if (isNum && value !== rule.len) {
        return rule.message || `数值必须等于 ${rule.len}`;
      }
    }

    // 最小长度 / 最小值
    if (rule.min != null) {
      if (isStringOrArray && value.length < rule.min) {
        return rule.message || `长度不能少于 ${rule.min} 个字符`;
      }
      if (isNum && value < rule.min) {
        return rule.message || `数值不能小于 ${rule.min}`;
      }
    }

    // 最大长度 / 最大值
    if (rule.max != null) {
      if (isStringOrArray && value.length > rule.max) {
        return rule.message || `长度不能超过 ${rule.max} 个字符`;
      }
      if (isNum && value > rule.max) {
        return rule.message || `数值不能大于 ${rule.max}`;
      }
    }

    return undefined;
  }

  /**
   * 校验单个字段（包含防抖与时序抗竞态双重防御）。
   *
   * @param field 字段路径标识 (modelKey)
   * @param rules 规则数组
   * @param value 当前字段值
   * @param source 全量表单数据快照
   * @param onValidatingStatus 校验中状态变更回调
   */
  public async validateField(
    field: string,
    rules: FormRule[] | undefined,
    value: unknown,
    source: Record<string, unknown>,
    onValidatingStatus?: (isValidating: boolean) => void,
  ): Promise<ValidationResult> {
    if (!rules || rules.length === 0) {
      return { valid: true };
    }

    // 1. 物理切断该字段前序在途请求并递增逻辑流水号
    this.cancelField(field);
    const seq = this.getSeq(field);

    const controller = new AbortController();
    this.abortMap.set(field, controller);

    // 2. 检查是否有包含异步特性或指定防抖延迟的规则
    const hasAsync = rules.some(
      r => typeof r.asyncValidator === 'function' || Boolean(r.debounceMs),
    );
    const debounceMs = Math.max(
      ...rules.map(r => r.debounceMs ?? (typeof r.asyncValidator === 'function' ? 300 : 0)),
    );

    // 若需要防抖，先等待防抖时长
    if (debounceMs > 0) {
      await new Promise<void>(resolve => {
        const timer = setTimeout(() => {
          this.timerMap.delete(field);
          resolve();
        }, debounceMs);
        this.timerMap.set(field, { timer, resolve });
      });

      // 逻辑时序校验：若防抖等待期间该字段有了更新的调用，立即废弃本轮
      if (this.getSeq(field) !== seq) {
        return { valid: true };
      }
    }

    if (hasAsync) {
      onValidatingStatus?.(true);
    }

    try {
      // 3. 逐条执行规则
      for (const rule of rules) {
        // 如果已被外部或后续请求中断，立即退出
        if (controller.signal.aborted || this.getSeq(field) !== seq) {
          return { valid: true };
        }

        const errorMsg = await this.evaluateSingleRule(rule, value, source, controller.signal);

        // 异步执行完毕后，进行二次逻辑时序校验：仅当流水号一致时才采纳
        if (this.getSeq(field) !== seq) {
          return { valid: true };
        }

        if (errorMsg) {
          return { valid: false, error: errorMsg };
        }
      }

      return { valid: true };
    } catch (err: unknown) {
      if (controller.signal.aborted || this.getSeq(field) !== seq) {
        return { valid: true };
      }
      const msg = err instanceof Error ? err.message : String(err);
      return { valid: false, error: msg };
    } finally {
      if (hasAsync && this.getSeq(field) === seq) {
        onValidatingStatus?.(false);
      }
    }
  }

  /**
   * 批量校验全量字段。
   *
   * @param fieldRulesMap 字段规则字典
   * @param source 全量表单数据
   */
  public async validateAll(
    fieldRulesMap: Record<string, FormRule[]>,
    source: Record<string, unknown>,
    getValue: (field: string) => unknown,
  ): Promise<{ valid: boolean; errors: FormValidationErrors }> {
    const errors: FormValidationErrors = {};
    const fields = Object.keys(fieldRulesMap);

    const tasks = fields.map(async field => {
      const rules = fieldRulesMap[field];
      const val = getValue(field);
      const res = await this.validateField(field, rules, val, source);
      if (!res.valid && res.error) {
        errors[field] = res.error;
      }
    });

    await Promise.all(tasks);

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }
}
