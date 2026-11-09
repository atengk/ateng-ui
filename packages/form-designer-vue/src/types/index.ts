/**
 * @atengk/form-designer-vue 核心强类型契约定义。
 *
 * 遵循 ADR-0044 与 CONTEXT.md 领域规范，定义三段式 AST Schema、控件适配器与流程权限矩阵。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { Component } from 'vue';

/**
 * 字段流程权限枚举。
 * - editable: 可编辑（正常交互）
 * - readonly: 只读（脱壳纯文本或禁用态）
 * - hidden: 隐藏（不参与渲染且跳过校验）
 * - required: 强制必填（覆盖 Schema 默认规则）
 */
export type FieldPermission = 'editable' | 'readonly' | 'hidden' | 'required';

/**
 * 流程协同字段权限矩阵。键为字段的 modelKey。
 */
export type FieldPermissionMatrix = Record<string, FieldPermission>;

/**
 * 栅格排版响应式断点几何。
 */
export interface WidgetLayout {
  /** 默认 24 栅格所占格数 (1~24) */
  span?: number;
  /** 左侧栅格间隔格数 */
  offset?: number;
  /** <768px 超小屏幕 (手机) */
  xs?: number;
  /** ≥768px 小屏幕 */
  sm?: number;
  /** ≥992px 中等屏幕 */
  md?: number;
  /** ≥1200px 大屏幕 */
  lg?: number;
  /** ≥1920px 超大屏幕 */
  xl?: number;
}

/**
 * 校验规则定义（对齐 async-validator 规范）。
 */
export interface FormRule {
  /** 是否必填 */
  required?: boolean;
  /** 校验不通过时的错误提示信息 */
  message?: string;
  /** 触发时机 */
  trigger?: 'blur' | 'change' | ('blur' | 'change')[];
  /** 正则表达式规则 */
  pattern?: RegExp | string;
  /** 最小长度或最小值 */
  min?: number;
  /** 最大长度或最大值 */
  max?: number;
  /** 目标数据类型 */
  type?:
    'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url' | 'integer' | string;
  /** 固定精确长度 */
  len?: number;
  /** 异步校验防抖延迟（毫秒），默认 300ms */
  debounceMs?: number;
  /** 自定义同步校验函数 */
  validator?: (
    rule: FormRule,
    value: unknown,
    callback: (error?: string | Error) => void,
    source?: Record<string, unknown>,
  ) => void | Promise<void>;
  /** 自定义异步校验函数（注入专属 AbortSignal 支持时序取消） */
  asyncValidator?: (
    rule: FormRule,
    value: unknown,
    callback: (error?: string | Error) => void,
    source?: Record<string, unknown>,
    signal?: AbortSignal,
  ) => void | Promise<void>;
}

/**
 * 动态联动单项条件定义。
 */
export interface DynamicCondition {
  /** 依赖源字段的数据绑定键 (modelKey) */
  sourceKey: string;
  /** 比较运算符 */
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'notIn' | 'empty' | 'notEmpty';
  /** 期望匹配的目标值 */
  value?: unknown;
}

/**
 * 动态联动目标行为。
 */
export interface DynamicAction {
  /** 变更的目标属性 */
  target: 'visible' | 'disabled' | 'required' | 'value';
  /** 变更的值 */
  value: unknown;
}

/**
 * 动态联动规则树定义。
 */
export interface DynamicRule {
  /** 触发条件组 */
  conditions: DynamicCondition[];
  /** 条件间逻辑运算符 (and: 全满足, or: 任意满足) */
  logic?: 'and' | 'or';
  /** 满足条件时触发的行为 */
  actions: DynamicAction[];
  /** 条件不满足时触发的反向行为（可选） */
  otherwise?: DynamicAction[];
}

