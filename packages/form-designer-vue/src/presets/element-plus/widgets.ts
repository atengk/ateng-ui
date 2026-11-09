/**
 * Element Plus 官方标准表单控件适配器集合。
 *
 * 遵循 ADR-0005、ADR-0006 与 ADR-0044 规约：
 * 覆盖 15 种 Element Plus 高频表单控件，集成 DataSource 远程数据源异步驱动与双模组件规约 (component + render)。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { h, ref, defineComponent } from 'vue';
import type { Component, VNode } from 'vue';
import {
  ElInput,
  ElInputNumber,
  ElSelect,
  ElOption,
  ElRadioGroup,
  ElRadio,
  ElCheckbox,
  ElCheckboxGroup,
  ElSwitch,
  ElDatePicker,
  ElTimePicker,
  ElRate,
  ElSlider,
  ElColorPicker,
  ElCascader,
  ElTransfer,
} from 'element-plus';
import type { FormWidgetAdapter, WidgetRenderContext, FormWidget } from '../../types';
import { DataSourceResolver, type DataSourceConfig, type DataSourceOption } from '../../datasource';

/**
 * 缓存数据源动态选项的响应式 Map。
 */
const dynamicOptionsCache = new Map<string, ReturnType<typeof ref<DataSourceOption[]>>>();

/**
 * 获取或创建对应控件的动态选项 Ref。
 */
function useDynamicOptions(widgetId: string, initialOptions?: DataSourceOption[]) {
  let optionsRef = dynamicOptionsCache.get(widgetId);
  if (!optionsRef) {
    optionsRef = ref<DataSourceOption[]>(initialOptions || []);
    dynamicOptionsCache.set(widgetId, optionsRef);
  }
  return optionsRef;
}

/**
 * 异步同步数据源选项。
 */
function syncDataSource(
  ctx: WidgetRenderContext,
  optionsRef: ReturnType<typeof ref<DataSourceOption[]>>,
) {
  const ds = ctx.widget.props?.dataSource as DataSourceConfig | undefined;
  if (!ds) {
    const staticOpts = (ctx.widget.props?.options as DataSourceOption[]) || [];
    if (staticOpts.length > 0) {
      optionsRef.value = staticOpts;
    }
    return;
  }

  // 依赖检测与异步拉取
  if (ds.dependencies && ds.dependencies.length > 0) {
    const controller = new AbortController();
    DataSourceResolver.fetchOptions(ds, ctx.formData, controller.signal).then(opts => {
      optionsRef.value = opts || [];
    });
  } else if (!optionsRef.value || optionsRef.value.length === 0) {
    DataSourceResolver.fetchOptions(ds, ctx.formData).then(opts => {
      optionsRef.value = opts || [];
    });
  }
}

/**
 * 创建适配器包裹组件，将模板中的 component 调用桥接至 render 渲染函数。
 */
function createAdapterComponent(renderFn: (ctx: WidgetRenderContext) => VNode): Component {
  return defineComponent({
    name: 'ElWidgetAdapterWrapper',
    props: {
      widget: { type: Object, required: true },
      modelValue: { type: null, default: undefined },
      disabled: { type: Boolean, default: false },
      readonly: { type: Boolean, default: false },
      size: { type: String, default: 'default' },
    },
    emits: ['update:modelValue', 'blur'],
    setup(props, { emit }) {
      return () => {
        const ctx: WidgetRenderContext = {
          widget: props.widget as FormWidget,
          modelValue: props.modelValue,
          'onUpdate:modelValue': (val: unknown) => emit('update:modelValue', val),
          formData: {},
          disabled: props.disabled,
          readonly: props.readonly,
          size: props.size as 'large' | 'default' | 'small',
        };
        return renderFn(ctx);
      };
    },
  });
}

// 1. 单行文本 ElInput
const renderInput = (ctx: WidgetRenderContext): VNode =>
  h(ElInput, {
    modelValue: (ctx.modelValue as string) ?? '',
    'onUpdate:modelValue': ctx['onUpdate:modelValue'],
    disabled: ctx.disabled || ctx.readonly,
    placeholder: (ctx.widget.props?.placeholder as string) ?? '请输入',
    clearable: (ctx.widget.props?.clearable as boolean) ?? true,
    showPassword: Boolean(ctx.widget.props?.showPassword),
    maxlength: ctx.widget.props?.maxlength as number,
  });

export const elInputAdapter: FormWidgetAdapter = {
  type: 'el-input',
  label: '单行文本',
  category: 'basic',
  icon: 'Text',
  render: renderInput,
  component: createAdapterComponent(renderInput),
};

