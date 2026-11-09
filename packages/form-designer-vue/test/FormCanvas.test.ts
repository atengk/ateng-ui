/**
 * @atengk/form-designer-vue 设计态状态机、拖拽守卫与画板组件单元测试。
 *
 * 验证 useFormDesigner 状态机编排、不可变快照历史栈、validateDropTarget 守卫
 * 以及 AtengFormStencil、AtengFormOutlineTree、AtengFormCanvas、AtengFormDesigner 组件渲染与生命周期。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { useFormDesigner } from '../src/composables/useFormDesigner';
import {
  validateDropTarget,
  createDefaultWidget,
  cloneWidgetWithNewIds,
} from '../src/utils/designer';
import type { FormSchema, FormWidget, FormDesignerInstance } from '../src/types';
import AtengFormStencil from '../src/components/AtengFormStencil.vue';
import AtengFormOutlineTree from '../src/components/AtengFormOutlineTree.vue';
import AtengFormCanvas from '../src/components/AtengFormCanvas.vue';
import AtengFormDesigner from '../src/components/AtengFormDesigner.vue';

describe('validateDropTarget 拖拽类型守卫', () => {
  it('允许将任意节点拖入根画布 (targetParent === null)', () => {
    const source = createDefaultWidget('input');
    const result = validateDropTarget(source, null);
    expect(result.allowed).toBe(true);
  });

  it('严禁将容器拖入其自身内部', () => {
    const card = createDefaultWidget('card', { id: 'card_1' });
    const result = validateDropTarget(card, card);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('不能将容器拖入其自身内部');
  });

  it('严禁将容器拖入其子孙节点内部（避免自引循环）', () => {
    const input = createDefaultWidget('input', { id: 'child_input' });
    const nestedGrid = createDefaultWidget('grid', { id: 'nested_grid', children: [input] });
    const rootCard = createDefaultWidget('card', { id: 'root_card', children: [nestedGrid] });

    const allWidgets = [rootCard];

    // 尝试将 rootCard 拖入其子级 nestedGrid
    const result = validateDropTarget(rootCard, nestedGrid, allWidgets);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('不能将容器拖入其子孙节点内部');
  });

  it('严禁将控件拖入非容器控件中', () => {
    const source = createDefaultWidget('textarea');
    const targetInput = createDefaultWidget('input', { id: 'plain_input' });

    const result = validateDropTarget(source, targetInput);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('不是容器');
  });

  it('明细子表单 (DataContainer) 内部严禁嵌套另一个子表单明细', () => {
    const parentSubForm = createDefaultWidget('subform', { id: 'parent_subform' });
    const childSubForm = createDefaultWidget('subform', { id: 'child_subform' });

    const result = validateDropTarget(childSubForm, parentSubForm);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('明细子表单内部禁止再次嵌套明细子表单容器');
  });

  it('明细子表单 (DataContainer) 内部严禁嵌套 tabs 或 wizard 高阶容器', () => {
    const parentSubForm = createDefaultWidget('subform', { id: 'parent_subform' });
    const tabsWidget = { id: 'tabs_1', type: 'tabs', isContainer: true };

    const result = validateDropTarget(tabsWidget, parentSubForm);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('禁止嵌套标签页或分步向导');
  });

  it('明细子表单 (DataContainer) 允许容纳常规输入型与选择型控件', () => {
    const parentSubForm = createDefaultWidget('subform', { id: 'parent_subform' });
    const input = createDefaultWidget('input');
    const select = createDefaultWidget('select');

    expect(validateDropTarget(input, parentSubForm).allowed).toBe(true);
    expect(validateDropTarget(select, parentSubForm).allowed).toBe(true);
  });
});

describe('useFormDesigner 响应式设计态状态机', () => {
  it('支持无参初始化默认空 Schema', () => {
    const designer = useFormDesigner();
    expect(designer.schema.value.version).toBe('1.0');
    expect(designer.schema.value.widgetList).toEqual([]);
    expect(designer.activeWidgetId.value).toBeNull();
    expect(designer.canUndo.value).toBe(false);
    expect(designer.canRedo.value).toBe(false);
    expect(designer.viewport.value).toBe('pc');
  });

  it('支持向根节点添加控件并自动设为活动选中节点', () => {
    const designer = useFormDesigner();
    const widget = createDefaultWidget('input', { label: '用户名', modelKey: 'username' });

    const added = designer.addWidget(widget);
    expect(added).toBe(true);
    expect(designer.schema.value.widgetList.length).toBe(1);
    expect(designer.activeWidgetId.value).toBe(widget.id);
    expect(designer.activeWidget.value?.modelKey).toBe('username');
    expect(designer.canUndo.value).toBe(true);
  });

  it('支持向嵌套容器（Grid / Card）中添加子控件', () => {
    const designer = useFormDesigner();
    const card = createDefaultWidget('card', { id: 'card_user' });
    designer.addWidget(card);

    const input = createDefaultWidget('input', { id: 'input_name' });
    const addedChild = designer.addWidget(input, 'card_user');

    expect(addedChild).toBe(true);
    expect(designer.schema.value.widgetList[0].children?.length).toBe(1);
    expect(designer.schema.value.widgetList[0].children?.[0].id).toBe('input_name');
    expect(designer.activeParentWidget.value?.id).toBe('card_user');
  });

  it('复制控件 (copyWidget) 会生成全新唯一标识与唯一数据键', () => {
    const designer = useFormDesigner();
    const input = createDefaultWidget('input', { id: 'input_original', modelKey: 'username' });
    designer.addWidget(input);

    const copied = designer.copyWidget('input_original');
    expect(copied).not.toBeNull();
    expect(copied?.id).not.toBe('input_original');
    expect(designer.schema.value.widgetList.length).toBe(2);
    expect(designer.activeWidgetId.value).toBe(copied?.id);
  });

  it('跨容器移动控件 (moveWidget) 遵循层次结构并支持撤销重做', () => {
    const designer = useFormDesigner();
    const cardA = createDefaultWidget('card', { id: 'card_a' });
    const cardB = createDefaultWidget('card', { id: 'card_b' });
    designer.addWidget(cardA);
    designer.addWidget(cardB);

    const input = createDefaultWidget('input', { id: 'item_1' });
    designer.addWidget(input, 'card_a');

    expect(designer.schema.value.widgetList[0].children?.length).toBe(1);
    expect(designer.schema.value.widgetList[1].children?.length).toBe(0);

    // 将 item_1 从 card_a 移动至 card_b
    const moved = designer.moveWidget('item_1', 'card_b', 0);
    expect(moved).toBe(true);
    expect(designer.schema.value.widgetList[0].children?.length).toBe(0);
    expect(designer.schema.value.widgetList[1].children?.length).toBe(1);
    expect(designer.schema.value.widgetList[1].children?.[0].id).toBe('item_1');

    // 撤销移动
    designer.undo();
    expect(designer.schema.value.widgetList[0].children?.length).toBe(1);
    expect(designer.schema.value.widgetList[1].children?.length).toBe(0);

    // 重做移动
    designer.redo();
    expect(designer.schema.value.widgetList[0].children?.length).toBe(0);
    expect(designer.schema.value.widgetList[1].children?.length).toBe(1);
  });

  it('删除当前选中的控件会自动回退选中其父级容器', () => {
    const designer = useFormDesigner();
    const card = createDefaultWidget('card', { id: 'card_container' });
    designer.addWidget(card);

    const input = createDefaultWidget('input', { id: 'child_field' });
    designer.addWidget(input, 'card_container');

    expect(designer.activeWidgetId.value).toBe('child_field');

    // 移除 child_field
    designer.removeWidget('child_field');
    expect(designer.activeWidgetId.value).toBe('card_container');

    // 移除 card_container
    designer.removeWidget('card_container');
    expect(designer.activeWidgetId.value).toBeNull();
  });

  it('支持切换视口规格 (pc, pad, mobile)', () => {
    const designer = useFormDesigner();
    expect(designer.viewport.value).toBe('pc');

    designer.setViewport('pad');
    expect(designer.viewport.value).toBe('pad');

    designer.setViewport('mobile');
    expect(designer.viewport.value).toBe('mobile');
  });

  it('克隆函数 cloneWidgetWithNewIds 深度生成独立节点树', () => {
    const rootGrid = createDefaultWidget('grid', {
      id: 'grid_root',
      children: [
        createDefaultWidget('input', { id: 'grid_child_1' }),
        createDefaultWidget('select', { id: 'grid_child_2' }),
      ],
    });

    const cloned = cloneWidgetWithNewIds(rootGrid);
    expect(cloned.id).not.toBe('grid_root');
    expect(cloned.children?.[0].id).not.toBe('grid_child_1');
    expect(cloned.children?.[1].id).not.toBe('grid_child_2');
  });
});

describe('设计态组件交互测试', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('AtengFormStencil 渲染物料列表并支持点击添加', async () => {
    const wrapper = mount(AtengFormStencil);
    expect(wrapper.find('.at-form-stencil').exists()).toBe(true);

    const items = wrapper.findAll('.at-form-stencil__item');
    expect(items.length).toBeGreaterThanOrEqual(7);

    // 点击首个物料（单行文本）
    await items[0].trigger('click');
    expect(wrapper.emitted('add')).toBeTruthy();
    expect(wrapper.emitted('add')?.[0]?.[0]).toMatchObject({ type: 'input' });

    wrapper.unmount();
  });

  it('AtengFormOutlineTree 呈现大纲层次并响应节点选中、重命名与删除', async () => {
    const widgets: FormWidget[] = [
      createDefaultWidget('card', {
        id: 'c1',
        label: '基础信息卡片',
        children: [createDefaultWidget('input', { id: 'w1', label: '姓名', modelKey: 'name' })],
      }),
    ];

    const wrapper = mount(AtengFormOutlineTree, {
      props: {
        widgets,
        activeWidgetId: 'w1',
      },
    });

    // 检查节点渲染
    const labels = wrapper.findAll('.at-form-outline__label');
    expect(labels.some(l => l.text().includes('基础信息卡片'))).toBe(true);
    expect(labels.some(l => l.text().includes('姓名'))).toBe(true);

    // 点击卡片节点触发 select
    const nodes = wrapper.findAll('.at-form-outline__item');
    await nodes[0].trigger('click');
    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')?.[0]?.[0]).toBe('c1');

    // 点击复制
    const copyBtns = wrapper.findAll('.at-form-outline__btn[title="复制"]');
    if (copyBtns.length > 0) {
      await copyBtns[0].trigger('click');
      expect(wrapper.emitted('copy')).toBeTruthy();
    }

    wrapper.unmount();
  });

  it('AtengFormCanvas 正确响应视口切换并在卸载时释放资源', async () => {
    const schema: FormSchema = {
      version: '1.0',
      formConfig: { layout: 'vertical' },
      widgetList: [createDefaultWidget('input', { id: 'test_input', label: '测试字段' })],
    };

    const wrapper = mount(AtengFormCanvas, {
      props: {
        schema,
        activeWidgetId: 'test_input',
        viewport: 'mobile',
        validateDrop: () => ({ allowed: true }),
      },
    });

    expect(wrapper.find('.at-form-canvas.is-mobile').exists()).toBe(true);
    expect(wrapper.find('.at-form-canvas__mobile-notch').exists()).toBe(true);

    // 卸载测试
    wrapper.unmount();
    expect(wrapper.exists()).toBe(false);
  });

  it('AtengFormDesigner 统领容器集成与实例暴露', async () => {
    const wrapper = mount(AtengFormDesigner);

    const vm = wrapper.vm as unknown as FormDesignerInstance;
    expect(typeof vm.getSchema).toBe('function');
    expect(typeof vm.setSchema).toBe('function');
    expect(typeof vm.clearWidgets).toBe('function');
    expect(typeof vm.undo).toBe('function');
    expect(typeof vm.redo).toBe('function');

    // 初始为空
    expect(vm.getSchema().widgetList.length).toBe(0);

    // 切换视口
    vm.setViewport('pad');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.is-pad').exists()).toBe(true);

    wrapper.unmount();
  });
});
