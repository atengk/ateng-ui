<script setup lang="ts">
/**
 * sample-vue 跨页多选与雪花 ID 键值映射状态机自验卡片组件。
 *
 * 验证 useSelection 对跨页勾选集合记忆、雪花 Long ID 大数字符串安全与原子动作。
 *
 * @author Ateng
 * @since 2026-11-04
 */

import { computed, ref } from 'vue';
import { useSelection } from '@atengk/vue';

// 真实业务语义：电商商品中心 SKU 模型（雪花 Long ID 保证为 string）
interface ProductSkuItem {
  id: string; // Snowflake ID (64位大数防截断)
  skuCode: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: 'ONLINE' | 'OFFLINE';
}

// 模拟分页商品数据集（共 2 页）
const page1Data: ProductSkuItem[] = [
  {
    id: '1848939201948576831',
    skuCode: 'SKU-PHONE-001',
    name: '旗舰 5G 智能手机 256GB',
    category: '数码 3C',
    price: 4999,
    stock: 120,
    status: 'ONLINE',
  },
  {
    id: '1848939201948576832',
    skuCode: 'SKU-LAPTOP-002',
    name: '轻薄生产力笔记本 16G+1T',
    category: '电脑办公',
    price: 6899,
    stock: 45,
    status: 'ONLINE',
  },
  {
    id: '1848939201948576833',
    skuCode: 'SKU-WATCH-003',
    name: '户外运动 GPS 智能手表',
    category: '智能穿戴',
    price: 1299,
    stock: 300,
    status: 'ONLINE',
  },
];

const page2Data: ProductSkuItem[] = [
  {
    id: '1848939201948576834',
    skuCode: 'SKU-HEADSET-004',
    name: '头戴式主动降噪蓝牙耳机',
    category: '数码 3C',
    price: 1599,
    stock: 80,
    status: 'ONLINE',
  },
  {
    id: '1848939201948576835',
    skuCode: 'SKU-MOUSE-005',
    name: '人体工学无线双模鼠标',
    category: '电脑办公',
    price: 299,
    stock: 500,
    status: 'OFFLINE',
  },
  {
    id: '1848939201948576836',
    skuCode: 'SKU-KEYBOARD-006',
    name: '客制化机械键盘 87键 RGB',
    category: '电脑办公',
    price: 699,
    stock: 65,
    status: 'ONLINE',
  },
];

const currentPage = ref(1);
const currentList = computed(() => (currentPage.value === 1 ? page1Data : page2Data));

// 初始化跨页多选状态机（默认绑定 id 字段为雪花主键）
const { selectedKeys, selectedCount, isSelected, deselect, toggle, clear, selectAll } =
  useSelection<ProductSkuItem>({
    rowKey: 'id',
  });

// 当前页全选状态判定
const isCurrentPageAllSelected = computed(() => {
  return currentList.value.length > 0 && currentList.value.every(row => isSelected(row));
});

const isCurrentPagePartiallySelected = computed(() => {
  return !isCurrentPageAllSelected.value && currentList.value.some(row => isSelected(row));
});

// 切换当前页全选
const toggleCurrentPageAll = () => {
  if (isCurrentPageAllSelected.value) {
    deselect(currentList.value);
  } else {
    selectAll(currentList.value);
  }
};
</script>

<template>
  <section id="card-selection" class="card">
    <h2>5. 契约跨页多选状态机自验 (useSelection)</h2>
    <p class="desc">
      验证无头响应式选择状态机对 64 位雪花 Long ID
      大数字符串的安全归一化、跨页记忆勾选、单选/全选/反选与排他操作。
    </p>

    <div class="selection-demo">
      <div class="toolbar">
        <div class="page-switcher">
          <button class="btn btn-secondary" :disabled="currentPage === 1" @click="currentPage = 1">
            切换到第 1 页
          </button>
          <button class="btn btn-secondary" :disabled="currentPage === 2" @click="currentPage = 2">
            切换到第 2 页
          </button>
          <span class="page-indicator">当前第 {{ currentPage }} / 2 页</span>
        </div>

        <div class="action-buttons">
          <button class="btn btn-secondary" @click="toggleCurrentPageAll">
            {{ isCurrentPageAllSelected ? '取消当前页全选' : '勾选当前页' }}
          </button>
          <button class="btn btn-secondary" :disabled="selectedCount === 0" @click="clear">
            清空已选 ({{ selectedCount }})
          </button>
        </div>
      </div>

      <!-- 纯原生 HTML 表格 -->
      <div class="table-container">
        <table class="sample-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center">
                <input
                  type="checkbox"
                  :checked="isCurrentPageAllSelected"
                  :indeterminate="isCurrentPagePartiallySelected"
                  @change="toggleCurrentPageAll"
                />
              </th>
              <th>雪花主键 (Long ID)</th>
              <th>SKU 编码</th>
              <th>商品名称</th>
              <th>类目</th>
              <th>单价</th>
              <th>库存</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in currentList"
              :key="item.id"
              :class="{ 'row-selected': isSelected(item) }"
              @click="toggle(item)"
            >
              <td style="text-align: center" @click.stop>
                <input type="checkbox" :checked="isSelected(item)" @change="toggle(item)" />
              </td>
              <td>
                <code>{{ item.id }}</code>
              </td>
              <td>{{ item.skuCode }}</td>
              <td>{{ item.name }}</td>
              <td>{{ item.category }}</td>
              <td>¥{{ item.price }}</td>
              <td>{{ item.stock }} 件</td>
              <td>
                <span
                  :class="[
                    'status-pill',
                    item.status === 'ONLINE' ? 'pill-online' : 'pill-offline',
                  ]"
                >
                  {{ item.status === 'ONLINE' ? '在售' : '下架' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 状态机监视区 -->
      <div class="state-board">
        <div class="board-item">
          <span class="board-label">已选商品总数 (selectedCount):</span>
          <span class="board-value highlight">{{ selectedCount }} 件 (跨页记忆保留)</span>
        </div>
        <div class="board-item">
          <span class="board-label">已选雪花 ID 键值集合 (selectedKeys):</span>
          <div class="keys-list">
            <span v-for="k in selectedKeys" :key="k" class="key-tag">{{ k }}</span>
            <span v-if="selectedKeys.length === 0" class="empty-hint">暂无选中项</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped src="./selection-demo.css"></style>
