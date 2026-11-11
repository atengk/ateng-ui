/**
 * @atengk/gantt-vue GanttDataMapper 单元测试。
 *
 * 验证双模数据转换（扁平带 parentId 与嵌套 children）、
 * 100% 业务属性保全以及增量回写能力。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect } from 'vitest';
import { GanttDataMapper } from '../src/engines/gantt-data-mapper';
import type { GanttTaskRecord } from '../src/types';

describe('GanttDataMapper Engine', () => {
  const mapper = new GanttDataMapper();

  interface CustomBusinessTask extends GanttTaskRecord {
    owner?: string;
    department?: string;
    budget?: number;
    extraTags?: string[];
  }

  const flatTasks: CustomBusinessTask[] = [
    {
      id: 'root-1',
      name: '研发项目一期',
      startDate: '2026-11-01',
      endDate: '2026-11-20',
      progress: 50,
      owner: '张三',
      department: '基础架构部',
      budget: 100000,
      extraTags: ['重点工程', '自研'],
    },
    {
      id: 'sub-1',
      parentId: 'root-1',
      name: '后端底座搭建',
      startDate: '2026-11-01',
      endDate: '2026-11-10',
      progress: 100,
      owner: '李四',
    },
    {
      id: 'sub-2',
      parentId: 'root-1',
      name: '前端组件库开发',
      startDate: '2026-11-05',
      endDate: '2026-11-20',
      progress: 30,
      owner: '王五',
    },
    {
      id: 'sub-2-1',
      parentId: 'sub-2',
      name: '甘特图组件封装',
      startDate: '2026-11-05',
      endDate: '2026-11-15',
      progress: 60,
      owner: '赵六',
    },
    {
      id: 'root-2',
      name: '市场宣讲准备',
      startDate: '2026-11-21',
      endDate: '2026-11-25',
      progress: 0,
    },
  ];

  it('应当正确判断数据集合是否为扁平一维结构', () => {
    expect(GanttDataMapper.isFlatStructure(flatTasks)).toBe(true);

    const treeTasks: GanttTaskRecord[] = [
      {
        id: 'node-1',
        name: '根节点',
        children: [
          { id: 'node-1-1', name: '叶子节点 1' },
          { id: 'node-1-2', name: '叶子节点 2' },
        ],
      },
    ];
    expect(GanttDataMapper.isFlatStructure(treeTasks)).toBe(false);

    expect(GanttDataMapper.isFlatStructure([])).toBe(true);
  });

  it('应当将扁平带 parentId 数组转换为深层树形结构', () => {
    const tree = mapper.toTree(flatTasks);

    expect(tree).toHaveLength(2);
    expect(tree[0].id).toBe('root-1');
    expect(tree[0].children).toHaveLength(2);
    expect(tree[0].children?.[0].id).toBe('sub-1');
    expect(tree[0].children?.[1].id).toBe('sub-2');

    // 检查 3 级嵌套节点
    const sub2 = tree[0].children?.[1];
    expect(sub2?.children).toHaveLength(1);
    expect(sub2?.children?.[0].id).toBe('sub-2-1');

    expect(tree[1].id).toBe('root-2');
    expect(tree[1].children).toBeUndefined();
  });

  it('在扁平转树形与逆向平铺过程中 100% 保全自定义业务属性', () => {
    const tree = mapper.toTree(flatTasks);
    const root1 = tree[0];

    // 校验扩展字段保全
    expect(root1.owner).toBe('张三');
    expect(root1.department).toBe('基础架构部');
    expect(root1.budget).toBe(100000);
    expect(root1.extraTags).toEqual(['重点工程', '自研']);

    const sub1 = root1.children?.[0];
    expect(sub1?.owner).toBe('李四');

    // 逆向打平回扁平列表
    const backToFlat = mapper.toFlat(tree);
    expect(backToFlat).toHaveLength(5);

    const originalRoot1 = backToFlat.find(t => t.id === 'root-1');
    expect(originalRoot1?.department).toBe('基础架构部');
    expect(originalRoot1?.budget).toBe(100000);
    expect(originalRoot1?.extraTags).toEqual(['重点工程', '自研']);

    const originalSub21 = backToFlat.find(t => t.id === 'sub-2-1');
    expect(originalSub21?.parentId).toBe('sub-2');
    expect(originalSub21?.owner).toBe('赵六');
  });

  it('应当支持自适应 normalize：无论输入是树形还是扁平均统一输出规范树形', () => {
    // 1. 输入扁平结构
    const treeFromFlat = mapper.normalize(flatTasks);
    expect(treeFromFlat).toHaveLength(2);
    expect(treeFromFlat[0].children).toHaveLength(2);

    // 2. 输入已有树形结构
    const treeInput: GanttTaskRecord[] = [
      {
        id: 't-1',
        name: '父任务',
        children: [{ id: 't-1-1', name: '子任务' }],
      },
    ];
    const treeFromTree = mapper.normalize(treeInput);
    expect(treeFromTree).toHaveLength(1);
    expect(treeFromTree[0].children).toHaveLength(1);
    expect(treeFromTree[0].children?.[0].id).toBe('t-1-1');

    // 3. 空数组保底
    expect(mapper.normalize([])).toEqual([]);
  });

  it('在扁平列表中增量更新任务时应当保持原有数组形态与全部未知属性', () => {
    const updatedSub1: CustomBusinessTask = {
      id: 'sub-1',
      parentId: 'root-1',
      name: '后端底座搭建 (已完工)',
      startDate: '2026-11-01',
      endDate: '2026-11-12',
      progress: 100,
      // 业务可能没传 owner，或传了新值
    };

    const nextList = mapper.updateTaskInList(flatTasks, updatedSub1);

    expect(nextList).toHaveLength(5);
    const found = nextList.find(t => t.id === 'sub-1');
    expect(found?.name).toBe('后端底座搭建 (已完工)');
    expect(found?.endDate).toBe('2026-11-12');
    // 验证原有的 owner 字段没有丢失
    expect(found?.owner).toBe('李四');
  });

  it('在树形嵌套结构中增量更新深层叶子任务时应当原地安全更新且保全属性', () => {
    const tree = mapper.toTree(flatTasks);

    const updatedSub21: CustomBusinessTask = {
      id: 'sub-2-1',
      name: '甘特图组件封装 (提测阶段)',
      progress: 90,
    };

    const nextTree = mapper.updateTaskInList(tree, updatedSub21);
    const target = nextTree[0].children?.[1].children?.[0];

    expect(target?.name).toBe('甘特图组件封装 (提测阶段)');
    expect(target?.progress).toBe(90);
    // 验证原有 startDate, endDate 与 owner 保全
    expect(target?.startDate).toBe('2026-11-05');
    expect(target?.endDate).toBe('2026-11-15');
    expect(target?.owner).toBe('赵六');
  });
});
