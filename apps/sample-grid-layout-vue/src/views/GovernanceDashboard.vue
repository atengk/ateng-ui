<script setup lang="ts">
/**
 * 企业级双模治理、触控防冲突与数据自愈容灾展厅看板 (Dashboard 6)。
 *
 * 验证 EditViewDualMode 运行只读与编辑态无缝切换，
 * 验证 TouchScrollDefense 触控防冲突与轻扫滚动页面保护，
 * 验证 LayoutSanitizer 针对越界/负数/重叠脏数据的纯函数自愈容灾，
 * 验证 TabWakeupHealing 从 0 尺寸容器唤醒自动自愈。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { nextTick, ref } from 'vue';
import { AtengGridLayout, AtengGridItem, sanitizeLayout } from '@atengk/grid-layout-vue';
import type { GridLayoutItem } from '@atengk/grid-layout-vue';
import { ElMessage } from 'element-plus';

interface GovernanceCardPayload {
  title: string;
  category: string;
  desc: string;
  tag: string;
  type?: 'normal' | 'dirty' | 'healed';
}

// 正常合法初始布局
const standardCards: GridLayoutItem<GovernanceCardPayload>[] = [
  {
    id: 'gov-mode',
    x: 0,
    y: 0,
    w: 6,
    h: 3,
    data: {
      title: '🛡️ 运行/编辑双模态治理',
      category: '安全边界',
      desc: '运行态 (只读) 下禁用拖拽拉伸并隐藏调节手柄，鼠标恢复默认指针，防止生产巡检误触。',
      tag: 'DualMode',
      type: 'normal',
    },
  },
  {
    id: 'gov-touch',
    x: 6,
    y: 0,
    w: 6,
    h: 3,
    data: {
      title: '📱 触控防冲突与轻扫保护',
      category: '移动适配',
      desc: '移动/平板端轻扫卡片主体优先响应原生页面垂直滚动，手柄配置防误触机制。',
      tag: 'TouchDefense',
      type: 'normal',
    },
  },
  {
    id: 'gov-healing',
    x: 0,
    y: 3,
    w: 6,
    h: 3,
    data: {
      title: '⚡ Tab/弹窗唤醒自愈 (0x0 恢复)',
      category: '生命周期',
      desc: '监听从隐藏 Tab 切换至可见时的唤醒时刻，自动调用 onParentResize 重新计算几何尺寸，杜绝白屏。',
      tag: 'WakeupHealing',
      type: 'normal',
    },
  },
  {
    id: 'gov-sanitizer',
    x: 6,
    y: 3,
    w: 6,
    h: 3,
    data: {
      title: '🧪 脏数据坐标清洗与碰撞自愈',
      category: '数据容灾',
      desc: '外部导入 JSON 坐标含负数、超限列宽 (w > 12) 或坐标重合时，纯函数纯净清洗并寻空安置。',
      tag: 'Sanitizer',
      type: 'normal',
    },
  },
];

const layout = ref<GridLayoutItem<GovernanceCardPayload>[]>(
  JSON.parse(JSON.stringify(standardCards)),
);

const editable = ref(false); // 默认运行只读态
const showGridLines = ref(true);
const isTabHidden = ref(false); // 模拟隐藏 Tab / 0 尺寸
const gridRef = ref<InstanceType<typeof AtengGridLayout> | null>(null);

// 脏数据样本
const injectDirtyData = () => {
  const dirtyCards: GridLayoutItem<GovernanceCardPayload>[] = [
    {
      id: 'dirty-overflow',
      x: 10,
      y: 0,
      w: 8, // 10 + 8 = 18 > 12 (越界溢出！)
      h: 3,
      data: {
        title: '⚠️ 越界卡片 (w: 8, x: 10 > 12)',
        category: '越界异常',
        desc: '跨度总和达到 18 列，若不清洗将导致布局错乱撑破容器！',
        tag: 'Overflow',
        type: 'dirty',
      },
    },
    {
      id: 'dirty-negative',
      x: -4,
      y: -2,
      w: -1,
      h: 0,
      data: {
        title: '⚠️ 负数极端值 (x: -4, w: -1)',
        category: '数值非法',
        desc: '坐标为负数且尺寸小于等于 0，属于典型外部异常输入！',
        tag: 'Negative',
        type: 'dirty',
      },
    },
    {
      id: 'dirty-collision-1',
      x: 0,
      y: 0,
      w: 6,
      h: 3,
      data: {
        title: '⚠️ 重叠卡片 A (0, 0, 6, 3)',
        category: '碰撞重叠',
        desc: '卡片 A 与卡片 B 占据完全相同的二维空间！',
        tag: 'Collision',
        type: 'dirty',
      },
    },
    {
      id: 'dirty-collision-2',
      x: 0,
      y: 0,
      w: 6,
      h: 3,
      data: {
        title: '⚠️ 重叠卡片 B (0, 0, 6, 3)',
        category: '碰撞重叠',
        desc: '卡片 B 与卡片 A 重叠冲突！',
        tag: 'Collision',
        type: 'dirty',
      },
    },
  ];

  layout.value = dirtyCards;
  ElMessage.warning('已注入越界/负数/重叠脏数据！点击“执行 LayoutSanitizer 自愈”进行容灾清洗。');
};

// 执行清洗自愈
const executeSanitize = () => {
  layout.value = sanitizeLayout<GovernanceCardPayload>(layout.value, 12).map(item => ({
    ...item,
    data: {
      ...item.data!,
      type: 'healed',
      desc: `✅ 已自愈：最新安全坐标为 (${item.x}, ${item.y})，跨度为 ${item.w}×${item.h}。`,
    },
  }));
  ElMessage.success('LayoutSanitizer 清洗成功！所有异常卡片已自愈裁剪并安置于空闲槽位。');
};

// 重置布局
const resetToStandard = () => {
  layout.value = JSON.parse(JSON.stringify(standardCards));
  ElMessage.info('已恢复标准生产治理布局');
};

// 触发隐藏与唤醒
const toggleTabHidden = () => {
  isTabHidden.value = !isTabHidden.value;
  if (!isTabHidden.value) {
    nextTick(() => {
      gridRef.value?.wakeUp();
      ElMessage.success('Tab 重新唤醒显示！已触发 wakeUp() 自动重绘几何尺寸。');
    });
  }
};
</script>

<template>
  <div class="governance-dashboard">
    <!-- 顶部状态栏 -->
    <div class="dashboard-header">
      <div class="header-left">
        <h2 class="dashboard-title">看板 6：企业级双模治理、触控防冲突与脏数据自愈容灾</h2>
        <p class="dashboard-desc">
          验证 <code>editable</code> 双模治理：只读模式下完全隐藏调节手柄并复位鼠标指针； 验证
          <code>touch-action: pan-y</code> 移动端触控轻扫滚动保护； 验证
          <code>sanitizeLayout()</code> 纯函数清洗越界/重叠脏 JSON； 验证从 <code>0x0</code> 隐藏
          Tab 唤醒时尺寸自动自愈无白屏。
        </p>
      </div>
      <div class="header-metrics">
        <el-tag :type="editable ? 'danger' : 'success'" size="large">
          当前模式: {{ editable ? '🛠️ 编辑设计态' : '👁️ 生产只读态' }}
        </el-tag>
        <el-tag type="info" size="large">卡片项: {{ layout.length }} 项</el-tag>
      </div>
    </div>

    <!-- 工具控制面板 -->
    <el-card class="control-card" shadow="never">
      <div class="control-row">
        <div class="control-group">
          <span class="control-label">编辑/只读双模切换:</span>
          <el-switch
            v-model="editable"
            active-text="编辑设计态"
            inactive-text="生产只读态"
            active-color="#e6a23c"
          />
        </div>

        <div class="control-group">
          <span class="control-label">纯 CSS 参考网格:</span>
          <el-switch v-model="showGridLines" />
        </div>

        <div class="control-group action-buttons">
          <el-button type="warning" size="small" @click="injectDirtyData">
            🧪 注入越界与重叠脏数据
          </el-button>
          <el-button type="success" size="small" @click="executeSanitize">
            🛡️ 执行 LayoutSanitizer 自愈
          </el-button>
          <el-button
            size="small"
            :type="isTabHidden ? 'danger' : 'default'"
            @click="toggleTabHidden"
          >
            {{ isTabHidden ? '👁️ 取消隐藏 (唤醒自愈)' : '🙈 模拟容器隐藏 (0x0)' }}
          </el-button>
          <el-button size="small" @click="resetToStandard"> 🔄 重置标准布局 </el-button>
        </div>
      </div>
    </el-card>

    <!-- 模拟隐藏 Tab 占位 -->
    <div v-if="isTabHidden" class="hidden-tab-placeholder">
      <div class="placeholder-content-box">
        <span class="placeholder-icon">💤</span>
        <h3>容器已处于隐藏态 (display: none / 0x0 像素)</h3>
        <p>点击上方“取消隐藏 (唤醒自愈)”测试网格尺寸自愈重绘</p>
      </div>
    </div>

    <!-- 网格画布容器 -->
    <div v-show="!isTabHidden" class="governance-canvas-wrapper">
      <AtengGridLayout
        ref="gridRef"
        v-model:layout="layout"
        :cell-height="'100px'"
        :show-grid-lines="showGridLines"
        :editable="editable"
      >
        <AtengGridItem v-for="item in layout" :key="item.id" :item="item">
          <template
            #default="{
              isDragging,
              isResizing,
              isMaximized,
              isCollapsed,
              toggleMaximize,
              toggleCollapse,
            }"
          >
            <div
              class="gov-card"
              :class="{
                'gov-card--dragging': isDragging,
                'gov-card--resizing': isResizing,
                'gov-card--maximized': isMaximized,
                'gov-card--collapsed': isCollapsed,
                'gov-card--dirty': item.data?.type === 'dirty',
                'gov-card--healed': item.data?.type === 'healed',
              }"
            >
              <!-- 卡片头部手柄 -->
              <div class="gov-card-header at-grid-drag-handle">
                <div class="header-left-meta">
                  <span v-if="editable" class="drag-icon">⋮⋮</span>
                  <span class="card-title">{{ item.data?.title }}</span>
                </div>
                <div class="header-right-meta">
                  <el-tag
                    size="small"
                    :type="item.data?.type === 'dirty' ? 'danger' : 'primary'"
                    effect="plain"
                  >
                    {{ item.w }}×{{ item.h }} ({{ item.x }}, {{ item.y }})
                  </el-tag>
                  <el-tag size="small" type="info">
                    {{ item.data?.tag }}
                  </el-tag>
                  <div
                    v-if="editable"
                    class="card-action-btn-group"
                    @pointerdown.stop
                    @mousedown.stop
                  >
                    <el-button
                      size="small"
                      link
                      :type="isCollapsed ? 'warning' : 'info'"
                      @click="toggleCollapse"
                    >
                      {{ isCollapsed ? '🔽' : '🔼' }}
                    </el-button>
                    <el-button
                      size="small"
                      link
                      :type="isMaximized ? 'primary' : 'info'"
                      @click="toggleMaximize"
                    >
                      {{ isMaximized ? '🗗' : '⛶' }}
                    </el-button>
                  </div>
                </div>
              </div>

              <!-- 卡片内容主体 -->
              <div v-show="!isCollapsed" class="gov-card-body">
                <div class="gov-card-badge">
                  <span class="badge-dot" />
                  <span class="badge-category">{{ item.data?.category }}</span>
                </div>
                <p class="gov-card-desc">{{ item.data?.desc }}</p>
                <div class="gov-card-footer">
                  <span class="coord-tag">gs-id: {{ item.id }}</span>
                  <span v-if="!editable" class="readonly-badge">🔒 运行只读保护生效</span>
                </div>
              </div>

              <div v-if="isCollapsed" class="gov-card-collapsed-tip">
                <span>⚡ 卡片已折叠收起</span>
              </div>
            </div>
          </template>
        </AtengGridItem>
      </AtengGridLayout>
    </div>
  </div>
</template>

<style scoped>
.governance-dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
}

.dashboard-title {
  font-size: 18px;
  margin: 0 0 6px 0;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.dashboard-desc {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.dashboard-desc code {
  background-color: var(--el-fill-color-light);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--el-color-primary);
}

.header-metrics {
  display: flex;
  gap: 12px;
}

.control-card {
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
}

.control-row {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.action-buttons {
  margin-left: auto;
}

.hidden-tab-placeholder {
  min-height: 400px;
  background-color: var(--el-fill-color-lighter);
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-content-box {
  text-align: center;
  color: var(--el-text-color-secondary);
}

.placeholder-icon {
  font-size: 40px;
}

.governance-canvas-wrapper {
  background-color: var(--el-bg-color-page);
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  padding: 12px;
  min-height: 500px;
  box-sizing: border-box;
}

.gov-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--at-grid-border-radius, 8px);
  box-shadow: var(--el-box-shadow-lighter);
  overflow: hidden;
  box-sizing: border-box;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.gov-card--dragging,
.gov-card--resizing {
  border-color: var(--el-color-primary);
  box-shadow: var(--el-box-shadow);
}

.gov-card--maximized {
  border-color: var(--el-color-primary);
  box-shadow: var(--el-box-shadow-dark);
}

.gov-card--collapsed {
  border-style: dashed;
}

.gov-card--dirty {
  border-color: var(--el-color-danger);
  background-color: var(--el-color-danger-light-9);
}

.gov-card--healed {
  border-color: var(--el-color-success);
}

.gov-card-header {
  padding: 8px 12px;
  background-color: var(--el-fill-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.drag-icon {
  color: var(--el-text-color-placeholder);
  cursor: grab;
  font-weight: bold;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.header-right-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.card-action-btn-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 4px;
}

.gov-card-body {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  box-sizing: border-box;
}

.gov-card-badge {
  display: flex;
  align-items: center;
  gap: 6px;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--el-color-primary);
}

.badge-category {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.gov-card-desc {
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.5;
  margin: 0;
  flex: 1;
}

.gov-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  font-size: 11px;
}

.coord-tag {
  color: var(--el-text-color-secondary);
  font-family: Consolas, Monaco, monospace;
}

.readonly-badge {
  color: var(--el-color-success);
  font-weight: 500;
}

.gov-card-collapsed-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background-color: var(--el-fill-color-lighter);
}
</style>
