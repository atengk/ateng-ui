/**
 * VueNodeRegistry Vue 3 SFC 单文件组件自定义节点机制。
 *
 * 依据 ADR-0033 与工单 #168，提供将标准 Vue 3 SFC 单文件组件桥接注册为 LogicFlow 自定义富 UI 节点的能力：
 * 1. 响应式 Props 注入：自动向下传递当前节点元数据、画布实例与双向属性回写门面；
 * 2. 虚拟树受管挂载：利用 Vue 3 原生 createVNode 与 render 实现零多余开销挂载与原地 Diff 更新；
 * 3. 几何自适应四向锚点：提供正交吸附锚点与连线规则继承；
 * 4. 确定性销毁与生命周期闭环：节点删除与画布销毁时 100% 执行 render(null)，无幽灵 DOM 与内存残留。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { createVNode, render, type Component, type AppContext } from 'vue';
import LogicFlow, { HtmlNode, HtmlNodeModel } from '@logicflow/core';
import type { FlowNode, FlowGraph } from '../types';

/**
 * 传递给自定义 Vue 节点的 Props 强类型接口契约。
 */
export interface FlowVueNodeProps {
  /** 当前节点数据（包含 id, type, x, y, text, properties 等） */
  node: FlowNode;
  /** 当前 LogicFlow 画布实例 */
  lf: LogicFlow;
  /** LogicFlow 节点底层数据模型 */
  model: unknown;
  /** 当前流程图全量数据 */
  graph?: FlowGraph;
  /** 安全回写节点单个属性（自动同步 LogicFlow 模型与历史撤销重做栈） */
  updateProperty: (key: string, value: unknown) => void;
  /** 批量安全回写节点属性 */
  updateProperties: (patch: Record<string, unknown>) => void;
  /** 画布是否处于只读禁用状态 */
  disabled?: boolean;
  /** 允许自定义扩展属性索引签名 */
  [key: string]: unknown;
}

/**
 * 锚点定义结构。
 */
export interface FlowAnchorConfig {
  x: number;
  y: number;
  id: string;
  [key: string]: unknown;
}

/**
 * Vue 节点注册配置选项。
 */
export interface VueNodeOptions {
  /** 节点默认宽度（默认 200px） */
  width?: number;
  /** 节点默认高度（默认 80px） */
  height?: number;
  /** 自定义四向吸附锚点生成函数 */
  getDefaultAnchor?: (model: HtmlNodeModel) => FlowAnchorConfig[];
  /** 上层 Vue App 实例上下文（用于注入全局组件、指令与插件） */
  appContext?: AppContext;
}

/**
 * 从节点原始数据中提取规范化文本字符串。
 */
function extractNodeText(text: unknown): string {
  if (typeof text === 'string') return text;
  if (text && typeof text === 'object' && 'value' in text) {
    return String((text as { value?: unknown }).value ?? '');
  }
  return '';
}

/**
 * VueNodeRegistry 自定义节点适配系统。
 */