/**
 * 容器二分模型分类枚举。
 * - layout: 纯排版布局容器（Grid、Card、Collapse、Wizard、Tabs），仅影响几何排版，内部字段平铺绑定至根 formData。
 * - data: 数据集合明细容器（SubForm、DetailTable），在数据模型中产生独立数组分支（formData.items = [...]），具有行作用域。
 */
export type ContainerType = 'layout' | 'data';

/**
 * 布局排版容器通用 Props。
 */
export interface LayoutContainerProps {
  /** 栅格列数 (如 2 表示两列, 3 表示三列) */
  cols?: number;
  /** 栅格间距 (px) */
  gutter?: number;
  /** 容器卡片标题 */
  title?: string;
  /** 是否带边框 */
  bordered?: boolean;
}

/**
 * 子表单明细数据容器专用 Props。
 */
export interface SubFormProps {
  /** 交互模式：table 紧凑行内编辑表格，dialog-list 卡片弹窗填报 */
  displayMode?: 'table' | 'dialog-list';
  /** 是否允许新增明细行 */
  allowAdd?: boolean;
  /** 是否允许删除明细行 */
  allowDelete?: boolean;
  /** 最多允许行数 */
  maxRows?: number;
  /** 最少允许行数 */
  minRows?: number;
  /** 空数据占位文本 */
  emptyText?: string;
  /** 新增按钮文本 */
  addButtonText?: string;
}

/**
 * 表单控件单元抽象语法树（AST）节点。
 */
export interface FormWidget {
  /** 全局唯一标识 */
  id: string;
  /** 控件类型标识 (如 'input', 'select', 'grid', 'card', 'subform') */
  type: string;
  /** 绑定的数据模型键路径 (如 'username' 或 'order.items') */
  modelKey?: string;
  /** 控件标签展示文本 */
  label?: string;
  /** 占位提示文本 */
  placeholder?: string;
  /** 默认初始值 */
  defaultValue?: unknown;
  /** 控件专有属性参数字典 */
  props?: Record<string, unknown>;
  /** 字段校验规则列表 */
  rules?: FormRule[];
  /** 栅格排版几何信息 */
  layout?: WidgetLayout;
  /** 动态规则联动树列表 */
  dynamicRules?: DynamicRule[];
  /** 容器类型分类 ('layout' | 'data') */
  containerType?: ContainerType;
  /** 是否为排版容器 (如 Grid, Card) */
  isContainer?: boolean;
  /** 是否为数据集合明细容器 (如 SubForm) */
  isCollection?: boolean;
  /** 容器下属的子控件节点列表 */
  children?: FormWidget[];
  /** 选项列表 (Select / Radio / Checkbox 静态选项) */
  options?: Array<{ label: string; value: unknown; disabled?: boolean }>;
}

/**
 * 全局表单配置项。
 */
export interface FormConfig {
  /** 表单布局方式 */
  layout?: 'horizontal' | 'vertical' | 'inline';
  /** 标签宽度 (如 100, '120px') */
  labelWidth?: number | string;
  /** 标签对齐位置 */
  labelPosition?: 'left' | 'right' | 'top';
  /** 尺寸规格 */
  size?: 'large' | 'default' | 'small';
  /** 全局只读开关 */
  readonly?: boolean;
  /** 全局禁用开关 */
  disabled?: boolean;
  /** 是否显示标签冒号 */
  colon?: boolean;
  /** 校验失败时是否自动滚动到首个错误项 */
  scrollToError?: boolean;
}

/**
 * 三段式表单专用 AST Schema 实体。
 */
export interface FormSchema {
  /** 协议版本号，当前锁定 '1.0' */
  version: '1.0';
  /** 全局表单配置 */
  formConfig: FormConfig;
  /** 根控件节点列表 */
  widgetList: FormWidget[];
  /** 表单唯一标识（可选） */
  id?: string;
  /** 表单标题（可选） */
  title?: string;
  /** 表单描述信息（可选） */
  description?: string;
  /** 根控件节点别名兼容字段 */
  widgets?: FormWidget[];
}

/**
 * 控件分类枚举。
 */
