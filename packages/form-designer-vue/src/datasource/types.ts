/**
 * @atengk/form-designer-vue 远程数据源与动态字典类型定义。
 *
 * 遵循 ADR-0044 规约，标准化静态选项、异步远程 API 与系统字典驱动契约。
 *
 * @author Ateng
 * @since 2026-11-09
 */

/**
 * 远程数据源字段名映射契约。
 */
export interface DataSourceFieldMapping {
  /** 选项展示文本属性名，默认 'label' */
  label?: string;
  /** 选项绑定值属性名，默认 'value' */
  value?: string;
  /** 子节点列表属性名（级联或树形结构），默认 'children' */
  children?: string;
  /** 禁用状态属性名，默认 'disabled' */
  disabled?: string;
}

/**
 * 标准选项结构。
 */
export interface DataSourceOption {
  label: string;
  value: unknown;
  disabled?: boolean;
  children?: DataSourceOption[];
  raw?: unknown;
}

/**
 * 远程数据源配置契约。
 */
export interface DataSourceConfig {
  /** 数据源模式：static 静态配置，api 远程 HTTP，dict 全局字典服务 */
  type: 'static' | 'api' | 'dict';
  /** 远程请求 URL，支持模板变量插值，如 '/api/city?provinceId={{ provinceId }}' */
  url?: string;
  /** 请求方法，默认 'GET' */
  method?: 'GET' | 'POST';
  /** 请求参数键值对，支持模板变量插值，如 { deptId: '{{ deptId }}' } */
  params?: Record<string, unknown>;
  /** POST 请求载荷数据，支持模板变量插值 */
  body?: Record<string, unknown>;
  /** 字段名映射 */
  fieldMapping?: DataSourceFieldMapping;
  /** 依赖的上游表单字段键名列表，依赖字段变化时自动清空当前字段并重新拉取 */
  dependencies?: string[];
  /** 静态选项备选数据 (当 type === 'static' 时有效) */
  staticOptions?: DataSourceOption[];
  /** 字典编码标识 (当 type === 'dict' 时有效) */
  dictCode?: string;
  /** 自定义异步拉取加载器 */
  loader?: (
    config: DataSourceConfig,
    formData: Record<string, unknown>,
    signal?: AbortSignal,
  ) => Promise<DataSourceOption[]>;
}
