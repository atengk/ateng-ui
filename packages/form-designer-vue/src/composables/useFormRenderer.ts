/**
 * @atengk/form-designer-vue 无头表单运行态响应式状态机。
 *
 * 遵循 ADR-0002 (Vue 3.5 toValue 解包)、ADR-0013 与 ADR-0044 规约，
 * 纯状态机编排，负责数据双向流、路径存取、流程权限仲裁与 AsyncValidatorEngine 校验生命周期。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, computed, toValue, watch, getCurrentScope, onScopeDispose } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import type {
  FormSchema,
  FormWidget,
  FieldPermission,
  FieldPermissionMatrix,
  FormValidationErrors,
  FormRule,
} from '../types';
import { getByPath, setByPath, safeClone } from '../utils/path';
import { AsyncValidatorEngine } from '../validator/AsyncValidatorEngine';
import { DynamicRuleEngine } from '../rules/DynamicRuleEngine';

export interface UseFormRendererOptions {
  /** 表单 Schema 定义 */
  schema: MaybeRefOrGetter<FormSchema>;
  /** 外部传入的双向绑定表单数据对象 */
  formData?: MaybeRefOrGetter<Record<string, unknown> | undefined>;
  /** 流程协同节点权限矩阵 */
  permissions?: MaybeRefOrGetter<FieldPermissionMatrix | undefined>;
  /** 全局禁用开关 */
  disabled?: MaybeRefOrGetter<boolean | undefined>;
  /** 全局只读开关 */
  readonly?: MaybeRefOrGetter<boolean | undefined>;
  /** 数据变更回调 */
  onUpdateFormData?: (data: Record<string, unknown>) => void;
  /** 字段变更回调 */
  onFieldChange?: (field: string, value: unknown, data: Record<string, unknown>) => void;
}