// 2. 多行文本 ElInput (textarea)
const renderTextarea = (ctx: WidgetRenderContext): VNode =>
  h(ElInput, {
    type: 'textarea',
    modelValue: (ctx.modelValue as string) ?? '',
    'onUpdate:modelValue': ctx['onUpdate:modelValue'],
    disabled: ctx.disabled || ctx.readonly,
    placeholder: (ctx.widget.props?.placeholder as string) ?? '请输入描述',
    rows: (ctx.widget.props?.rows as number) ?? 3,
    maxlength: ctx.widget.props?.maxlength as number,
    showWordLimit: Boolean(ctx.widget.props?.showWordLimit),
  });

export const elTextareaAdapter: FormWidgetAdapter = {
  type: 'el-textarea',
  label: '多行文本',
  category: 'basic',
  icon: 'Document',
  render: renderTextarea,
  component: createAdapterComponent(renderTextarea),
};

// 3. 数字计数器 ElInputNumber
const renderInputNumber = (ctx: WidgetRenderContext): VNode =>
  h(ElInputNumber, {
    modelValue: ctx.modelValue as number,
    'onUpdate:modelValue': ctx['onUpdate:modelValue'],
    disabled: ctx.disabled || ctx.readonly,
    min: ctx.widget.props?.min as number,
    max: ctx.widget.props?.max as number,
    step: (ctx.widget.props?.step as number) ?? 1,
    precision: ctx.widget.props?.precision as number,
  });

export const elInputNumberAdapter: FormWidgetAdapter = {
  type: 'el-input-number',
  label: '数字计数器',
  category: 'basic',
  icon: 'Edit',
  render: renderInputNumber,
  component: createAdapterComponent(renderInputNumber),
};

// 4. 下拉选择器 ElSelect
const renderSelect = (ctx: WidgetRenderContext): VNode => {
  const staticOptions = (ctx.widget.props?.options as DataSourceOption[]) || [];
  const optionsRef = useDynamicOptions(ctx.widget.id, staticOptions);
  syncDataSource(ctx, optionsRef);

  const opts = optionsRef.value || [];
  return h(
    ElSelect as unknown as Component,
    {
      modelValue: ctx.modelValue,
      'onUpdate:modelValue': ctx['onUpdate:modelValue'],
      disabled: ctx.disabled || ctx.readonly,
      placeholder: (ctx.widget.props?.placeholder as string) ?? '请选择',
      clearable: (ctx.widget.props?.clearable as boolean) ?? true,
      multiple: Boolean(ctx.widget.props?.multiple),
      filterable: (ctx.widget.props?.filterable as boolean) ?? true,
    },
    () =>
      opts.map(opt =>
        h(ElOption, {
          key: String(opt.value),
          label: opt.label,
          value: opt.value as string | number | boolean | object,
          disabled: opt.disabled,
        }),
      ),
  );
};

export const elSelectAdapter: FormWidgetAdapter = {
  type: 'el-select',
  label: '下拉选择',
  category: 'basic',
  icon: 'Select',
  render: renderSelect,
  component: createAdapterComponent(renderSelect),
};

// 5. 单选框组 ElRadioGroup
const renderRadio = (ctx: WidgetRenderContext): VNode => {
  const staticOptions = (ctx.widget.props?.options as DataSourceOption[]) || [];
  const optionsRef = useDynamicOptions(ctx.widget.id, staticOptions);
  syncDataSource(ctx, optionsRef);

  const opts = optionsRef.value || [];
  return h(
    ElRadioGroup,
    {
      modelValue: ctx.modelValue as string | number | boolean | undefined,
      'onUpdate:modelValue': ctx['onUpdate:modelValue'],
      disabled: ctx.disabled || ctx.readonly,
    },
    () =>
      opts.map(opt =>
        h(
          ElRadio,
          {
            key: String(opt.value),
            value: opt.value as string | number | boolean | undefined,
            disabled: opt.disabled,
          },
          () => opt.label,
        ),
      ),
  );
};

export const elRadioAdapter: FormWidgetAdapter = {
  type: 'el-radio',
  label: '单选按钮组',
  category: 'basic',
  icon: 'CircleCheck',
  render: renderRadio,
  component: createAdapterComponent(renderRadio),
};

