/**
 * AtengTable 列 VNode 解析、过滤与排序工具函数单元测试。
 *
 * @author Ateng
 * @since 2026-11-20
 */

import { describe, it, expect } from 'vitest';
import { Comment, Fragment, createCommentVNode, h, type VNode } from 'vue';
import { ElTableColumn } from 'element-plus';
import {
  parseColumnVNodes,
  filterColumnVNodes,
  filterAndSortColumnVNodes,
  type ColumnTransformOptions,
} from '../src/components/table';

describe('table vnode utils', () => {
  it('parseColumnVNodes 应递归扁平化 Fragment 并提取列元数据', () => {
    const vnodes: VNode[] = [
      createCommentVNode('ignored-comment'),
      h(ElTableColumn, { type: 'selection', width: 55 }),
      h(Fragment, null, [
        h(ElTableColumn, { prop: 'username', label: '用户名', 'min-width': 120 }),
        h(ElTableColumn, { prop: 'status', label: '状态', visible: false }),
      ]),
    ];

    const parsed = parseColumnVNodes(vnodes);

    expect(parsed).toEqual([
      {
        prop: undefined,
        label: undefined,
        width: 55,
        minWidth: undefined,
        fixed: undefined,
        sortable: undefined,
        align: undefined,
        type: 'selection',
        visible: true,
      },
      {
        prop: 'username',
        label: '用户名',
        width: undefined,
        minWidth: 120,
        fixed: undefined,
        sortable: undefined,
        align: undefined,
        type: undefined,
        visible: true,
      },
      {
        prop: 'status',
        label: '状态',
        width: undefined,
        minWidth: undefined,
        fixed: undefined,
        sortable: undefined,
        align: undefined,
        type: undefined,
        visible: false,
      },
    ]);
  });

  it('filterColumnVNodes 应基于 ColumnTransformOptions 过滤不可见列、递归 Fragment 并注入属性', () => {
    const vnodes: VNode[] = [
      createCommentVNode('hidden-comment'),
      h(ElTableColumn, { type: 'selection' }),
      h(ElTableColumn, { type: 'selection', reserveSelection: false }),
      h(Fragment, null, [
        h(ElTableColumn, { prop: 'name', label: '姓名' }),
        h(ElTableColumn, { prop: 'secret', label: '密钥' }),
      ]),
      h(ElTableColumn, { prop: 'action', label: '操作', resizable: false }),
    ];

    const options: ColumnTransformOptions = {
      visibilityMap: new Map([
        ['name', true],
        ['secret', false],
        ['action', true],
      ]),
      widthMap: new Map([['name', 220]]),
      resizable: true,
    };

    const result = filterColumnVNodes(vnodes, options);

    expect(result).toHaveLength(4);
    expect(result.some(node => node.type === Comment)).toBe(false);

    // 1. 默认 selection 列自动注入 reserveSelection: true 与全局 resizable: true
    expect(result[0]?.props).toMatchObject({
      type: 'selection',
      reserveSelection: true,
      resizable: true,
    });

    // 2. 显式传入 reserveSelection: false 时保留原值
    expect(result[1]?.props).toMatchObject({
      type: 'selection',
      reserveSelection: false,
      resizable: true,
    });

    // 3. Fragment 内部递归过滤 secret，并为 name 注入 widthMap 动态宽度与 resizable
    const fragmentNode = result[2];
    expect(fragmentNode?.type).toBe(Fragment);
    const fragmentChildren = fragmentNode?.children as VNode[];
    expect(fragmentChildren).toHaveLength(1);
    expect(fragmentChildren[0]?.props).toMatchObject({
      prop: 'name',
      label: '姓名',
      width: 220,
      resizable: true,
    });

    // 4. 节点显式设置 resizable: false 时不被全局 resizable: true 覆盖
    expect(result[3]?.props).toMatchObject({
      prop: 'action',
      label: '操作',
      resizable: false,
    });
  });

  it('filterAndSortColumnVNodes 应按 ColumnTransformOptions.orderList 过滤并排序列节点', () => {
    const vnodes: VNode[] = [
      h(ElTableColumn, { prop: 'email', label: '邮箱' }),
      h(ElTableColumn, { prop: 'age', label: '年龄' }),
      h(ElTableColumn, { prop: 'name', label: '姓名' }),
      h(ElTableColumn, { prop: 'extra', label: '备注' }),
    ];

    const sorted = filterAndSortColumnVNodes(vnodes, {
      visibilityMap: new Map([
        ['email', true],
        ['age', false],
        ['name', true],
        ['extra', true],
      ]),
      orderList: ['name', 'email'],
      widthMap: new Map([['email', '180px']]),
    });

    expect(sorted.map(node => node.props?.prop)).toEqual(['name', 'email', 'extra']);
    expect(sorted[1]?.props?.width).toBe('180px');
  });

  it('filterAndSortColumnVNodes 在空列表或未传 orderList 时应返回空安全数组并保持过滤顺序', () => {
    expect(
      filterAndSortColumnVNodes([], {
        visibilityMap: new Map(),
      }),
    ).toEqual([]);

    const vnodes: VNode[] = [
      h(ElTableColumn, { prop: 'first', label: '第一列' }),
      h(ElTableColumn, { prop: 'second', label: '第二列' }),
    ];

    const filtered = filterAndSortColumnVNodes(vnodes, {
      visibilityMap: new Map([['first', false]]),
    });

    expect(filtered.map(node => node.props?.prop)).toEqual(['second']);
  });
});