export function useFormRenderer(options: UseFormRendererOptions) {
  // 内部表单响应式状态
  const internalFormData = ref<Record<string, unknown>>({});
  // 校验错误字典
  const errors = ref<FormValidationErrors>({});
  // 正在进行异步校验的字段映射
  const validatingFields = ref<Record<string, boolean>>({});
  // 校验引擎实例
  const validatorEngine = new AsyncValidatorEngine();

  // 是否存在任何正在进行中的异步校验
  const isValidating = computed(() => {
    return Object.values(validatingFields.value).some(Boolean);
  });

  // 初始默认数据快照（用于 resetFields）
  let initialDataSnapshot: Record<string, unknown> = {};

  // 作用域销毁时清理所有在途定时器与请求
  if (getCurrentScope()) {
    onScopeDispose(() => {
      validatorEngine.clearAll();
    });
  }

  // 递归收集 Schema 中所有字段的默认值
  const extractDefaultValues = (widgets: FormWidget[]): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    if (!Array.isArray(widgets)) return result;

    for (const widget of widgets) {
      if (widget.isCollection || widget.type === 'subform') {
        if (widget.modelKey) {
          setByPath(
            result,
            widget.modelKey,
            widget.defaultValue !== undefined ? widget.defaultValue : [],
          );
        }
      } else {
        if (widget.modelKey && widget.defaultValue !== undefined) {
          setByPath(result, widget.modelKey, widget.defaultValue);
        }
        if (widget.children && Array.isArray(widget.children)) {
          const childDefaults = extractDefaultValues(widget.children);
          Object.assign(result, childDefaults);
        }
      }
    }
    return result;
  };

  /**
   * 递归扁平收集全量控件（包括容器内部子控件）。
   */
  const collectAllWidgets = (widgets: FormWidget[]): FormWidget[] => {
    const result: FormWidget[] = [];
    if (!Array.isArray(widgets)) return result;

    for (const widget of widgets) {
      result.push(widget);
      if (widget.children && Array.isArray(widget.children)) {
        result.push(...collectAllWidgets(widget.children));
      }
    }
    return result;
  };

  /**
   * 执行动态规则中的公式计算与联动赋值（支持最多 5 级级联计算并防循环依赖）。
   */
  const applyFormulaRules = (): void => {
    const currentSchema = toValue(options.schema);
    if (!currentSchema) return;

    const allWidgets = collectAllWidgets(currentSchema.widgetList);
    const valueWidgets = allWidgets.filter(
      w =>
        Boolean(w.modelKey) &&
        Boolean(w.dynamicRules?.some(r => r.actions?.some(a => a.target === 'value'))),
    );

    if (valueWidgets.length === 0) return;

    let hasChanged = false;
    let passes = 0;
    const maxPasses = 5;

    while (passes < maxPasses) {
      let passChanged = false;
      for (const widget of valueWidgets) {
        if (!widget.modelKey) continue;
        const evaluated = DynamicRuleEngine.evaluateWidget(widget, internalFormData.value);
        if (evaluated.hasValueAction && evaluated.computedValue !== undefined) {
          const currentVal = getByPath(internalFormData.value, widget.modelKey);
          if (!Object.is(currentVal, evaluated.computedValue)) {
            setByPath(internalFormData.value, widget.modelKey, evaluated.computedValue);
            passChanged = true;
            hasChanged = true;
          }
        }
      }
      if (!passChanged) break;
      passes++;
    }

    if (hasChanged) {
      const updatedSnapshot = { ...internalFormData.value };
      options.onUpdateFormData?.(updatedSnapshot);
    }
  };

  // 初始化数据流
  const initFormData = (): void => {
    const currentSchema = toValue(options.schema);
    const defaults = currentSchema ? extractDefaultValues(currentSchema.widgetList) : {};
    const external = toValue(options.formData);

    // 合并外部传入的数据与 Schema 默认值
    const merged = { ...defaults, ...(external || {}) };
    internalFormData.value = safeClone(merged);
    applyFormulaRules();
    initialDataSnapshot = safeClone(internalFormData.value);
  };

  initFormData();

  // 监听外部 formData 变更，同步到内部状态（防环形触发）
  watch(
    () => toValue(options.formData),
    newVal => {
      if (newVal && newVal !== internalFormData.value) {
        internalFormData.value = { ...internalFormData.value, ...newVal };
        applyFormulaRules();
      }
    },
    { deep: true },
  );

  // 监听流程节点权限变更，若字段变为 hidden 或 readonly 则自动清理残余校验错误
  watch(
    () => toValue(options.permissions),
    newPerms => {
      if (!newPerms) return;
      for (const [key, perm] of Object.entries(newPerms)) {
        if (perm === 'hidden' || perm === 'readonly') {
          if (errors.value[key]) {
            const nextErrors = { ...errors.value };
            delete nextErrors[key];
            errors.value = nextErrors;
          }
        }
      }
    },
    { deep: true },
  );

  /**
   * 获取指定路径的字段值。
   */
  const getFieldValue = (path: string): unknown => {
    return getByPath(internalFormData.value, path);
  };

  /**
   * 设置指定路径的字段值并触发通知。
   */
  const setFieldValue = (path: string, value: unknown): void => {
    setByPath(internalFormData.value, path, value);
    // 触发数据更新事件
    const updatedSnapshot = { ...internalFormData.value };
    options.onUpdateFormData?.(updatedSnapshot);
    options.onFieldChange?.(path, value, updatedSnapshot);

    // 重新运行公式联动计算
    applyFormulaRules();

    // 若该字段存在校验错误，清理错误状态并取消在途校验
    if (errors.value[path]) {
      const nextErrors = { ...errors.value };
      delete nextErrors[path];
      errors.value = nextErrors;
    }
  };

  /**
   * 获取全量表单数据副本。
   */
  const getFormData = (): Record<string, unknown> => {
    return safeClone(internalFormData.value);
  };

  /**
   * 批量重置设定表单数据。
   */
  const setFormData = (data: Record<string, unknown>): void => {
    internalFormData.value = safeClone(data || {});
    options.onUpdateFormData?.({ ...internalFormData.value });
  };

  /**
   * 解析字段在当前流程节点下的最终权限。
   * 遵循“Node Overrides Schema”仲裁准则：流程权限矩阵具有最高优先级。
   */
  const getFieldPermission = (widget: FormWidget): FieldPermission => {
    if (!widget.modelKey) {
      return 'editable';
    }
    const perms = toValue(options.permissions);
    if (perms && widget.modelKey in perms && perms[widget.modelKey]) {
      return perms[widget.modelKey] as FieldPermission;
    }
    // 默认回退到全局或控件本身的配置
    const isGlobalReadonly = toValue(options.readonly);
    if (isGlobalReadonly) {
      return 'readonly';
    }
    return 'editable';
  };

  /**
   * 判定控件是否可见。
   * 仲裁优先级：流程权限矩阵 (hidden) > 动态规则 (visible) > 控件默认 (props.visible !== false)。
   */
  const isFieldVisible = (widget: FormWidget): boolean => {
    const perm = getFieldPermission(widget);
    if (perm === 'hidden') {
      return false;
    }
    const evaluated = DynamicRuleEngine.evaluateWidget(widget, internalFormData.value);
    return evaluated.visible;
  };

  /**
   * 判定控件是否禁用。
   * 仲裁优先级：全局禁用 > 动态规则 (disabled) > 控件默认 (props.disabled)。
   */
  const isFieldDisabled = (widget: FormWidget): boolean => {
    const isGlobalDisabled = toValue(options.disabled);
    if (isGlobalDisabled) {
      return true;
    }
    const evaluated = DynamicRuleEngine.evaluateWidget(widget, internalFormData.value);
    return evaluated.disabled;
  };

  /**
   * 判定控件是否只读（流程权限为 readonly 或全局只读）。
   */
  const isFieldReadonly = (widget: FormWidget): boolean => {
    const perm = getFieldPermission(widget);
    if (perm === 'readonly') {
      return true;
    }
    return Boolean(toValue(options.readonly));
  };

  /**
   * 判定控件是否强制必填。
   * 仲裁优先级：流程权限矩阵 (required / readonly / hidden) > 动态规则 (required) > rules 默认必填。
   */
  const isFieldRequired = (widget: FormWidget): boolean => {
    const perm = getFieldPermission(widget);
    if (perm === 'required') {
      return true;
    }
    if (perm === 'readonly' || perm === 'hidden') {
      return false;
    }
    const evaluated = DynamicRuleEngine.evaluateWidget(widget, internalFormData.value);
    return evaluated.required;
  };

  /**
   * 扁平收集所有参与渲染的有效表单控件（支持 SubForm 动态明细行作用域展开）。
   */
  const collectActiveWidgets = (widgets: FormWidget[]): FormWidget[] => {
    const result: FormWidget[] = [];
    if (!Array.isArray(widgets)) return result;

    for (const widget of widgets) {
      if (isFieldVisible(widget)) {
        if (widget.isCollection || widget.type === 'subform') {
          // DataContainer: 针对明细行展开为带行索引路径的独立有效控件
          if (widget.modelKey && widget.children && widget.children.length > 0) {
            const rows = getByPath(internalFormData.value, widget.modelKey);
            if (Array.isArray(rows)) {
              rows.forEach((_, rowIndex) => {
                widget.children!.forEach(child => {
                  if (child.modelKey) {
                    result.push({
                      ...child,
                      id: `${widget.id}_row_${rowIndex}_${child.id}`,
                      modelKey: `${widget.modelKey}[${rowIndex}].${child.modelKey}`,
                      label: `${widget.label || '明细'}第${rowIndex + 1}行-${child.label || child.modelKey}`,
                    });
                  }
                });
              });
            }
          }
        } else {
          if (widget.modelKey) {
            result.push(widget);
          }
          if (widget.children && Array.isArray(widget.children)) {
            result.push(...collectActiveWidgets(widget.children));
          }
        }
      }
    }
    return result;
  };

  /**
   * 构建字段最终执行的有效规则集合。
   */
  const getEffectiveRules = (widget: FormWidget): FormRule[] => {
    const rules: FormRule[] = Array.isArray(widget.rules) ? [...widget.rules] : [];
    const isRequired = isFieldRequired(widget);

    // 确保必填规则处于前置位
    const hasRequiredRule = rules.some(r => Boolean(r.required));
    if (isRequired && !hasRequiredRule) {
      rules.unshift({
        required: true,
        message: `${widget.label || widget.modelKey || '字段'}为必填项`,
      });
    }

    return rules;
  };

  /**
   * 触发单字段校验。
   */
  const validateField = async (
    path: string,
    trigger?: 'blur' | 'change',
  ): Promise<{ valid: boolean; error?: string }> => {
    const currentSchema = toValue(options.schema);
    if (!currentSchema) {
      return { valid: true };
    }

    const allWidgets = collectActiveWidgets(currentSchema.widgetList);
    const targetWidget = allWidgets.find(w => w.modelKey === path);
    if (!targetWidget) {
      return { valid: true };
    }

    // 若只读或隐藏，直接跳过校验
    if (isFieldReadonly(targetWidget) || !isFieldVisible(targetWidget)) {
      clearValidate(path);
      return { valid: true };
    }

    const allRules = getEffectiveRules(targetWidget);
    // 过滤符合 trigger 触发时机的规则
    const activeRules = trigger
      ? allRules.filter(r => {
          if (!r.trigger) return true;
          if (Array.isArray(r.trigger)) return r.trigger.includes(trigger);
          return r.trigger === trigger;
        })
      : allRules;

    if (activeRules.length === 0) {
      return { valid: true };
    }

    const value = getFieldValue(path);
    const res = await validatorEngine.validateField(
      path,
      activeRules,
      value,
      internalFormData.value,
      isValidating => {
        validatingFields.value = {
          ...validatingFields.value,
          [path]: isValidating,
        };
      },
    );

    if (!res.valid && res.error) {
      errors.value = { ...errors.value, [path]: res.error };
      return { valid: false, error: res.error };
    }

    // 校验通过，清理错误
    if (errors.value[path]) {
      const nextErrors = { ...errors.value };
      delete nextErrors[path];
      errors.value = nextErrors;
    }

    return { valid: true };
  };

  /**
   * 触发表单全量字段校验。
   */
  const validate = async (): Promise<{
    valid: boolean;
    errors: FormValidationErrors;
  }> => {
    const currentSchema = toValue(options.schema);
    if (!currentSchema) {
      return { valid: true, errors: {} };
    }

    const allWidgets = collectActiveWidgets(currentSchema.widgetList);
    const newErrors: FormValidationErrors = {};

    const validationPromises = allWidgets
      .filter(w => Boolean(w.modelKey) && !isFieldReadonly(w) && isFieldVisible(w))
      .map(async widget => {
        const path = widget.modelKey!;
        const res = await validateField(path);
        if (!res.valid && res.error) {
          newErrors[path] = res.error;
        }
      });

    await Promise.all(validationPromises);

    errors.value = newErrors;
    const isValid = Object.keys(newErrors).length === 0;

    return {
      valid: isValid,
      errors: newErrors,
    };
  };

  /**
   * 清除指定或全部字段的校验错误状态与在途校验。
   */
  const clearValidate = (path?: string): void => {
    if (path) {
      validatorEngine.cancelField(path);
      const nextErrors = { ...errors.value };
      delete nextErrors[path];
      errors.value = nextErrors;
      const nextValidating = { ...validatingFields.value };
      delete nextValidating[path];
      validatingFields.value = nextValidating;
    } else {
      validatorEngine.clearAll();
      errors.value = {};
      validatingFields.value = {};
    }
  };

  /**
   * 重置表单所有字段至初始快照值并清除校验错误。
   */
  const resetFields = (): void => {
    internalFormData.value = safeClone(initialDataSnapshot);
    applyFormulaRules();
    clearValidate();
    options.onUpdateFormData?.({ ...internalFormData.value });
  };

  return {
    formData: internalFormData,
    errors,
    validating: isValidating,
    validatingFields,
    getFieldValue,
    setFieldValue,
    getFormData,
    setFormData,
    getFieldPermission,
    isFieldVisible,
    isFieldDisabled,
    isFieldReadonly,
    isFieldRequired,
    validateField,
    validate,
    clearValidate,
    resetFields,
  };
}
