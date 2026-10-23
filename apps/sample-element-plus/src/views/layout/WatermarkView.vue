<script setup lang="ts">
/**
 * 企业级安全防篡改水印容器 AtengWatermark 自验页面。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import { ref, computed } from 'vue';
import {
  ElButton,
  ElSwitch,
  ElInput,
  ElSlider,
  ElColorPicker,
  ElAlert,
  ElCard,
  ElTable,
  ElTableColumn,
  ElTag,
  ElMessage,
} from 'element-plus';
import { AtengWatermark, type AtengWatermarkInstance } from '@atengk/element-plus';

// 1. 水印控制配置项
const watermarkText = ref('机密资产 · 张三 (10086)');
const currentDepartment = ref('数字化研发中心');
const showTimestamp = ref(true);
const rotateAngle = ref(-22);
const fontSize = ref(14);
const fontColor = ref('rgba(0, 0, 0, 0.12)');
const gapX = ref(100);
const gapY = ref(100);
const unitWidth = ref(240);
const unitHeight = ref(140);
const isAntiTamper = ref(true);
const isFull = ref(false);

const watermarkRef = ref<AtengWatermarkInstance | null>(null);

// 2. 多行水印内容组合
const watermarkContent = computed(() => {
  const lines = [watermarkText.value, currentDepartment.value];
  if (showTimestamp.value) {
    lines.push('2026-10-23 10:30 (只读审计)');
  }
  return lines;
});

// 3. 模拟敏感业务表格数据
const tableData = [
  {
    id: '10001',
    name: '王晓明',
    role: '系统安全管理员',
    phone: '138****8899',
    salary: '￥32,000',
    status: '正常',
  },
  {
    id: '10002',
    name: '李佳琪',
    role: '核心财务总监',
    phone: '139****1234',
    salary: '￥45,000',
    status: '正常',
  },
  {
    id: '10003',
    name: '张伟',
    role: '资深云原生架构师',
    phone: '137****5678',
    salary: '￥38,000',
    status: '审计中',
  },
  {
    id: '10004',
    name: '刘小华',
    role: '数据合规专员',
    phone: '136****9988',
    salary: '￥28,000',
    status: '正常',
  },
];

// 4. 防篡改攻防演练交互
const simulateStyleTamper = () => {
  const container = watermarkRef.value?.$el as HTMLElement;
  const mask = container?.querySelector('.at-watermark__mask') as HTMLElement;
  if (!mask) {
    ElMessage.warning('未找到水印遮罩节点！');
    return;
  }

  // 模拟黑客注入 display: none / opacity: 0 抹除水印
  mask.style.display = 'none';
  mask.style.opacity = '0';
  mask.style.visibility = 'hidden';

  ElMessage.error({
    message:
      '⚠️ 模拟黑客篡改：注入了 display: none 与 opacity: 0！正在观察 MutationObserver 自愈...',
    duration: 2500,
  });
};

const simulateNodeRemoval = () => {
  const container = watermarkRef.value?.$el as HTMLElement;
  const mask = container?.querySelector('.at-watermark__mask') as HTMLElement;
  if (!mask) {
    ElMessage.warning('未找到水印遮罩节点！');
    return;
  }

  // 模拟黑客在控制台删除水印 DOM
  mask.remove();

  ElMessage.error({
    message: '🚨 模拟黑客删除：已从 DOM 树物理移除水印遮罩！正在观察 MutationObserver 自愈...',
    duration: 2500,
  });
};

const handleRefresh = () => {
  watermarkRef.value?.generateWatermark();
  ElMessage.success('水印画布已重新绘制！');
};
</script>

<template>
  <div class="watermark-view">
    <ElAlert
      title="AtengWatermark 企业级安全防篡改水印容器"
      type="info"
      description="离屏 Canvas 矢量渲染：支持多行文本、字体自定义、透明度与旋转角度；主动防御不变量：标配 MutationObserver 严密监听 style 属性篡改与 DOM 物理删除，并在微任务队列防抖瞬间重插重绘，彻底防御 F12 恶意抹除；零内存泄露：生命周期安全清理。"
      show-icon
      :closable="false"
      style="margin-bottom: 20px"
    />

    <!-- 控制面板 -->
    <ElCard class="ctrl-card" shadow="never">
      <div class="ctrl-grid">
        <div class="ctrl-item">
          <span class="label">主文案：</span>
          <ElInput
            v-model="watermarkText"
            placeholder="请输入水印文本"
            size="small"
            style="width: 220px"
          />
        </div>
        <div class="ctrl-item">
          <span class="label">部门信息：</span>
          <ElInput
            v-model="currentDepartment"
            placeholder="请输入部门"
            size="small"
            style="width: 180px"
          />
        </div>
        <div class="ctrl-item">
          <span class="label">动态时间戳：</span>
          <ElSwitch v-model="showTimestamp" />
        </div>
        <div class="ctrl-item">
          <span class="label">防篡改守卫：</span>
          <ElSwitch v-model="isAntiTamper" />
          <ElTag :type="isAntiTamper ? 'success' : 'danger'" size="small" style="margin-left: 8px">
            {{ isAntiTamper ? '主动防御开启' : '防御关闭' }}
          </ElTag>
        </div>
        <div class="ctrl-item">
          <span class="label">全屏水印 (fixed)：</span>
          <ElSwitch v-model="isFull" />
        </div>
        <div class="ctrl-item">
          <span class="label">字体颜色：</span>
          <ElColorPicker v-model="fontColor" show-alpha size="small" />
        </div>
      </div>

      <div class="slider-grid" style="margin-top: 16px">
        <div class="slider-item">
          <span class="label">旋转角度 ({{ rotateAngle }}°)：</span>
          <ElSlider v-model="rotateAngle" :min="-90" :max="90" style="width: 200px" />
        </div>
        <div class="slider-item">
          <span class="label">字号 ({{ fontSize }}px)：</span>
          <ElSlider v-model="fontSize" :min="10" :max="28" style="width: 160px" />
        </div>
        <div class="slider-item">
          <span class="label">水平间距 ({{ gapX }}px)：</span>
          <ElSlider v-model="gapX" :min="40" :max="200" style="width: 160px" />
        </div>
        <div class="slider-item">
          <span class="label">垂直间距 ({{ gapY }}px)：</span>
          <ElSlider v-model="gapY" :min="40" :max="200" style="width: 160px" />
        </div>
      </div>

      <!-- 防篡改攻防演练触发区 -->
      <div
        class="attack-bar"
        style="margin-top: 20px; padding-top: 16px; border-top: 1px dashed var(--el-border-color)"
      >
        <span style="font-weight: 600; margin-right: 12px; color: var(--el-color-danger)"
          >🛡️ 防篡改攻防演练：</span
        >
        <ElButton type="danger" size="small" @click="simulateStyleTamper">
          模拟 DevTools 注入 display: none
        </ElButton>
        <ElButton type="danger" size="small" @click="simulateNodeRemoval">
          模拟 DevTools 物理删除 DOM 节点
        </ElButton>
        <ElButton type="primary" size="small" @click="handleRefresh"> 重新绘制水印 </ElButton>
      </div>
    </ElCard>

    <!-- 受水印保护的敏感数据卡片 -->
    <div style="margin-top: 20px">
      <AtengWatermark
        ref="watermarkRef"
        :content="watermarkContent"
        :rotate="rotateAngle"
        :gap="[gapX, gapY]"
        :width="unitWidth"
        :height="unitHeight"
        :font="{ color: fontColor, fontSize: fontSize }"
        :anti-tamper="isAntiTamper"
        :full="isFull"
      >
        <ElCard class="data-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span style="font-weight: 600; font-size: 16px"
                >🔐 核心资产与涉密人员档案列表（受水印容器保护）</span
              >
              <ElTag type="warning" effect="dark" size="small">机密级 · 禁止私自截屏传播</ElTag>
            </div>
          </template>

          <ElTable :data="tableData" border style="width: 100%">
            <ElTableColumn prop="id" label="员工编号" width="120" />
            <ElTableColumn prop="name" label="姓名" width="140" />
            <ElTableColumn prop="role" label="岗位角色" width="180" />
            <ElTableColumn prop="phone" label="联系电话" width="160" />
            <ElTableColumn prop="salary" label="薪资标准" width="140" />
            <ElTableColumn prop="status" label="状态">
              <template #default="{ row }">
                <ElTag :type="row.status === '正常' ? 'success' : 'warning'" size="small">
                  {{ row.status }}
                </ElTag>
              </template>
            </ElTableColumn>
          </ElTable>

          <div style="margin-top: 16px; color: var(--el-text-color-secondary); font-size: 13px">
            💡 提示：尝试打开浏览器 F12 控制台审查上方水印遮罩层，无论手动删除 DOM 还是在 Styles
            面板勾选隐藏，水印均会在微秒级自动自愈重现。
          </div>
        </ElCard>
      </AtengWatermark>
    </div>
  </div>
</template>

<style scoped>
.watermark-view {
  padding: 16px;
}

.ctrl-card {
  margin-bottom: 20px;
}

.ctrl-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.ctrl-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.slider-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: center;
}

.slider-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-size: 13px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
