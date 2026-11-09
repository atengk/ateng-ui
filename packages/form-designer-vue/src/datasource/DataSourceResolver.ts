/**
 * DataSourceResolver 远程数据源动态解析与请求协调器。
 *
 * 遵循 ADR-0010（Result 对齐）、ADR-0013（AbortSignal 竞态丢弃）与 ADR-0044 规约：
 * 负责模板变量插值计算、上游级联就绪校验、异步时序取消与字段名标准化映射。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { getByPath } from '../utils/path';
import type { DataSourceConfig, DataSourceFieldMapping, DataSourceOption } from './types';

/**
 * 数据源动态解析与协调器。
 */
export class DataSourceResolver {
  /**
   * 解析字符串中的 {{ variable }} 或 {{ formData.variable }} 动态变量占位符。
   */
  public static resolveTemplate(template: string, formData: Record<string, unknown>): string {
    if (!template || typeof template !== 'string') {
      return '';
    }
    return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, expression: string) => {
      const cleanPath = expression.startsWith('formData.') ? expression.slice(9) : expression;
      const val = getByPath(formData, cleanPath);
      if (val === undefined || val === null) {
        return '';
      }
      return String(val);
    });
  }

  /**
   * 递归解析参数对象中的模板变量。
   */
  public static resolveParams(
    params: Record<string, unknown> | undefined,
    formData: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!params || typeof params !== 'object') {
      return {};
    }
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(params)) {
      if (typeof val === 'string') {
        // 如果是纯变量占位符，且表单中包含非字符串类型（如 number / boolean），保留原生类型
        const directMatch = val.match(/^\{\{\s*([\w.-]+)\s*\}\}$/);
        if (directMatch && directMatch[1]) {
          const cleanPath = directMatch[1].startsWith('formData.')
            ? directMatch[1].slice(9)
            : directMatch[1];
          result[key] = getByPath(formData, cleanPath);
        } else {
          result[key] = this.resolveTemplate(val, formData);
        }
      } else {
        result[key] = val;
      }
    }
    return result;
  }

  /**
   * 检查所有声明的上游依赖字段是否均已就绪（非空有效）。
   */
  public static isDependenciesReady(
    dependencies: string[] | undefined,
    formData: Record<string, unknown>,
  ): boolean {
    if (!dependencies || dependencies.length === 0) {
      return true;
    }
    return dependencies.every(depKey => {
      const cleanKey = depKey.startsWith('formData.') ? depKey.slice(9) : depKey;
      const val = getByPath(formData, cleanKey);
      return val !== undefined && val !== null && val !== '';
    });
  }

  /**
   * 将原始数组项根据字段映射标准化为 DataSourceOption。
   */
  public static mapRawOptions(
    rawItems: unknown[],
    mapping?: DataSourceFieldMapping,
  ): DataSourceOption[] {
    if (!Array.isArray(rawItems)) {
      return [];
    }

    const labelKey = mapping?.label || 'label';
    const valueKey = mapping?.value || 'value';
    const childrenKey = mapping?.children || 'children';
    const disabledKey = mapping?.disabled || 'disabled';

    return rawItems
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map(item => {
        const option: DataSourceOption = {
          label: String(item[labelKey] ?? item.name ?? item.title ?? ''),
          value: item[valueKey] ?? item.id ?? item.code,
          disabled: Boolean(item[disabledKey]),
          raw: item,
        };

        const children = item[childrenKey];
        if (Array.isArray(children) && children.length > 0) {
          option.children = this.mapRawOptions(children, mapping);
        }

        return option;
      });
  }

  /**
   * 异步加载选项数据（集成依赖校验、时序取消与空安全保底返回）。
   */
  public static async fetchOptions(
    config: DataSourceConfig,
    formData: Record<string, unknown> = {},
    signal?: AbortSignal,
  ): Promise<DataSourceOption[]> {
    if (!config) {
      return [];
    }

    // 1. 静态数据源
    if (config.type === 'static') {
      return config.staticOptions || [];
    }

    // 2. 检查依赖项是否就绪，若上游未选则不发起请求并保底返回空数组
    if (!this.isDependenciesReady(config.dependencies, formData)) {
      return [];
    }

    // 3. 自定义加载器优先
    if (typeof config.loader === 'function') {
      try {
        const result = await config.loader(config, formData, signal);
        return Array.isArray(result) ? result : [];
      } catch {
        if (signal?.aborted) {
          return [];
        }
        return [];
      }
    }

    // 4. 原生远程 API 请求
    if (config.url && typeof window !== 'undefined' && typeof window.fetch === 'function') {
      try {
        const resolvedUrl = this.resolveTemplate(config.url, formData);
        const resolvedParams = this.resolveParams(config.params, formData);

        let finalUrl = resolvedUrl;
        const queryEntries = Object.entries(resolvedParams).filter(
          ([, v]) => v !== undefined && v !== null && v !== '',
        );

        if (queryEntries.length > 0) {
          const queryString = queryEntries
            .map(
              ([k, v]) =>
                `${encodeURIComponent(k)}=${encodeURIComponent(typeof v === 'object' ? JSON.stringify(v) : String(v))}`,
            )
            .join('&');
          finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryString;
        }

        const isPost = config.method === 'POST';
        const requestInit: RequestInit = {
          method: config.method || 'GET',
          signal,
          headers: {
            Accept: 'application/json',
            ...(isPost ? { 'Content-Type': 'application/json' } : {}),
          },
        };

        if (isPost && config.body) {
          const resolvedBody = this.resolveParams(config.body, formData);
          requestInit.body = JSON.stringify(resolvedBody);
        }

        const response = await fetch(finalUrl, requestInit);
        if (!response.ok) {
          return [];
        }

        const data: unknown = await response.json();

        // 解包对齐后端 Result<T> 规范 (ADR-0010)
        let rawList: unknown[] = [];
        if (Array.isArray(data)) {
          rawList = data;
        } else if (
          typeof data === 'object' &&
          data !== null &&
          'data' in data &&
          Array.isArray((data as { data: unknown }).data)
        ) {
          rawList = (data as { data: unknown[] }).data;
        }

        return this.mapRawOptions(rawList, config.fieldMapping);
      } catch {
        // 请求失败或被 Abort 中断时静默安全返回空数组
        return [];
      }
    }

    return [];
  }
}