// 6. 单个复选框 ElCheckbox
const renderCheckbox = (ctx: WidgetRenderContext): VNode =>
  h(
    ElCheckbox,
    {
      modelValue: Boolean(ctx.modelValue),
      'onUpdate:modelValue': ctx['onUpdate:modelValue'],
      disabled: ctx.disabled || ctx.readonly,
    },
    () => (ctx.widget.props?.content as string) || ctx.widget.label || '同意并确认',
  );

export const elCheckboxAdapter: FormWidgetAdapter = {
  type: 'el-checkbox',
  label: '独立复选框',
  category: 'basic',
  icon: 'Select',
  render: renderCheckbox,
  component: createAdapterComponent(renderCheckbox),
};

// 7. 多选复选框组 ElCheckboxGroup
const renderCheckboxGroup = (ctx: WidgetRenderContext): VNode => {
  const staticOptions = (ctx.widget.props?.options as DataSourceOption[]) || [];
  const optionsRef = useDynamicOptions(ctx.widget.id, staticOptions);
  syncDataSource(ctx, optionsRef);

  const opts = optionsRef.value || [];
  return h(
    ElCheckboxGroup,
    {
      modelValue: (ctx.modelValue as (string | number)[]) || [],
      'onUpdate:modelValue': ctx['onUpdate:modelValue'],
      disabled: ctx.disabled || ctx.readonly,
    },
    () =>
      opts.map(opt =>
        h(
          ElCheckbox,
          {
            key: String(opt.value),
            value: opt.value as string | number | boolean | undefined,
            disabled: opt.disabled,
          },
          () => opt.label,
        ),
      ),
  );
};

export const elCheckboxGroupAdapter: FormWidgetAdapter = {
  type: 'el-checkbox-group',
  label: '多选复选框组',
  category: 'basic',
  icon: 'Finished',
  render: renderCheckboxGroup,
  component: createAdapterComponent(renderCheckboxGroup),
};

// 8. 开关 ElSwitch
const renderSwitch = (ctx: WidgetRenderContext): VNode =>
  h(ElSwitch, {
    modelValue: Boolean(ctx.modelValue),
    'onUpdate:modelValue': ctx['onUpdate:modelValue'],
    disabled: ctx.disabled || ctx.readonly,
    activeText: ctx.widget.props?.activeText as string,
    inactiveText: ctx.widget.props?.inactiveText as string,
  });

export const elSwitchAdapter: FormWidgetAdapter = {
  type: 'el-switch',
  label: '开关',
  category: 'basic',
  icon: 'Open',
  render: renderSwitch,
  component: createAdapterComponent(renderSwitch),
};

// 9. 日期选择器 ElDatePicker
const renderDatePicker = (ctx: WidgetRenderContext): VNode =>
  h(ElDatePicker, {
    modelValue: ctx.modelValue as string,
    'onUpdate:modelValue': ctx['onUpdate:modelValue'],
    disabled: ctx.disabled || ctx.readonly,
    type: ((ctx.widget.props?.dateType as string) || 'date') as 'date' | 'daterange' | 'datetime',
    valueFormat: (ctx.widget.props?.valueFormat as string) || 'YYYY-MM-DD',
    placeholder: (ctx.widget.props?.placeholder as string) || '请选择日期',
  });

export const elDatePickerAdapter: FormWidgetAdapter = {
  type: 'el-date-picker',
  label: '日期选择',
  category: 'basic',
  icon: 'Calendar',
  render: renderDatePicker,
  component: createAdapterComponent(renderDatePicker),
};

// 10. 时间选择器 ElTimePicker
const renderTimePicker = (ctx: WidgetRenderContext): VNode =>
  h(ElTimePicker, {
    modelValue: ctx.modelValue as string,
    'onUpdate:modelValue': ctx['onUpdate:modelValue'],
    disabled: ctx.disabled || ctx.readonly,
    valueFormat: (ctx.widget.props?.valueFormat as string) || 'HH:mm:ss',
    placeholder: (ctx.widget.props?.placeholder as string) || '请选择时间',
  });

export const elTimePickerAdapter: FormWidgetAdapter = {
  type: 'el-time-picker',
  label: '时间选择',
  category: 'basic',
  icon: 'Clock',
  render: renderTimePicker,
  component: createAdapterComponent(renderTimePicker),
};

// 11. 评分 ElRate
const renderRate = (ctx: WidgetRenderContext): VNode =>
  h(ElRate, {
    modelValue: Number(ctx.modelValue) || 0,
    'onUpdate:modelValue': ctx['onUpdate:modelValue'],
    disabled: ctx.disabled || ctx.readonly,
    allowHalf: Boolean(ctx.widget.props?.allowHalf),
    showScore: Boolean(ctx.widget.props?.showScore),
  });