export type FormWidgetCategory = 'basic' | 'advanced' | 'layout' | 'collection';

/**
 * 控件渲染上下文入参。
 */
export interface WidgetRenderContext {
  /** 控件定义元数据 */
  widget: FormWidget;
  /** 当前绑定的字段值 */
  modelValue: unknown;
  /** 更新当前字段值的回调 */
  'onUpdate:modelValue': (val: unknown) => void;
  /** 完整表单数据只读快照 */
  formData: Record<string, unknown>;
  /** 最终生效的禁用状态 */
  disabled: boolean;
  /** 最终生效的只读状态 */
  readonly: boolean;
  /** 尺寸规格 */
  size: 'large' | 'default' | 'small';
}

/**
 * 控件适配器标准接口规约 (SPI)。
 */
export interface FormWidgetAdapter {
  /** 控件唯一类型标识 */
  type: string;
  /** 控件中文展示名称 */
  label: string;
  /** 控件图标 (SVG 字符或类名) */
  icon?: string;
  /** 所属物料分类 */
  category: FormWidgetCategory;
  /** 是否为排版容器 */
  isContainer?: boolean;
  /** 是否为数据集合容器 */
  isCollection?: boolean;
  /** 默认初始 props */
  defaultProps?: Record<string, unknown>;
  /** 默认初始值 */
  defaultValue?: unknown;
  /** 控件自身属性配置面板的自描述 Schema */
  propsConfigSchema?: FormSchema;
  /** 控件渲染组件或渲染函数 */
  component: Component;
}

/**
 * 表单校验错误详情字典。键为 modelKey，值为错误文案。
 */
export type FormValidationErrors = Record<string, string>;

/**
 * 表单运行态状态机实例。
 */
export interface FormRendererInstance {
  /** 获取当前表单全量数据副本 */
  getFormData: () => Record<string, unknown>;
  /** 批量重置或设定表单数据 */
  setFormData: (data: Record<string, unknown>) => void;
  /** 获取特定路径字段的值 */
  getFieldValue: (path: string) => unknown;
  /** 设置特定路径字段的值 */
  setFieldValue: (path: string, value: unknown) => void;
  /** 触发表单全量校验，返回是否通过及错误集 */
  validate: () => Promise<{ valid: boolean; errors: FormValidationErrors }>;
  /** 触发指定字段校验 */
  validateField: (path: string) => Promise<{ valid: boolean; error?: string }>;
  /** 清除全量或特定字段的校验错误状态 */
  clearValidate: (path?: string) => void;
  /** 重置表单所有字段至初始默认值并清除校验状态 */
  resetFields: () => void;
  /** 是否存在正在进行中的异步校验 */
  validating?: boolean;
  /** 正在进行异步校验的字段映射 */
  validatingFields?: Record<string, boolean>;
}

/**
 * 画板视口类型。
 * - pc: PC 宽屏 (100%)
 * - pad: 平板视口 (768px)
 * - mobile: 移动手机视口 (375px 真实手机壳仿真)
 */
export type ViewportType = 'pc' | 'pad' | 'mobile';

/**
 * 拖拽类型守卫判定结果。
 */
export interface DropValidationResult {
  /** 是否允许拖拽放置 */
  allowed: boolean;
  /** 拦截原因说明 */
  reason?: string;
}

/**
 * 物料面板图元条目。
 */
export interface StencilItem {
  /** 控件类型标识 */
  type: string;
  /** 控件中文展示名称 */
  label: string;
  /** 图标字符或 SVG 类名 */
  icon?: string;
  /** 所属分类 */
  category: FormWidgetCategory;
  /** 是否为排版容器 */
  isContainer?: boolean;
  /** 是否为数据集合明细容器 */
  isCollection?: boolean;
  /** 容器类型分类 */
  containerType?: ContainerType;
}

/**
 * FormHistoryStack 快照历史栈配置选项。
 */
