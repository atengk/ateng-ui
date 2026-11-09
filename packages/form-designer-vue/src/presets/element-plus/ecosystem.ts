/**
 * 兄弟生态（Editor / CodeEditor / Signature / Upload）装配物料适配器。
 *
 * 遵循 ADR-0009（洋葱拓扑）与 ADR-0044 规约：
 * 弱耦合可拔插接入 @atengk/editor-vue、@atengk/code-editor-vue 与 Element Plus 高阶物料，
 * 并提供内置原生回退防卫，避免强依赖引起的跨包循环引用。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { h, getCurrentInstance, inject, defineComponent } from 'vue';
import type { Component, VNode, ComputedRef } from 'vue';
import { ElUpload } from 'element-plus';
import type { FormWidgetAdapter, WidgetRenderContext, FormWidget } from '../../types';
import AtengSignature from './components/AtengSignature.vue';

/**
 * 安全探测全局或自定义组件，避免 resolveComponent 在组件未注册时抛出控制台警告。
 */
function getGlobalOrCustomComponent(
  name: string,
  customComponent?: Component,
): Component | undefined {
  if (customComponent) return customComponent;
  const instance = getCurrentInstance();
  if (instance?.appContext?.components) {
    const comps = instance.appContext.components;
    if (comps[name]) return comps[name] as Component;
    const kebabName = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    if (comps[kebabName]) return comps[kebabName] as Component;
  }
  return undefined;
}

/**
 * 生态物料装配选项。
 */
export interface EcosystemWidgetsOptions {
  /** 自定义富文本组件 (如 @atengk/editor-vue 的 AtengEditor) */
  editorComponent?: Component;
  /** 自定义代码编辑组件 (如 @atengk/code-editor-vue 的 AtengCodeEditor) */
  codeEditorComponent?: Component;
  /** 自定义签名板组件 (默认使用内置 AtengSignature) */
  signatureComponent?: Component;
  /** 自定义切片文件上传组件 (如 @atengk/element-plus 的 AtengUpload) */
  uploadComponent?: Component;
}

/**
 * 创建适配器包裹组件。
 */
function createEcosystemAdapterComponent(renderFn: (ctx: WidgetRenderContext) => VNode): Component {
  return defineComponent({
    name: 'EcosystemWidgetAdapterWrapper',
    props: {
      widget: { type: Object, required: true },
      modelValue: { type: null, default: undefined },
      disabled: { type: Boolean, default: false },
      readonly: { type: Boolean, default: false },
      size: { type: String, default: 'default' },
      formData: { type: Object, default: undefined },
    },
    emits: ['update:modelValue', 'blur'],
    setup(props, { emit }) {
      const injectedFormData = inject<ComputedRef<Record<string, unknown>> | null>(
        'ateng_form_data',
        null,
      );

      return () => {
        const currentFormData =
          (props.formData as Record<string, unknown>) || injectedFormData?.value || {};
        const ctx: WidgetRenderContext = {
          widget: props.widget as FormWidget,
          modelValue: props.modelValue,
          'onUpdate:modelValue': (val: unknown) => emit('update:modelValue', val),
          formData: currentFormData,
          disabled: props.disabled,
          readonly: props.readonly,
          size: props.size as 'large' | 'default' | 'small',
        };
        return renderFn(ctx);
      };
    },
  });
}

/**
 * 创建富文本物料适配器。
 */
export function createEditorWidgetAdapter(customComponent?: Component): FormWidgetAdapter {
  const renderFn = (ctx: WidgetRenderContext): VNode => {
    const TargetComp = getGlobalOrCustomComponent('AtengEditor', customComponent);

    if (TargetComp) {
      return h(TargetComp, {
        modelValue: (ctx.modelValue as string) || '',
        'onUpdate:modelValue': ctx['onUpdate:modelValue'],
        disabled: ctx.disabled || ctx.readonly,
        placeholder: (ctx.widget.props?.placeholder as string) || '请输入富文本内容...',
      });
    }

    // 内置优雅兜底回退：轻量可编辑容器
    return h('div', {
      class: 'at-ecosystem-editor-fallback',
      style: {
        minHeight: (ctx.widget.props?.minHeight as string) || '160px',
        padding: '12px',
        border: '1px solid var(--el-border-color, #dcdfe6)',
        borderRadius: '4px',
        background: ctx.disabled ? 'var(--el-fill-color-light, #f5f7fa)' : '#ffffff',
        outline: 'none',
      },
      contentEditable: !ctx.disabled && !ctx.readonly,
      innerHTML: (ctx.modelValue as string) || '',
      onInput: (e: Event) => {
        const target = e.target as HTMLElement;
        ctx['onUpdate:modelValue'](target.innerHTML);
      },
    });
  };

  return {
    type: 'rich-editor',
    label: '富文本创作器',
    category: 'advanced',
    icon: 'Document',
    render: renderFn,
    component: createEcosystemAdapterComponent(renderFn),
  };
}