export const elRateAdapter: FormWidgetAdapter = {
  type: 'el-rate',
  label: '评分星级',
  category: 'advanced',
  icon: 'Star',
  render: renderRate,
  component: createAdapterComponent(renderRate),
};

// 12. 滑块 ElSlider
const renderSlider = (ctx: WidgetRenderContext): VNode =>
  h(ElSlider, {
    modelValue: (ctx.modelValue as number) || 0,
    'onUpdate:modelValue': ctx['onUpdate:modelValue'],
    disabled: ctx.disabled || ctx.readonly,
    min: (ctx.widget.props?.min as number) || 0,
    max: (ctx.widget.props?.max as number) || 100,
    step: (ctx.widget.props?.step as number) || 1,
  });

export const elSliderAdapter: FormWidgetAdapter = {
  type: 'el-slider',
  label: '滑动条',
  category: 'advanced',
  icon: 'Operation',
  render: renderSlider,
  component: createAdapterComponent(renderSlider),
};

// 13. 颜色选择器 ElColorPicker
const renderColorPicker = (ctx: WidgetRenderContext): VNode =>
  h(ElColorPicker, {
    modelValue: (ctx.modelValue as string) || '',
    'onUpdate:modelValue': ctx['onUpdate:modelValue'],
    disabled: ctx.disabled || ctx.readonly,
    showAlpha: Boolean(ctx.widget.props?.showAlpha),
  });

export const elColorPickerAdapter: FormWidgetAdapter = {
  type: 'el-color-picker',
  label: '颜色选择',
  category: 'advanced',
  icon: 'Brush',
  render: renderColorPicker,
  component: createAdapterComponent(renderColorPicker),
};

// 14. 级联选择器 ElCascader
const renderCascader = (ctx: WidgetRenderContext): VNode => {
  const staticOptions = (ctx.widget.props?.options as DataSourceOption[]) || [];
  const optionsRef = useDynamicOptions(ctx.widget.id, staticOptions);
  syncDataSource(ctx, optionsRef);

  return h(ElCascader, {
    modelValue: (ctx.modelValue as string[]) || [],
    'onUpdate:modelValue': ctx['onUpdate:modelValue'],
    disabled: ctx.disabled || ctx.readonly,
    options: (optionsRef.value || []) as unknown as import('element-plus').CascaderOption[],
    placeholder: (ctx.widget.props?.placeholder as string) || '请选择层级',
    clearable: (ctx.widget.props?.clearable as boolean) ?? true,
  });
};

export const elCascaderAdapter: FormWidgetAdapter = {
  type: 'el-cascader',
  label: '级联选择',
  category: 'advanced',
  icon: 'Share',
  render: renderCascader,
  component: createAdapterComponent(renderCascader),
};

// 15. 穿梭框 ElTransfer
const renderTransfer = (ctx: WidgetRenderContext): VNode => {
  const staticOptions = (ctx.widget.props?.options as DataSourceOption[]) || [];
  const optionsRef = useDynamicOptions(ctx.widget.id, staticOptions);
  syncDataSource(ctx, optionsRef);

  const transferData = (optionsRef.value || []).map(opt => ({
    key: opt.value as string | number,
    label: opt.label,
    disabled: opt.disabled,
  }));

  return h(ElTransfer, {
    modelValue: (ctx.modelValue as (string | number)[]) || [],
    'onUpdate:modelValue': ctx['onUpdate:modelValue'],
    data: transferData,
    titles: (ctx.widget.props?.titles as [string, string]) || ['待选列表', '已选列表'],
  });
};

export const elTransferAdapter: FormWidgetAdapter = {
  type: 'el-transfer',
  label: '穿梭框',
  category: 'advanced',
  icon: 'Switch',
  render: renderTransfer,
  component: createAdapterComponent(renderTransfer),
};

/**
 * Element Plus 适配器列表。
 */
export const elementPlusAdapters: FormWidgetAdapter[] = [
  elInputAdapter,
  elTextareaAdapter,
  elInputNumberAdapter,
  elSelectAdapter,
  elRadioAdapter,
  elCheckboxAdapter,
  elCheckboxGroupAdapter,
  elSwitchAdapter,
  elDatePickerAdapter,
  elTimePickerAdapter,
  elRateAdapter,
  elSliderAdapter,
  elColorPickerAdapter,
  elCascaderAdapter,
  elTransferAdapter,
];