export interface FormHistoryStackOptions {
  /** 最大快照步数上限，默认 30 */
  maxLimit?: number;
  /** 连续输入防抖合并延迟（毫秒），默认 300ms */
  debounceMs?: number;
  /** 快照变更回调 */
  onChange?: (snapshot: FormSchema, stack: { canUndo: boolean; canRedo: boolean }) => void;
}

/**
 * useFormDesigner 状态机配置选项。
 */
export interface UseFormDesignerOptions {
  /** 初始表单 Schema */
  initialSchema?: FormSchema;
  /** 最大快照历史步数，默认 30 */
  maxHistoryLimit?: number;
  /** 连续输入防抖合并延迟（毫秒），默认 300ms */
  debounceMs?: number;
  /** Schema 变更回调 */
  onSchemaChange?: (schema: FormSchema) => void;
  /** 选中节点变更回调 */
  onSelectWidget?: (widget: FormWidget | null) => void;
}

/**
 * useFormDesigner 响应式设计态状态机返回值。
 */
export interface UseFormDesignerReturn {
  /** 响应式 FormSchema 实体 */
  schema: import('vue').Ref<FormSchema>;
  /** 当前活动选中控件的唯一标识 */
  activeWidgetId: import('vue').Ref<string | null>;
  /** 当前活动选中控件实体 */
  activeWidget: import('vue').ComputedRef<FormWidget | null>;
  /** 当前活动控件的父级容器实体 */
  activeParentWidget: import('vue').ComputedRef<FormWidget | null>;
  /** 画板视口类型 */
  viewport: import('vue').Ref<ViewportType>;
  /** 是否允许撤销 */
  canUndo: import('vue').ComputedRef<boolean>;
  /** 是否允许重做 */
  canRedo: import('vue').ComputedRef<boolean>;
  /** 选中指定控件 */
  selectWidget: (id: string | null) => void;
  /** 快速选择当前选中节点的父级容器 */
  selectParentWidget: () => void;
  /** 向目标容器添加新控件 */
  addWidget: (widget: FormWidget, targetParentId?: string | null, targetIndex?: number) => boolean;
  /** 移除指定控件 */
  removeWidget: (id: string) => boolean;
  /** 跨容器或同级移动控件 */
  moveWidget: (sourceId: string, targetParentId: string | null, targetIndex: number) => boolean;
  /** 局部更新指定控件属性 (支持 debounced 防抖合并) */
  updateWidget: (id: string, patch: Partial<FormWidget>, debounced?: boolean) => boolean;
  /** 复制指定控件并赋予全新唯一标识 */
  copyWidget: (id: string) => FormWidget | null;
  /** 清空画布中所有控件 */
  clearWidgets: () => void;
  /** 撤销一步历史变更 */
  undo: () => void;
  /** 重做一步历史变更 */
  redo: () => void;
  /** 切换画布视口规格 */
  setViewport: (viewport: ViewportType) => void;
  /** 导出当前 Schema 纯深拷贝副本 */
  exportSchema: () => FormSchema;
  /** 覆盖替换当前 Schema 结构并记录快照 */
  setSchema: (newSchema: FormSchema) => void;
  /** 校验拖拽放置合法性（类型守卫） */
  validateDrop: (
    source:
      | FormWidget
      | {
          id?: string;
          type: string;
          isContainer?: boolean;
          isCollection?: boolean;
          containerType?: ContainerType;
        },
    targetParentId: string | null,
  ) => DropValidationResult;
}

/**
 * AtengFormDesigner 顶层设计器组件暴露的实例接口。
 */
export interface FormDesignerInstance {
  /** 获取当前 Schema 副本 */
  getSchema: () => FormSchema;
  /** 导入设定新 Schema */
  setSchema: (schema: FormSchema) => void;
  /** 获取当前选中的控件实体 */
  getActiveWidget: () => FormWidget | null;
  /** 选中指定控件 */
  selectWidget: (id: string | null) => void;
  /** 清空画布控件 */
  clearWidgets: () => void;
  /** 撤销 */
  undo: () => void;
  /** 重做 */
  redo: () => void;
  /** 导出当前 Schema */
  exportSchema: () => FormSchema;
  /** 切换视口 */
  setViewport: (viewport: ViewportType) => void;
}

