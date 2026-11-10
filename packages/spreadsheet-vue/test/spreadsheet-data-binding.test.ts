/**
 * 电子表格双轨数据绑定与 SheetDataMapper 适配集成单元测试。
 *
 * 覆盖 v-model:snapshot、v-model:data、动态列推断、防抖回写与隐藏字段保全。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AtengSpreadsheet from '../src/components/AtengSpreadsheet.vue';
import { useSpreadsheet } from '../src/composables/use-spreadsheet';
import { SheetDataMapper } from '../src/mappers/sheet-data-mapper';
import type { SpreadsheetColumn, SpreadsheetRecord, SpreadsheetSnapshot } from '../src/types';

describe('双轨数据绑定与 SheetDataMapper 适配', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentElement) {
      container.parentElement.removeChild(container);
    }
  });

  describe('useSpreadsheet 数据流与防抖回写', () => {
    it('通过 data 初始化的状态机应当生成有效工作簿并支持 getData 提取', () => {
      const initialData: SpreadsheetRecord[] = [
        { id: 'usr_001', name: 'Alice', role: 'Admin' },
        { id: 'usr_002', name: 'Bob', role: 'Editor' },
      ];

      const columns: SpreadsheetColumn[] = [
        { key: 'id', title: '用户ID', width: 100 },
        { key: 'name', title: '姓名', width: 120 },
        { key: 'role', title: '角色', width: 100 },
      ];

      const onDataChange = vi.fn();
      const onSnapshotChange = vi.fn();

      const spreadsheet = useSpreadsheet({
        container,
        data: initialData,
        columns,
        debounceWait: 100,
        onDataChange,
        onSnapshotChange,
      });

      expect(spreadsheet.ready.value).toBe(true);

      // 提取数据
      const extracted = spreadsheet.getData();
      expect(extracted).toHaveLength(2);
      expect(extracted[0].name).toBe('Alice');
      expect(extracted[1].role).toBe('Editor');

      // 更新数据
      const newData: SpreadsheetRecord[] = [{ id: 'usr_003', name: 'Charlie', role: 'Viewer' }];
      spreadsheet.setData(newData);

      expect(spreadsheet.isDirty.value).toBe(true);
      const updated = spreadsheet.getData();
      expect(updated).toHaveLength(1);
      expect(updated[0].name).toBe('Charlie');

      spreadsheet.destroy();
    });

    it('未展示字段保全：当 columns 仅展示局部列时，getData 仍能保全原始未展示属性', () => {
      const originalData: SpreadsheetRecord[] = [
        {
          _snowflakeId: '987654321098765432',
          tenantId: 'tenant_cn_north',
          name: '产品A',
          price: 299,
          internalVersion: 3,
        },
      ];

      // 表格只展示 name 和 price
      const columns: SpreadsheetColumn[] = [
        { key: 'name', title: '产品名称' },
        { key: 'price', title: '价格' },
      ];

      const spreadsheet = useSpreadsheet({
        container,
        data: originalData,
        columns,
      });

      const records = spreadsheet.getData();
      expect(records).toHaveLength(1);
      expect(records[0].name).toBe('产品A');
      expect(records[0].price).toBe(299);
      // 内部隐藏字段 100% 完好保全
      expect(records[0]._snowflakeId).toBe('987654321098765432');
      expect(records[0].tenantId).toBe('tenant_cn_north');
      expect(records[0].internalVersion).toBe(3);

      spreadsheet.destroy();
    });

    it('防抖机制：setSnapshot 触发后应在指定 debounceWait 后通知回调', async () => {
      const onSnapshotChange = vi.fn();
      const onDataChange = vi.fn();

      const spreadsheet = useSpreadsheet({
        container,
        debounceWait: 100,
        onSnapshotChange,
        onDataChange,
      });

      const snapshot: SpreadsheetSnapshot = SheetDataMapper.recordsToSnapshot([
        { title: 'Task 1', done: false },
      ]);

      spreadsheet.setSnapshot(snapshot);

      // 防抖等待前不应立即触发
      expect(onSnapshotChange).not.toHaveBeenCalled();

      // 等待 200ms 超过 debounceWait
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(onSnapshotChange).toHaveBeenCalledTimes(1);
      expect(onDataChange).toHaveBeenCalledTimes(1);

      spreadsheet.destroy();
    });

    it('空状态保底：无数据初始化时 getData 必须保底返回空数组 []', () => {
      const spreadsheet = useSpreadsheet({ container });
      expect(spreadsheet.getData()).toEqual([]);
      spreadsheet.destroy();
    });
  });

  describe('AtengSpreadsheet 容器双向数据流', () => {
    it('当通过 v-model:data 传入数据时能够正确渲染并可通过 setData 触发 update:data', async () => {
      const testData: SpreadsheetRecord[] = [
        { id: 1, text: 'Hello' },
        { id: 2, text: 'World' },
      ];

      const wrapper = mount(AtengSpreadsheet, {
        props: {
          data: testData,
        },
      });

      const vm = wrapper.vm as unknown as {
        getData: () => SpreadsheetRecord[];
        setData: (records: SpreadsheetRecord[]) => void;
      };

      const current = vm.getData();
      expect(current).toHaveLength(2);
      expect(current[0].text).toBe('Hello');

      // 调用 setData 更新
      const updatedData: SpreadsheetRecord[] = [{ id: 1, text: 'Hello Updated' }];
      vm.setData(updatedData);

      // 验证触发了 update:data 事件
      expect(wrapper.emitted('update:data')).toBeDefined();
      const emittedPayload = wrapper.emitted('update:data')![0][0] as SpreadsheetRecord[];
      expect(emittedPayload).toHaveLength(1);
      expect(emittedPayload[0].text).toBe('Hello Updated');

      wrapper.unmount();
    });

    it('当通过 v-model:snapshot 传入全量快照时可通过 setSnapshot 触发 update:snapshot', async () => {
      const wrapper = mount(AtengSpreadsheet);

      const vm = wrapper.vm as unknown as {
        setSnapshot: (snapshot: SpreadsheetSnapshot) => void;
        getSnapshot: () => SpreadsheetSnapshot | null;
      };

      const testSnapshot = SheetDataMapper.recordsToSnapshot([{ score: 100 }]);
      vm.setSnapshot(testSnapshot);

      expect(wrapper.emitted('update:snapshot')).toBeDefined();
      expect(wrapper.emitted('update:snapshot')![0][0]).toEqual(testSnapshot);

      wrapper.unmount();
    });
  });
});
