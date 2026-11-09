/**
 * AtengSubForm 动态明细子表单与布局容器单元测试。
 *
 * 遵循 ADR-0008 全自洽单测铁律与 ADR-0044 规约，覆盖：
 * 1. LayoutContainer (Grid / Card) 嵌套排版与根数据平铺绑定；
 * 2. DataContainer (SubForm) 数组分支模型与行级作用域；
 * 3. table 紧凑表格模式行增删改查；
 * 4. dialog-list 卡片弹窗模式弹层编辑与保存；
 * 5. 行内字段精确定位校验 (Indexed Path items[0].name)；
 * 6. 只读态 (readonly) 脱壳格式化与按钮隐匿。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { AtengFormRenderer } from '../src';
import type { FormSchema, FormRendererInstance } from '../src';

describe('AtengSubForm & LayoutContainer', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  const layoutSchema: FormSchema = {
    version: '1.0',
    formConfig: {
      layout: 'vertical',
      labelPosition: 'top',
    },
    widgetList: [
      {
        id: 'card_order',
        type: 'card',
        isContainer: true,
        props: {
          title: '订单基本信息',
          bordered: true,
        },
        children: [
          {
            id: 'grid_base',
            type: 'grid',
            isContainer: true,
            props: {
              cols: 2,
              gutter: 20,
            },
            children: [
              {
                id: 'widget_order_no',
                type: 'input',
                modelKey: 'orderNo',
                label: '订单编号',
                defaultValue: 'ORD-20261109-001',
              },
              {
                id: 'widget_customer',
                type: 'input',
                modelKey: 'customer',
                label: '客户名称',
                defaultValue: '阿腾科技',
              },
            ],
          },
        ],
      },
    ],
  };

  it('应该正确渲染 Grid 与 Card 布局容器并平铺绑定至根 formData', async () => {
    const formData = ref<Record<string, unknown>>({});

    wrapper = mount(AtengFormRenderer, {
      props: {
        schema: layoutSchema,
        formData: formData.value,
        'onUpdate:formData': (val: Record<string, unknown>) => {
          formData.value = val;
        },
      },
    });

    // 检查 Card 容器渲染
    const card = wrapper.find('.at-form-card');
    expect(card.exists()).toBe(true);
    expect(card.classes()).toContain('is-bordered');
    expect(wrapper.find('.at-form-card-title').text()).toBe('订单基本信息');

    // 检查 Grid 容器与样式
    const grid = wrapper.find('.at-form-grid');
    expect(grid.exists()).toBe(true);
    const gridEl = grid.element as HTMLElement;
    expect(gridEl.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    expect(gridEl.style.gap).toBe('20px');

    // 检查表单控件正确平铺绑定至根 formData
    const inputs = wrapper.findAll('input.at-native-input');
    expect(inputs.length).toBe(2);
    expect((inputs[0].element as HTMLInputElement).value).toBe('ORD-20261109-001');
    expect((inputs[1].element as HTMLInputElement).value).toBe('阿腾科技');

    // 修改输入框触发根数据更新
    await inputs[1].setValue('新华集团');
    expect(formData.value.customer).toBe('新华集团');
  });

  const subFormSchema: FormSchema = {
    version: '1.0',
    formConfig: {
      layout: 'vertical',
    },
    widgetList: [
      {
        id: 'widget_items',
        type: 'subform',
        modelKey: 'items',
        label: '采购明细表',
        isCollection: true,
        props: {
          displayMode: 'table',
          addButtonText: '添加商品',
          allowAdd: true,
          allowDelete: true,
        },
        children: [
          {
            id: 'child_name',
            type: 'input',
            modelKey: 'name',
            label: '商品名称',
            defaultValue: '默认商品',
            rules: [{ required: true, message: '商品名称不能为空' }],
          },
          {
            id: 'child_price',
            type: 'input',
            modelKey: 'price',
            label: '单价',
            defaultValue: 100,
            props: {
              format: 'currency',
            },
          },
        ],
      },
    ],
  };

  it('应该在 table 紧凑表格模式下支持行新增、行删除与单元格修改', async () => {
    const formData = ref<Record<string, unknown>>({
      items: [{ name: '机械键盘', price: 299 }],
    });

    wrapper = mount(AtengFormRenderer, {
      props: {
        schema: subFormSchema,
        formData: formData.value,
        'onUpdate:formData': (val: Record<string, unknown>) => {
          formData.value = val;
        },
      },
    });

    const subForm = wrapper.find('.at-subform');
    expect(subForm.exists()).toBe(true);
    expect(subForm.classes()).toContain('mode-table');

    // 初始应有 1 条明细
    let rows = wrapper.findAll('.at-subform-table tbody tr');
    expect(rows.length).toBe(1);
    expect(wrapper.find('.at-subform-count').text()).toContain('1 条明细');

    // 检查单元格初始值
    const firstRowInputs = rows[0].findAll('input.at-native-input');
    expect((firstRowInputs[0].element as HTMLInputElement).value).toBe('机械键盘');
    expect((firstRowInputs[1].element as HTMLInputElement).value).toBe('299');

    // 点击新增一行
    const addBtn = wrapper.find('.at-subform-btn-add');
    expect(addBtn.exists()).toBe(true);
    await addBtn.trigger('click');
    await nextTick();

    // 检查行数增加至 2
    rows = wrapper.findAll('.at-subform-table tbody tr');
    expect(rows.length).toBe(2);
    expect(wrapper.find('.at-subform-count').text()).toContain('2 条明细');

    // 检查第二行填充了默认值
    const secondRowInputs = rows[1].findAll('input.at-native-input');
    expect((secondRowInputs[0].element as HTMLInputElement).value).toBe('默认商品');
    expect((secondRowInputs[1].element as HTMLInputElement).value).toBe('100');

    // 修改第二行单元格
    await secondRowInputs[0].setValue('无线鼠标');
    await nextTick();
    const currentItems = formData.value.items as Array<Record<string, unknown>>;
    expect(currentItems[1].name).toBe('无线鼠标');

    // 删除第一行
    const deleteBtn = rows[0].find('.at-subform-btn-delete');
    expect(deleteBtn.exists()).toBe(true);
    await deleteBtn.trigger('click');
    await nextTick();

    // 检查剩余 1 行且为原第二行
    rows = wrapper.findAll('.at-subform-table tbody tr');
    expect(rows.length).toBe(1);
    const remainingInputs = rows[0].findAll('input.at-native-input');
    expect((remainingInputs[0].element as HTMLInputElement).value).toBe('无线鼠标');
  });

  it('应该支持精确的行内字段校验 (Indexed Path items[0].name)', async () => {
    const formData = ref<Record<string, unknown>>({
      items: [
        { name: '有效商品', price: 100 },
        { name: '', price: 200 }, // 空商品名称，触发校验失败
      ],
    });

    wrapper = mount(AtengFormRenderer, {
      props: {
        schema: subFormSchema,
        formData: formData.value,
        'onUpdate:formData': (val: Record<string, unknown>) => {
          formData.value = val;
        },
      },
    });

    const formRef = wrapper.vm as unknown as FormRendererInstance;

    // 触发全表单校验
    const res = await formRef.validate();
    expect(res.valid).toBe(false);
    expect(res.errors['items[1].name']).toBe('商品名称不能为空');
    expect(res.errors['items[0].name']).toBeUndefined();

    await nextTick();

    // 验证第二行名称单元格显示错误类名与提示
    const rows = wrapper.findAll('.at-subform-table tbody tr');
    const row2Cells = rows[1].findAll('.at-subform-cell');
    expect(row2Cells[0].classes()).toContain('has-error');
    const cellError = row2Cells[0].find('.at-subform-cell-error');
    expect(cellError.exists()).toBe(true);
    expect(cellError.text()).toBe('商品名称不能为空');
  });

  it('应该在 dialog-list 模式下通过弹窗卡片进行新增与编辑', async () => {
    const dialogSchema: FormSchema = {
      version: '1.0',
      formConfig: { layout: 'vertical' },
      widgetList: [
        {
          id: 'widget_contacts',
          type: 'subform',
          modelKey: 'contacts',
          label: '联系人列表',
          isCollection: true,
          props: {
            displayMode: 'dialog-list',
            addButtonText: '新增联系人',
          },
          children: [
            {
              id: 'child_cname',
              type: 'input',
              modelKey: 'name',
              label: '姓名',
              defaultValue: '李四',
            },
            {
              id: 'child_phone',
              type: 'input',
              modelKey: 'phone',
              label: '手机号',
              defaultValue: '13800000000',
            },
          ],
        },
      ],
    };

    const formData = ref<Record<string, unknown>>({
      contacts: [{ name: '张三', phone: '13912345678' }],
    });

    wrapper = mount(AtengFormRenderer, {
      props: {
        schema: dialogSchema,
        formData: formData.value,
        'onUpdate:formData': (val: Record<string, unknown>) => {
          formData.value = val;
        },
      },
    });

    // 检查卡片模式
    const subForm = wrapper.find('.at-subform');
    expect(subForm.classes()).toContain('mode-dialog-list');

    // 检查现有 1 个卡片项
    const cards = wrapper.findAll('.at-subform-card-item');
    expect(cards.length).toBe(1);
    expect(cards[0].text()).toContain('张三');

    // 点击新增联系人打开弹窗
    const addBtn = wrapper.find('.at-subform-btn-add');
    await addBtn.trigger('click');
    await nextTick();

    const modal = wrapper.find('.at-subform-modal-overlay');
    expect(modal.exists()).toBe(true);
    expect(wrapper.find('.modal-header h4').text()).toBe('新增明细条目');

    // 在弹窗中输入新姓名
    const modalInputs = modal.findAll('input.at-native-input');
    await modalInputs[0].setValue('王五');
    await modalInputs[1].setValue('13711112222');

    // 点击保存弹窗
    const saveBtn = modal.find('.at-subform-btn-primary');
    await saveBtn.trigger('click');
    await nextTick();

    // 弹窗关闭，卡片增至 2 项
    expect(wrapper.find('.at-subform-modal-overlay').exists()).toBe(false);
    const updatedCards = wrapper.findAll('.at-subform-card-item');
    expect(updatedCards.length).toBe(2);
    expect(updatedCards[1].text()).toContain('王五');
    expect(updatedCards[1].text()).toContain('13711112222');
  });

  it('应该在 readonly 模式下隐藏增删按钮并以无边框文本脱壳格式化呈现', async () => {
    const formData = ref<Record<string, unknown>>({
      items: [{ name: '高配工作站', price: 19999 }],
    });

    wrapper = mount(AtengFormRenderer, {
      props: {
        schema: subFormSchema,
        formData: formData.value,
        readonly: true,
      },
    });

    // 增删按钮隐匿
    expect(wrapper.find('.at-subform-btn-add').exists()).toBe(false);
    expect(wrapper.find('.at-subform-btn-delete').exists()).toBe(false);

    // 检查只读单元格渲染
    const readonlyCells = wrapper.findAll('.at-subform-readonly-cell');
    expect(readonlyCells.length).toBe(2);
    expect(readonlyCells[0].text()).toBe('高配工作站');
    // 单价具有 format: 'currency' 格式化为 ¥ 19,999.00
    expect(readonlyCells[1].text()).toBe('¥ 19,999.00');
  });
});
