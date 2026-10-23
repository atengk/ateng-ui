/**
 * useSelection 跨页多选状态机与雪花 Long ID 安全测试。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import { describe, expect, it } from 'vitest';
import { effectScope } from 'vue';
import { useSelection } from '../src';

interface TestItem {
  id: string | number;
  name: string;
  status?: string;
}

describe('useSelection', () => {
  it('should initialize with empty state by default', () => {
    const scope = effectScope();
    scope.run(() => {
      const { selectedKeys, selectedRows, selectedCount, isSelected } = useSelection<TestItem>();

      expect(selectedKeys.value).toEqual([]);
      expect(selectedRows.value).toEqual([]);
      expect(selectedCount.value).toBe(0);
      expect(isSelected({ id: '1', name: 'A' })).toBe(false);
    });
    scope.stop();
  });

  it('should initialize with initialSelected items', () => {
    const scope = effectScope();
    scope.run(() => {
      const initial: TestItem[] = [
        { id: '1890123456789012345', name: 'Snowflake User 1' },
        { id: '1890123456789012346', name: 'Snowflake User 2' },
      ];

      const { selectedKeys, selectedRows, selectedCount, isSelected } = useSelection<TestItem>({
        initialSelected: initial,
      });

      expect(selectedCount.value).toBe(2);
      expect(selectedKeys.value).toEqual(['1890123456789012345', '1890123456789012346']);
      expect(selectedRows.value).toEqual(initial);
      expect(isSelected({ id: '1890123456789012345', name: 'Any' })).toBe(true);
      expect(isSelected({ id: '999', name: 'Other' })).toBe(false);
    });
    scope.stop();
  });

  it('should support custom rowKey as property name or extractor function', () => {
    interface CustomItem {
      code: string;
      title: string;
    }

    const scope = effectScope();
    scope.run(() => {
      // 1. String property
      const sel1 = useSelection<CustomItem>({
        rowKey: 'code',
      });
      sel1.select({ code: 'C100', title: 'Item 1' });
      expect(sel1.selectedKeys.value).toEqual(['C100']);
      expect(sel1.isSelected({ code: 'C100', title: 'Item 1' })).toBe(true);

      // 2. Extractor function
      const sel2 = useSelection<CustomItem>({
        rowKey: item => `prefix_${item.code}`,
      });
      sel2.select({ code: 'C200', title: 'Item 2' });
      expect(sel2.selectedKeys.value).toEqual(['prefix_C200']);
      expect(sel2.isSelected({ code: 'C200', title: 'Item 2' })).toBe(true);
    });
    scope.stop();
  });

  it('should handle atomic select, deselect, toggle and clear idempotently', () => {
    const scope = effectScope();
    scope.run(() => {
      const {
        selectedKeys,
        selectedRows,
        selectedCount,
        select,
        deselect,
        toggle,
        clear,
        isSelected,
      } = useSelection<TestItem>();

      const item1: TestItem = { id: '1', name: 'Item 1' };
      const item2: TestItem = { id: 2, name: 'Item 2' };

      // 1. select single and duplicate check
      select(item1);
      select(item1); // duplicate select should be idempotent
      expect(selectedCount.value).toBe(1);
      expect(selectedKeys.value).toEqual(['1']);
      expect(selectedRows.value).toEqual([item1]);

      // 2. select batch
      select([item2]);
      expect(selectedCount.value).toBe(2);
      expect(selectedKeys.value).toContain('1');
      expect(selectedKeys.value).toContain('2'); // number 2 normalized to '2'

      // 3. toggle
      toggle(item1);
      expect(selectedCount.value).toBe(1);
      expect(isSelected(item1)).toBe(false);
      expect(isSelected(item2)).toBe(true);

      toggle(item1);
      expect(selectedCount.value).toBe(2);
      expect(isSelected(item1)).toBe(true);

      // 4. deselect
      deselect(item2);
      expect(selectedCount.value).toBe(1);
      expect(selectedKeys.value).toEqual(['1']);

      // 5. clear
      clear();
      expect(selectedCount.value).toBe(0);
      expect(selectedKeys.value).toEqual([]);
      expect(selectedRows.value).toEqual([]);
    });
    scope.stop();
  });

  it('should support selectAll and deselectAll for batch rows', () => {
    const scope = effectScope();
    scope.run(() => {
      const { selectedKeys, selectedCount, selectAll, deselect } = useSelection<TestItem>();

      const page1: TestItem[] = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
        { id: '3', name: 'Item 3' },
      ];

      selectAll(page1);
      expect(selectedCount.value).toBe(3);
      expect(selectedKeys.value).toEqual(['1', '2', '3']);

      // Deselect a subset
      deselect([page1[0], page1[1]]);
      expect(selectedCount.value).toBe(1);
      expect(selectedKeys.value).toEqual(['3']);
    });
    scope.stop();
  });

  it('should synchronize cached entity data with fresh page data via syncWithData', () => {
    const scope = effectScope();
    scope.run(() => {
      const { selectedKeys, selectedRows, select, syncWithData } = useSelection<TestItem>();

      // Select item on page 1 with initial status
      const oldItem: TestItem = { id: '100', name: 'Old Name', status: 'pending' };
      select(oldItem);

      expect(selectedRows.value[0]?.status).toBe('pending');
      expect(selectedKeys.value).toEqual(['100']);

      // When page 1 is re-fetched or updated from backend
      const freshPageData: TestItem[] = [
        { id: '100', name: 'New Name', status: 'active' },
        { id: '101', name: 'Other Item', status: 'pending' },
      ];

      syncWithData(freshPageData);

      // Key selection preserved, entity content synchronized to fresh version
      expect(selectedKeys.value).toEqual(['100']);
      expect(selectedRows.value[0]).toEqual({ id: '100', name: 'New Name', status: 'active' });
    });
    scope.stop();
  });
});