export class VueNodeRegistry {
  /**
   * 将一个标准 Vue 3 SFC 单文件组件注册为 LogicFlow 的自定义图元节点。
   *
   * @param target LogicFlow 实例或 LogicFlow 构造类
   * @param type 自定义图元类型标识（如 'approval-card' 或 'flow:custom-node'）
   * @param component Vue 3 SFC 组件定义
   * @param options 节点选项配置（宽高、锚点生成等）
   */
  static register(
    target: LogicFlow | typeof LogicFlow,
    type: string,
    component: Component,
    options: VueNodeOptions = {},
  ): void {
    if (!target || !type || !component) {
      throw new Error('registerVueNode 缺少必填参数 (target, type, component)');
    }

    const boundLf =
      typeof target === 'object' && target !== null && 'render' in target
        ? (target as LogicFlow)
        : null;

    class VueHtmlNodeView extends HtmlNode {
      private mountContainer: HTMLDivElement | null = null;
      private isUnmounted = false;
      private nodeDeleteHandler: ((payload: { data?: { id?: string } }) => void) | null = null;

      private unmountVue(): void {
        if (this.isUnmounted) return;
        this.isUnmounted = true;

        // 对称注销 LogicFlow 节点删除事件监听器
        const eventCenter = this.props.graphModel?.eventCenter;
        if (this.nodeDeleteHandler && eventCenter && typeof eventCenter.off === 'function') {
          eventCenter.off('node:delete', this.nodeDeleteHandler);
          this.nodeDeleteHandler = null;
        }

        if (this.mountContainer) {
          render(null, this.mountContainer);
          this.mountContainer.remove();
          this.mountContainer = null;
        }
      }

      override componentDidMount(): void {
        super.componentDidMount();
        // 监听 LogicFlow 节点删除事件，确保 Vue 实例确定性卸载
        const eventCenter = this.props.graphModel?.eventCenter;
        if (eventCenter && typeof eventCenter.on === 'function') {
          const nodeId = this.props.model?.id;
          this.nodeDeleteHandler = (payload: { data?: { id?: string } }) => {
            if (payload?.data?.id === nodeId) {
              this.unmountVue();
            }
          };
          eventCenter.on('node:delete', this.nodeDeleteHandler);
        }
      }

      override setHtml(rootEl: SVGForeignObjectElement): void {
        if (this.isUnmounted) return;

        // 1. 初始化或复用挂载容器
        if (!this.mountContainer) {
          this.mountContainer = document.createElement('div');
          this.mountContainer.className = 'at-flow-vue-node';
          this.mountContainer.style.width = '100%';
          this.mountContainer.style.height = '100%';
          this.mountContainer.style.boxSizing = 'border-box';
          rootEl.appendChild(this.mountContainer);
        }

        // 2. 组装强类型 Props
        const model = this.props.model;
        const rawNodeData = (model.getData ? model.getData() : {}) as FlowNode;
        const text = extractNodeText(rawNodeData.text);
        const nodeData: FlowNode = {
          ...rawNodeData,
          text,
        };

        const lfInstance = boundLf ?? ((this.props.graphModel?.lf ?? boundLf ?? {}) as LogicFlow);

        const updateProperty = (key: string, value: unknown) => {
          model.setProperties({ [key]: value });
          if (key === 'name' || key === 'label' || key === 'text') {
            model.updateText(String(value ?? ''));
          }
        };

        const updateProperties = (patch: Record<string, unknown>) => {
          model.setProperties(patch);
          if ('name' in patch || 'label' in patch || 'text' in patch) {
            const val = patch.name ?? patch.label ?? patch.text;
            if (val !== undefined) {
              model.updateText(String(val ?? ''));
            }
          }
        };

        const props: FlowVueNodeProps = {
          node: nodeData,
          lf: lfInstance,
          model,
          updateProperty,
          updateProperties,
          disabled: Boolean(this.props.graphModel?.editConfigModel?.isSilentMode),
        };

        // 3. 利用 Vue 3 原生 createVNode 与 render 进行渲染与原地 Diff 更新
        const vnode = createVNode(component, props);
        if (options.appContext) {
          vnode.appContext = options.appContext;
        }

        render(vnode, this.mountContainer);
      }

      override componentWillUnmount(): void {
        // 4. 确定性清理与销毁 Vue 实例，彻底消除内存泄漏
        this.unmountVue();
        super.componentWillUnmount();
      }
    }

    class VueHtmlNodeModel extends HtmlNodeModel {
      override setAttributes(): void {
        this.width = options.width ?? 200;
        this.height = options.height ?? 80;
        // 禁止 LogicFlow 在卡片中央重复叠加渲染文本
        this.text.editable = false;
      }

      override getDefaultAnchor(): FlowAnchorConfig[] {
        if (options.getDefaultAnchor) {
          return options.getDefaultAnchor(this);
        }
        const { x, y, width, height } = this;
        return [
          { x, y: Math.round(y - height / 2), id: `${this.id}_top` },
          { x: Math.round(x + width / 2), y, id: `${this.id}_right` },
          { x, y: Math.round(y + height / 2), id: `${this.id}_bottom` },
          { x: Math.round(x - width / 2), y, id: `${this.id}_left` },
        ];
      }
    }

    // 5. 调用 LogicFlow 注册管道
    const config = {
      type,
      view: VueHtmlNodeView,
      model: VueHtmlNodeModel,
    };

    const targetObj = target as unknown as { register?: (cfg: unknown) => void };
    if (typeof targetObj.register === 'function') {
      targetObj.register(config);
    }
  }
}

/**
 * 快捷函数：向 LogicFlow 注册自定义 Vue 3 SFC 单文件组件节点。
 *
 * @param target LogicFlow 实例或 LogicFlow 构造类
 * @param type 自定义图元类型标识
 * @param component Vue 3 SFC 组件定义
 * @param options 节点选项配置
 */
export function registerVueNode(
  target: LogicFlow | typeof LogicFlow,
  type: string,
  component: Component,
  options: VueNodeOptions = {},
): void {
  VueNodeRegistry.register(target, type, component, options);
}
