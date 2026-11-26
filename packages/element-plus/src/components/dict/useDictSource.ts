/**
 * 字典数据源统一加载、同步缓存水合与并发抗竞态组合式逻辑。
 *
 * 1. setup 与数据源变更阶段优先同步读取 DictManager.getCache(dictCode)，消除缓存命中场景下的微任务 DOM 闪烁；
 * 2. 维护严谨的请求序号（latestRequestSeq）与卸载保护，丢弃过期异步响应，防止切换 dictCode 时状态回写污染；
 * 3. 显式区分「当前数据源尚未就绪（!hasSettled）」与「已加载结束（含空数组或异常兜底）」。
 *
 * @author Ateng
 * @since 2026-11-26
 */

import { ref, shallowRef, computed, watch, onMounted, onScopeDispose } from 'vue';
import type { DictFieldNames, DictItem, DictLoader } from './types';
import { DictManager } from './DictManager';
import { normalizeDictItems } from './utils';

/**
 * 字典套件组件共享的数据源 Props 子集。
 */
export interface DictSourceProps {
  dictCode?: string;
  loader?: DictLoader;
  options?: DictItem[] | Record<string, unknown>[];
  fieldNames?: DictFieldNames;
  labelField?: string;
  valueField?: string;
  tagTypeField?: string;
  disabledField?: string;
  autoLoad?: boolean;
}

/**
 * 管理字典组件数据源的同步缓存水合、异步拉取与抗竞态状态。
 *
 * @param props 字典组件的响应式 Props 对象
 */
export function useDictSource(props: DictSourceProps) {
  const internalItems = shallowRef<unknown[]>([]);
  const internalLoading = ref(false);
  const hasSettled = ref(false);

  let latestRequestSeq = 0;
  let pendingFetchStarted = false;
  let isDisposed = false;

  onScopeDispose(() => {
    isDisposed = true;
    latestRequestSeq += 1;
  });

  const hasStaticOptions = computed<boolean>(
    () => Array.isArray(props.options) && props.options.length > 0,
  );

  const hasAsyncSource = computed<boolean>(
    () => Boolean(props.dictCode) || typeof props.loader === 'function',
  );

  const rawItems = computed<unknown[]>(() => {
    if (hasStaticOptions.value) {
      return props.options as unknown[];
    }
    return internalItems.value;
  });

  const effectiveItems = computed<DictItem[]>(() => {
    return normalizeDictItems(rawItems.value, {
      fieldNames: props.fieldNames,
      labelField: props.labelField,
      valueField: props.valueField,
      tagTypeField: props.tagTypeField,
      disabledField: props.disabledField,
    });
  });

  /**
   * 从静态 options 或 DictManager 纯内存缓存中同步水合当前数据源。
   * 返回 true 表示当前源已同步就绪，无需在挂载期再发起异步请求。
   */
  function syncHydrate(): boolean {
    if (hasStaticOptions.value) {
      internalItems.value = props.options as unknown[];
      hasSettled.value = true;
      internalLoading.value = false;
      return true;
    }

    if (!hasAsyncSource.value) {
      internalItems.value = [];
      hasSettled.value = true;
      internalLoading.value = false;
      return true;
    }

    if (props.dictCode && DictManager.hasCache(props.dictCode)) {
      internalItems.value = DictManager.getCache(props.dictCode) ?? [];
      hasSettled.value = true;
      internalLoading.value = false;
      return true;
    }

    return false;
  }

  /**
   * 异步拉取或强制穿透刷新字典数据。
   *
   * @param force 是否跳过内存缓存强制刷新
   */
  async function fetchDictData(force: boolean = false): Promise<DictItem[]> {
    if (hasStaticOptions.value) {
      internalItems.value = props.options as unknown[];
      hasSettled.value = true;
      internalLoading.value = false;
      return effectiveItems.value;
    }

    if (!hasAsyncSource.value) {
      internalItems.value = [];
      hasSettled.value = true;
      internalLoading.value = false;
      return [];
    }

    if (!force && props.dictCode && DictManager.hasCache(props.dictCode)) {
      internalItems.value = DictManager.getCache(props.dictCode) ?? [];
      hasSettled.value = true;
      internalLoading.value = false;
      return effectiveItems.value;
    }

    const seq = ++latestRequestSeq;
    pendingFetchStarted = true;
    internalLoading.value = true;

    try {
      const items = await DictManager.loadDict(props.dictCode ?? '', props.loader, force);
      if (isDisposed || seq !== latestRequestSeq) {
        return effectiveItems.value;
      }
      internalItems.value = items;
      hasSettled.value = true;
      return effectiveItems.value;
    } finally {
      if (!isDisposed && seq === latestRequestSeq) {
        internalLoading.value = false;
      }
    }
  }

  async function refresh(): Promise<DictItem[]> {
    return fetchDictData(true);
  }

  /**
   * 尝试同步水合；若未命中缓存则清空旧选项并按 autoLoad 策略重新拉取。
   */
  function syncOrResetAndFetch(): void {
    const hydrated = syncHydrate();
    if (!hydrated) {
      internalItems.value = [];
      hasSettled.value = false;
      if (props.autoLoad !== false && hasAsyncSource.value) {
        void fetchDictData(false);
      } else {
        internalLoading.value = false;
      }
    }
  }

  /**
   * 在未完成初始加载且启用 autoLoad 时触发首轮水合或异步拉取。
   */
  function ensureInitialLoad(): void {
    if (
      props.autoLoad !== false &&
      !hasSettled.value &&
      !pendingFetchStarted &&
      !hasStaticOptions.value &&
      hasAsyncSource.value
    ) {
      const hydrated = syncHydrate();
      if (!hydrated) {
        void fetchDictData(false);
      }
    }
  }

  // 1. setup 阶段立即同步尝试水合缓存；冷缓存且启用 autoLoad 时同步标记加载态，避免首帧闪烁
  const initiallyHydrated = syncHydrate();
  if (!initiallyHydrated && props.autoLoad !== false && hasAsyncSource.value) {
    internalLoading.value = true;
  }

  // 2. 监听 dictCode 与 loader 切换：立即递增序号阻断旧请求并同步水合或重置清理
  watch([() => props.dictCode, () => props.loader], () => {
    latestRequestSeq += 1;
    pendingFetchStarted = false;
    syncOrResetAndFetch();
  });

  // 3. 监听静态 options 动态变更：优先使用非空 options，清空时安全回落至异步字典源
  watch(
    () => props.options,
    newOptions => {
      if (Array.isArray(newOptions) && newOptions.length > 0) {
        latestRequestSeq += 1;
        internalItems.value = newOptions;
        hasSettled.value = true;
        internalLoading.value = false;
        return;
      }

      if (!hasAsyncSource.value) {
        latestRequestSeq += 1;
        internalItems.value = [];
        hasSettled.value = true;
        internalLoading.value = false;
        return;
      }

      syncOrResetAndFetch();
    },
  );

  // 4. 监听 autoLoad 从 false 切换为 true 时按需补发加载
  watch(() => props.autoLoad, ensureInitialLoad);

  onMounted(ensureInitialLoad);

  return {
    effectiveItems,
    internalLoading,
    hasSettled,
    hasStaticOptions,
    hasAsyncSource,
    refresh,
  };
}