/**
 * 创建代码编辑器物料适配器。
 */
export function createCodeEditorWidgetAdapter(customComponent?: Component): FormWidgetAdapter {
  const renderFn = (ctx: WidgetRenderContext): VNode => {
    const TargetComp = getGlobalOrCustomComponent('AtengCodeEditor', customComponent);

    if (TargetComp) {
      return h(TargetComp, {
        modelValue: (ctx.modelValue as string) || '',
        'onUpdate:modelValue': ctx['onUpdate:modelValue'],
        language: (ctx.widget.props?.language as string) || 'json',
        height: (ctx.widget.props?.height as string) || '200px',
        readonly: ctx.disabled || ctx.readonly,
      });
    }

    // 内置优雅兜底回退：纯文本代码框
    return h('textarea', {
      class: 'at-ecosystem-code-fallback',
      value:
        typeof ctx.modelValue === 'string'
          ? ctx.modelValue
          : JSON.stringify(ctx.modelValue, null, 2),
      onInput: (e: Event) => {
        const val = (e.target as HTMLTextAreaElement).value;
        ctx['onUpdate:modelValue'](val);
      },
      disabled: ctx.disabled || ctx.readonly,
      style: {
        width: '100%',
        height: (ctx.widget.props?.height as string) || '180px',
        fontFamily: 'var(--el-font-family-monospace, monospace)',
        fontSize: '13px',
        padding: '10px',
        boxSizing: 'border-box',
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        borderRadius: '4px',
        border: '1px solid #333333',
        resize: 'vertical',
      },
    });
  };

  return {
    type: 'code-editor',
    label: '代码编辑器',
    category: 'advanced',
    icon: 'EditPen',
    render: renderFn,
    component: createEcosystemAdapterComponent(renderFn),
  };
}

/**
 * 创建电子手写签名板物料适配器。
 */
export function createSignatureWidgetAdapter(customComponent?: Component): FormWidgetAdapter {
  const renderFn = (ctx: WidgetRenderContext): VNode => {
    const TargetComp = customComponent || AtengSignature;
    return h(TargetComp, {
      modelValue: (ctx.modelValue as string) || '',
      'onUpdate:modelValue': ctx['onUpdate:modelValue'],
      disabled: ctx.disabled || ctx.readonly,
      strokeColor: (ctx.widget.props?.strokeColor as string) || '#000000',
      strokeWidth: (ctx.widget.props?.strokeWidth as number) || 3,
      height: (ctx.widget.props?.height as number) || 180,
    });
  };

  return {
    type: 'signature',
    label: '手写签名板',
    category: 'advanced',
    icon: 'Edit',
    render: renderFn,
    component: createEcosystemAdapterComponent(renderFn),
  };
}

/**
 * 创建大文件/切片上传物料适配器。
 */
export function createUploadWidgetAdapter(customComponent?: Component): FormWidgetAdapter {
  const renderFn = (ctx: WidgetRenderContext): VNode => {
    const TargetComp = getGlobalOrCustomComponent('AtengUpload', customComponent);

    if (TargetComp) {
      return h(TargetComp, {
        modelValue: ctx.modelValue,
        'onUpdate:modelValue': ctx['onUpdate:modelValue'],
        disabled: ctx.disabled || ctx.readonly,
        action: (ctx.widget.props?.action as string) || '/api/file/upload',
      });
    }

    // 内置回退：Element Plus ElUpload
    return h(
      ElUpload,
      {
        action: (ctx.widget.props?.action as string) || '#',
        disabled: ctx.disabled || ctx.readonly,
        multiple: Boolean(ctx.widget.props?.multiple),
        drag: ctx.widget.props?.drag !== false,
        autoUpload: false,
      },
      {
        default: () => [h('div', { class: 'el-upload__text' }, '将文件拖到此处，或点击上传')],
        tip: () =>
          h(
            'div',
            { class: 'el-upload__tip' },
            (ctx.widget.props?.tip as string) || '单文件最大支持 500MB',
          ),
      },
    );
  };

  return {
    type: 'chunk-upload',
    label: '文件切片上传',
    category: 'advanced',
    icon: 'Upload',
    render: renderFn,
    component: createEcosystemAdapterComponent(renderFn),
  };
}
