/**
 * @atengk/form-designer-vue 无头表单运行态响应式状态机。
 *
 * 遵循 ADR-0002 (Vue 3.5 toValue 解包)、ADR-0013 与 ADR-0044 规约，
 * 纯状态机编排，负责数据双向流、路径存取、流程权限仲裁与基础校验生命周期。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, toValue, watch, toRaw } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import type {
  FormSchema,
  FormWidget,
  FieldPermission,
  FieldPermissionMatrix,
  FormValidationErrors,
} from '../types';
import { getByPath, setByPath } from '../utils/path';

/**
 * 安全深度克隆工具（解包 Vue Proxy，防御 DataCloneError）。
 */
function safeClone<T>(val: T): T {
  if (val == null || typeof val !== 'object') {
    return val;
  }
  const raw = toRaw(val);
  try {
    return structuredClone(raw);
  } catch {
    try {
      return JSON.parse(JSON.stringify(raw));
    } catch {
      return Array.isArray(raw) ? ([...raw] as unknown as T) : { ...raw };
    }
  }
}

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
  // 初始默认数据快照（用于 resetFields）
  let initialDataSnapshot: Record<string, unknown> = {};

  // 递归收集 Schema 中所有字段的默认值
  const extractDefaultValues = (widgets: FormWidget[]): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    if (!Array.isArray(widgets)) return result;

    for (const widget of widgets) {
      if (widget.modelKey && widget.defaultValue !== undefined) {
        setByPath(result, widget.modelKey, widget.defaultValue);
      }
      if (widget.children && Array.isArray(widget.children)) {
        const childDefaults = extractDefaultValues(widget.children);
        Object.assign(result, childDefaults);
      }
    }
    return result;
  };

  // 初始化数据流
  const initFormData = (): void => {
    const currentSchema = toValue(options.schema);
    const defaults = currentSchema ? extractDefaultValues(currentSchema.widgetList) : {};
    const external = toValue(options.formData);

    // 合并外部传入的数据与 Schema 默认值
    const merged = { ...defaults, ...(external || {}) };
    internalFormData.value = safeClone(merged);
    initialDataSnapshot = safeClone(merged);
  };

  initFormData();

  // 监听外部 formData 变更，同步到内部状态（防环形触发）
  watch(
    () => toValue(options.formData),
    newVal => {
      if (newVal && newVal !== internalFormData.value) {
        internalFormData.value = { ...internalFormData.value, ...newVal };
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

    // 若该字段存在校验错误，清理错误状态
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
   * 判定控件是否可见（未被流程权限置为 hidden）。
   */
  const isFieldVisible = (widget: FormWidget): boolean => {
    const perm = getFieldPermission(widget);
    return perm !== 'hidden';
  };

  /**
   * 判定控件是否禁用（全局禁用或自身属性禁用）。
   */
  const isFieldDisabled = (widget: FormWidget): boolean => {
    const isGlobalDisabled = toValue(options.disabled);
    if (isGlobalDisabled) {
      return true;
    }
    return Boolean(widget.props?.disabled);
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
   * 判定控件是否强制必填（流程权限为 required 或 rules 声明必填）。
   */
  const isFieldRequired = (widget: FormWidget): boolean => {
    const perm = getFieldPermission(widget);
    if (perm === 'required') {
      return true;
    }
    if (perm === 'readonly' || perm === 'hidden') {
      return false;
    }
    if (Array.isArray(widget.rules)) {
      return widget.rules.some(rule => Boolean(rule.required));
    }
    return false;
  };

  /**
   * 扁平收集所有参与渲染的有效表单控件。
   */
  const collectActiveWidgets = (widgets: FormWidget[]): FormWidget[] => {
    const result: FormWidget[] = [];
    if (!Array.isArray(widgets)) return result;

    for (const widget of widgets) {
      if (isFieldVisible(widget)) {
        if (widget.modelKey) {
          result.push(widget);
        }
        if (widget.children && Array.isArray(widget.children)) {
          result.push(...collectActiveWidgets(widget.children));
        }
      }
    }
    return result;
  };

  /**
   * 触发单字段校验。
   */
  const validateField = async (path: string): Promise<{ valid: boolean; error?: string }> => {
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
      return { valid: true };
    }

    const value = getFieldValue(path);
    const isRequired = isFieldRequired(targetWidget);

    // 必填项空安全前置检查
    if (isRequired) {
      const isEmpty = value == null || value === '' || (Array.isArray(value) && value.length === 0);
      if (isEmpty) {
        const errorMsg =
          targetWidget.rules?.find(r => r.required)?.message ||
          `${targetWidget.label || path} 为必填项`;
        errors.value = { ...errors.value, [path]: errorMsg };
        return { valid: false, error: errorMsg };
      }
    }

    // 规则列表逐项校验
    if (Array.isArray(targetWidget.rules)) {
      for (const rule of targetWidget.rules) {
        if (rule.pattern) {
          const regex = typeof rule.pattern === 'string' ? new RegExp(rule.pattern) : rule.pattern;
          if (value && !regex.test(String(value))) {
            const errorMsg = rule.message || `${targetWidget.label || path} 格式不正确`;
            errors.value = { ...errors.value, [path]: errorMsg };
            return { valid: false, error: errorMsg };
          }
        }

        if (rule.min != null && typeof value === 'string' && value.length < rule.min) {
          const errorMsg = rule.message || `最少输入 ${rule.min} 个字符`;
          errors.value = { ...errors.value, [path]: errorMsg };
          return { valid: false, error: errorMsg };
        }

        if (rule.max != null && typeof value === 'string' && value.length > rule.max) {
          const errorMsg = rule.message || `最多输入 ${rule.max} 个字符`;
          errors.value = { ...errors.value, [path]: errorMsg };
          return { valid: false, error: errorMsg };
        }

        if (typeof rule.validator === 'function') {
          let customErr: string | undefined;
          await rule.validator(
            rule,
            value,
            err => {
              if (err) {
                customErr = typeof err === 'string' ? err : err.message;
              }
            },
            internalFormData.value,
          );
          if (customErr) {
            errors.value = { ...errors.value, [path]: customErr };
            return { valid: false, error: customErr };
          }
        }
      }
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

    for (const widget of allWidgets) {
      if (widget.modelKey) {
        const res = await validateField(widget.modelKey);
        if (!res.valid && res.error) {
          newErrors[widget.modelKey] = res.error;
        }
      }
    }

    errors.value = newErrors;
    const isValid = Object.keys(newErrors).length === 0;

    return {
      valid: isValid,
      errors: newErrors,
    };
  };

  /**
   * 清除指定或全部字段的校验错误状态。
   */
  const clearValidate = (path?: string): void => {
    if (path) {
      const next = { ...errors.value };
      delete next[path];
      errors.value = next;
    } else {
      errors.value = {};
    }
  };

  /**
   * 重置表单所有字段至初始快照值并清除校验错误。
   */
  const resetFields = (): void => {
    internalFormData.value = safeClone(initialDataSnapshot);
    clearValidate();
    options.onUpdateFormData?.({ ...internalFormData.value });
  };

  return {
    formData: internalFormData,
    errors,
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
