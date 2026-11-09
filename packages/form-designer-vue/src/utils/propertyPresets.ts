/**
 * @atengk/form-designer-vue 控件属性与表单全局配置自举 Schema 预设集。
 *
 * 遵循 ADR-0044 第 7 条“渲染器自举渲染配置器”架构规范：
 * 为基础控件与容器提供标准 JSON FormSchema，由 <AtengFormRenderer /> 驱动渲染出属性配置面板。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { FormSchema, FormWidget } from '../types';

/**
 * 获取指定控件的专有 Props 配置 Schema。
 *
 * @param widget 目标控件 AST
 */
export function getWidgetPropsConfigSchema(widget: FormWidget): FormSchema | null {
  switch (widget.type) {
    case 'input':
      return {
        version: '1.0',
        formConfig: { layout: 'vertical', size: 'small', colon: true },
        widgetList: [
          {
            id: 'prop_input_type',
            type: 'select',
            modelKey: 'type',
            label: '文本输入类型',
            options: [
              { label: '普通单行文本 (text)', value: 'text' },
              { label: '密码隐蔽输入 (password)', value: 'password' },
              { label: '纯数字输入 (number)', value: 'number' },
            ],
          },
        ],
      };

    case 'textarea':
      return {
        version: '1.0',
        formConfig: { layout: 'vertical', size: 'small', colon: true },
        widgetList: [
          {
            id: 'prop_textarea_rows',
            type: 'input',
            modelKey: 'rows',
            label: '默认展示行数 (rows)',
            placeholder: '例如: 3',
          },
        ],
      };

    case 'grid':
      return {
        version: '1.0',
        formConfig: { layout: 'vertical', size: 'small', colon: true },
        widgetList: [
          {
            id: 'prop_grid_cols',
            type: 'select',
            modelKey: 'cols',
            label: '栅格分栏列数 (cols)',
            options: [
              { label: '1 列 (单列全宽)', value: 1 },
              { label: '2 列 (对称双栏)', value: 2 },
              { label: '3 列 (三分布局)', value: 3 },
              { label: '4 列 (四分布局)', value: 4 },
            ],
          },
          {
            id: 'prop_grid_gutter',
            type: 'input',
            modelKey: 'gutter',
            label: '栅格水平间距 (gutter px)',
            placeholder: '默认: 16',
          },
        ],
      };

    case 'card':
      return {
        version: '1.0',
        formConfig: { layout: 'vertical', size: 'small', colon: true },
        widgetList: [
          {
            id: 'prop_card_title',
            type: 'input',
            modelKey: 'title',
            label: '卡片分组标题 (title)',
            placeholder: '请输入卡片标题',
          },
          {
            id: 'prop_card_bordered',
            type: 'checkbox',
            modelKey: 'bordered',
            label: '是否显示轮廓边框',
          },
        ],
      };

    case 'subform':
      return {
        version: '1.0',
        formConfig: { layout: 'vertical', size: 'small', colon: true },
        widgetList: [
          {
            id: 'prop_subform_mode',
            type: 'select',
            modelKey: 'displayMode',
            label: '明细交互模式 (displayMode)',
            options: [
              { label: '行内编辑紧凑表格 (table)', value: 'table' },
              { label: '卡片列表 + 弹窗填报 (dialog-list)', value: 'dialog-list' },
            ],
          },
          {
            id: 'prop_subform_allow_add',
            type: 'checkbox',
            modelKey: 'allowAdd',
            label: '允许新增明细行',
          },
          {
            id: 'prop_subform_allow_delete',
            type: 'checkbox',
            modelKey: 'allowDelete',
            label: '允许删除明细行',
          },
          {
            id: 'prop_subform_btn_text',
            type: 'input',
            modelKey: 'addButtonText',
            label: '新增按钮文字',
            placeholder: '默认: 添加明细行',
          },
          {
            id: 'prop_subform_empty_text',
            type: 'input',
            modelKey: 'emptyText',
            label: '无数据占位提示',
            placeholder: '默认: 暂无明细数据',
          },
        ],
      };

    default:
      return null;
  }
}

/**
 * 全局表单配置项 (FormConfig) 自举编辑 Schema。
 */
export const globalFormConfigSchema: FormSchema = {
  version: '1.0',
  formConfig: { layout: 'vertical', size: 'small', colon: true },
  widgetList: [
    {
      id: 'cfg_layout',
      type: 'select',
      modelKey: 'layout',
      label: '表单排版布局 (layout)',
      options: [
        { label: '水平单行 (horizontal)', value: 'horizontal' },
        { label: '垂直流式 (vertical)', value: 'vertical' },
        { label: '紧凑行内 (inline)', value: 'inline' },
      ],
    },
    {
      id: 'cfg_label_pos',
      type: 'select',
      modelKey: 'labelPosition',
      label: '标签对齐位置 (labelPosition)',
      options: [
        { label: '右对齐 (right)', value: 'right' },
        { label: '左对齐 (left)', value: 'left' },
        { label: '顶部对齐 (top)', value: 'top' },
      ],
    },
    {
      id: 'cfg_label_width',
      type: 'input',
      modelKey: 'labelWidth',
      label: '标签宽度 (labelWidth)',
      placeholder: '例如: 100 或 120px',
    },
    {
      id: 'cfg_size',
      type: 'select',
      modelKey: 'size',
      label: '控件尺寸规格 (size)',
      options: [
        { label: '默认标准 (default)', value: 'default' },
        { label: '宽松大号 (large)', value: 'large' },
        { label: '紧凑小号 (small)', value: 'small' },
      ],
    },
    {
      id: 'cfg_colon',
      type: 'checkbox',
      modelKey: 'colon',
      label: '是否显示标签后冒号 (colon)',
    },
    {
      id: 'cfg_scroll',
      type: 'checkbox',
      modelKey: 'scrollToError',
      label: '校验失败自动滚动至首项 (scrollToError)',
    },
  ],
};
