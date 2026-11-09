/**
 * @atengk/form-designer-vue 零 eval 动态规则联动引擎 (DynamicRuleEngine)。
 *
 * 遵循 ADR-0013 与 ADR-0044 规约：
 * 1. 采用声明式条件树结构，支持 eq/ne/gt/gte/lt/lte/in/notIn/empty/notEmpty 丰富比对算子与 and/or 逻辑；
 * 2. 联动计算深度集成 SafeMathEvaluator 算术 AST 解释器，彻底根除 eval / new Function 安全漏洞；
 * 3. 动态响应显隐 (visible)、禁用 (disabled)、强制必填 (required) 与值计算 (value) 四重行为；
 * 4. 纯净跨框架无状态设计，无任何 UI 库强依赖。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { DynamicAction, DynamicCondition, DynamicRule, FormWidget } from '../types';
import { getByPath } from '../utils/path';
import { SafeMathEvaluator } from './SafeMathEvaluator';

/**
 * 控件基础状态基线。
 */
export interface WidgetBaselineState {
  visible?: boolean;
  disabled?: boolean;
  required?: boolean;
}

/**
 * 动态规则运算后的控件最终状态。
 */
export interface EvaluatedWidgetState {
  /** 最终是否可见 */
  visible: boolean;
  /** 最终是否禁用 */
  disabled: boolean;
  /** 最终是否必填 */
  required: boolean;
  /** 计算出的联动值（若未触发 value 行为则为 undefined） */
  computedValue?: unknown;
  /** 是否存在有效的值计算行为 */
  hasValueAction: boolean;
}

export class DynamicRuleEngine {
  /**
   * 判定值是否为空（null、undefined、空字符串、空数组或无属性空对象）。
   */
  public static isEmpty(val: unknown): boolean {
    if (val == null) {
      return true;
    }
    if (typeof val === 'string' && val.trim() === '') {
      return true;
    }
    if (Array.isArray(val) && val.length === 0) {
      return true;
    }
    if (typeof val === 'object' && val !== null && Object.keys(val).length === 0) {
      return true;
    }
    return false;
  }

  /**
   * 宽松等值比对（兼容纯数字与纯数字字符串场景）。
   */
  private static isEqual(a: unknown, b: unknown): boolean {
    if (a === b) {
      return true;
    }
    if (a == null || b == null) {
      return a === b;
    }
    // 数值与字符串宽松比对 (如 '10' === 10)
    if (
      (typeof a === 'number' && typeof b === 'string') ||
      (typeof a === 'string' && typeof b === 'number')
    ) {
      return String(a) === String(b);
    }
    return false;
  }

  /**
   * 评估单条条件是否成立。
   *
   * @param condition 联动条件
   * @param formData 表单数据源
   */
  public static evaluateCondition(
    condition: DynamicCondition,
    formData: Record<string, unknown>,
  ): boolean {
    const val = getByPath(formData, condition.sourceKey);
    const target = condition.value;

    switch (condition.operator) {
      case 'eq':
        return DynamicRuleEngine.isEqual(val, target);

      case 'ne':
        return !DynamicRuleEngine.isEqual(val, target);

      case 'gt':
        return Number(val) > Number(target);

      case 'gte':
        return Number(val) >= Number(target);

      case 'lt':
        return Number(val) < Number(target);

      case 'lte':
        return Number(val) <= Number(target);

      case 'in':
        if (Array.isArray(target)) {
          return target.some(t => DynamicRuleEngine.isEqual(val, t));
        }
        if (Array.isArray(val)) {
          return val.some(v => DynamicRuleEngine.isEqual(v, target));
        }
        return false;

      case 'notIn':
        if (Array.isArray(target)) {
          return !target.some(t => DynamicRuleEngine.isEqual(val, t));
        }
        if (Array.isArray(val)) {
          return !val.some(v => DynamicRuleEngine.isEqual(v, target));
        }
        return true;

      case 'empty':
        return DynamicRuleEngine.isEmpty(val);

      case 'notEmpty':
        return !DynamicRuleEngine.isEmpty(val);

      default:
        return false;
    }
  }

  /**
   * 评估单条规则中的全部条件组合逻辑（支持 and / or 复合运算）。
   *
   * @param rule 联动规则
   * @param formData 表单数据源
   */
  public static evaluateRule(rule: DynamicRule, formData: Record<string, unknown>): boolean {
    if (!rule.conditions || rule.conditions.length === 0) {
      return false;
    }

    const logic = rule.logic || 'and';
    if (logic === 'or') {
      return rule.conditions.some(cond => DynamicRuleEngine.evaluateCondition(cond, formData));
    }
    return rule.conditions.every(cond => DynamicRuleEngine.evaluateCondition(cond, formData));
  }

  /**
   * 计算指定控件在当前表单数据下的最终动态状态与联动值。
   *
   * @param widget 控件实体定义
   * @param formData 表单全量数据源
   * @param baseline 控件静态基线状态（默认从 widget.props / widget.rules 解析）
   */
  public static evaluateWidget(
    widget: FormWidget,
    formData: Record<string, unknown>,
    baseline?: WidgetBaselineState,
  ): EvaluatedWidgetState {
    let visible = baseline?.visible ?? widget.props?.visible !== false;
    let disabled = baseline?.disabled ?? Boolean(widget.props?.disabled);
    let required = baseline?.required ?? Boolean(widget.rules?.some(r => r.required));
    let computedValue: unknown = undefined;
    let hasValueAction = false;

    if (widget.dynamicRules && widget.dynamicRules.length > 0) {
      for (const rule of widget.dynamicRules) {
        const isMatched = DynamicRuleEngine.evaluateRule(rule, formData);
        const actionsToExecute: DynamicAction[] | undefined = isMatched
          ? rule.actions
          : rule.otherwise;

        if (actionsToExecute && actionsToExecute.length > 0) {
          for (const action of actionsToExecute) {
            switch (action.target) {
              case 'visible':
                visible = Boolean(action.value);
                break;
              case 'disabled':
                disabled = Boolean(action.value);
                break;
              case 'required':
                required = Boolean(action.value);
                break;
              case 'value':
                hasValueAction = true;
                if (typeof action.value === 'function') {
                  // 函数式闭包逃生门
                  try {
                    computedValue = action.value(formData);
                  } catch {
                    computedValue = undefined;
                  }
                } else if (typeof action.value === 'string') {
                  // 基于 AST 的轻量安全算术解析
                  computedValue = SafeMathEvaluator.evaluate(action.value, formData);
                } else {
                  // 静态常量值注入
                  computedValue = action.value;
                }
                break;
            }
          }
        }
      }
    }

    return {
      visible,
      disabled,
      required,
      computedValue,
      hasValueAction,
    };
  }

  /**
   * 安全调用算术 AST 解释器求值。
   *
   * @param expression 表达式
   * @param formData 上下文数据源
   */
  public static evaluateFormula(
    expression: string | number | undefined | null,
    formData: Record<string, unknown>,
  ): number {
    return SafeMathEvaluator.evaluate(expression, formData);
  }

  /**
   * 收集控件动态规则所显式依赖的上游字段路径（用于细粒度依赖收集）。
   */
  public static collectDependencies(widget: FormWidget): string[] {
    const deps = new Set<string>();
    if (!widget.dynamicRules) {
      return [];
    }

    for (const rule of widget.dynamicRules) {
      if (rule.conditions) {
        for (const cond of rule.conditions) {
          if (cond.sourceKey) {
            deps.add(cond.sourceKey);
          }
        }
      }
    }

    return Array.from(deps);
  }
}