/**
 * 草稿箱数据持久化记录结构。
 */
export interface DraftRecord<T = Record<string, unknown>> {
  /** 表单或业务专属草稿键 */
  key: string;
  /** 填报数据实体 */
  data: T;
  /** 时间戳毫秒数 */
  timestamp: number;
  /** ISO 格式更新时间字符串 */
  updatedAt: string;
  /** 表单 Schema 版本或唯一标识 */
  schemaVersion?: string;
}

/**
 * DraftManager 本地草稿箱容灾管理器配置选项。
 */
export interface DraftManagerOptions {
  /** 本地存储 Key 前缀，默认 '@atengk/form-draft:' */
  prefix?: string;
  /** 静默落盘防抖延迟（毫秒），默认 500ms */
  debounceMs?: number;
  /** 最大有效期（毫秒），默认无限制 */
  maxAgeMs?: number;
  /** 成功持久化落盘回调 */
  onSave?: (record: DraftRecord) => void;
  /** 读写异常回调（如 QuotaExceeded 等） */
  onError?: (error: Error) => void;
}

/**
 * 代码生成器目标编译模式枚举。
 * - sfc: 独立完整 Vue 3 SFC 单文件组件代码
 * - ast: FormSchema 结构化 AST JSON 字符串
 * - json-schema: 符合 JSON Schema Draft-07 规范协议
 * - mock: 真实填报语义 Mock 虚假数据对象
 */
export type CodeGeneratorTarget = 'sfc' | 'ast' | 'json-schema' | 'mock';

/**
 * Vue 3 SFC 单文件代码生成编译选项。
 */
export interface VueSfcGenOptions {
  /** 生成的 SFC 组件名称，默认 'DynamicForm' */
  componentName?: string;
  /** 是否生成内置 <style scoped> 样式，默认 true */
  includeStyles?: boolean;
  /** 是否附带默认 Mock 数据初始值，默认 true */
  includeMockData?: boolean;
  /** 是否使用 TypeScript (<script setup lang="ts">)，默认 true */
  typescript?: boolean;
}

/**
 * JSON Schema Draft-07 属性规范契约。
 */
export interface StandardJsonSchemaProperty {
  /** 属性基础类型 */
  type: string;
  /** 标题或显示名称 */
  title?: string;
  /** 描述信息 */
  description?: string;
  /** 字符串最小长度 */
  minLength?: number;
  /** 字符串最大长度 */
  maxLength?: number;
  /** 数值最小值 */
  minimum?: number;
  /** 数值最大值 */
  maximum?: number;
  /** 正则表达式校验规则 */
  pattern?: string;
  /** 格式（如 'email', 'uri', 'date', 'date-time' 等） */
  format?: string;
  /** 数组项模式（SubForm 或多选场景） */
  items?: StandardJsonSchemaProperty | StandardJsonSchema;
  /** 对象内部属性定义 */
  properties?: Record<string, StandardJsonSchemaProperty>;
  /** 必填属性字段集合 */
  required?: string[];
  /** 枚举候选项 */
  enum?: unknown[];
  /** 默认初始值 */
  default?: unknown;
}

/**
 * 标准 JSON Schema Draft-07 根协议对象。
 */
export interface StandardJsonSchema {
  /** 遵循的标准规范 URL */
  $schema?: string;
  /** 根类型，固定为 'object' */
  type: 'object';
  /** 表单标题 */
  title?: string;
  /** 表单描述 */
  description?: string;
  /** 顶层属性字典 */
  properties: Record<string, StandardJsonSchemaProperty>;
  /** 顶层必填属性集合 */
  required?: string[];
}
