<script setup lang="ts">
/**
 * 批量打印并发队列调度大盘。
 *
 * 演示 50 张出库单受控并发调度、动态限流、响应式进度感知、暂停/恢复/取消生命周期控制，
 * 以及单个单据失败隔离与按需单项重试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, computed, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { usePrint, type BatchPrintResult, type BatchPrintProgress } from '@atengk/print-vue';

interface OutboundItem {
  name: string;
  spec: string;
  qty: number;
  unit: string;
  price: number;
}

interface OutboundOrder {
  id: number;
  orderNo: string;
  customer: string;
  warehouse: string;
  date: string;
  operator: string;
  items: OutboundItem[];
  totalAmount: number;
  status: 'pending' | 'printing' | 'success' | 'failed';
  errorMsg?: string;
}

// 状态机引入
const { queueStatus, batchProgress, printBatch, pauseBatch, resumeBatch, cancelBatch } = usePrint();

// 调度参数与配置
const concurrency = ref(2);
const delayBetweenTasks = ref(30);
const simulateFailure = ref(true);
const selectedOrderCount = ref(50);
const previewOrder = ref<OutboundOrder | null>(null);

// 客户与物料字典
const customerPool = [
  '杭州蚂蚁智能科技有限公司',
  '上海未来智能机器人制造有限公司',
  '深圳大族精密机械有限公司',
  '苏州汇川工控设备有限公司',
  '北京航天精工动力设备厂',
  '南京微创医疗器械有限公司',
  '武汉华工激光工程股份有限公司',
  '成飞精工航空零部件制造部',
];

const materialPool: OutboundItem[] = [
  { name: '微型无刷直流伺服电机', spec: '24V 3000RPM 直径 28mm', unit: '台', price: 185.0, qty: 2 },
  { name: '高精度工业光学编码器', spec: '1024 脉冲/转 差分输出', unit: '个', price: 92.5, qty: 5 },
  { name: '精密行星齿轮减速箱', spec: '减速比 1:10 额定 15N.m', unit: '套', price: 260.0, qty: 1 },
  {
    name: '嵌入式 CANopen 驱动器',
    spec: 'DC12-48V 10A 峰值 20A',
    unit: '块',
    price: 340.0,
    qty: 3,
  },
  { name: '高柔性屏蔽编码器电缆', spec: '4*0.2 + 2*0.5 耐弯曲', unit: '米', price: 14.8, qty: 20 },
  {
    name: '工业航空插头线束公母对插',
    spec: 'M12-8芯 A-Code IP67',
    unit: '套',
    price: 28.0,
    qty: 10,
  },
];

/**
 * 随机生成指定数量的批量出库单数据。
 */
const generateOrders = (count: number): OutboundOrder[] => {
  const list: OutboundOrder[] = [];
  const baseDate = new Date();

  for (let i = 1; i <= count; i++) {
    const padIndex = String(i).padStart(3, '0');
    const orderNo = `CK-${baseDate.getFullYear()}${String(baseDate.getMonth() + 1).padStart(2, '0')}${String(baseDate.getDate()).padStart(2, '0')}-${padIndex}`;
    const customer = customerPool[(i - 1) % customerPool.length];
    const warehouse = i % 2 === 0 ? '华东甲区 1 号立体库' : '华南乙区 3 号综合库';

    // 每张单据包含 2 ~ 4 种物料
    const itemCount = 2 + (i % 3);
    const items: OutboundItem[] = [];
    let total = 0;
    for (let j = 0; j < itemCount; j++) {
      const mat = materialPool[(i + j) % materialPool.length];
      const qty = ((i * 3 + j * 7) % 15) + 1;
      items.push({ ...mat, qty });
      total += mat.price * qty;
    }

    list.push({
      id: i,
      orderNo,
      customer,
      warehouse,
      date: baseDate.toISOString().slice(0, 10),
      operator: i % 2 === 0 ? '张建国' : '李志远',
      items,
      totalAmount: Math.round(total * 100) / 100,
      status: 'pending',
    });
  }
  return list;
};

// 当前单据列表
const orders = ref<OutboundOrder[]>(generateOrders(50));

// 渲染单据 HTML 结构
const renderOrderHtml = (order: OutboundOrder): string => {
  const rows = order.items
    .map(
      (item, idx) => `
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${idx + 1}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${item.name}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; color: #475569;">${item.spec}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right;">${item.qty} ${item.unit}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right;">¥${item.price.toFixed(2)}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; font-weight: bold;">¥${(item.qty * item.price).toFixed(2)}</td>
    </tr>
  `,
    )
    .join('');

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a; max-width: 800px; margin: 0 auto;">
      <div style="text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px;">
        <h2 style="margin: 0; font-size: 20px; letter-spacing: 2px;">企业标准物资出库核验单</h2>
        <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">单据编号: ${order.orderNo} | 发货仓库: ${order.warehouse}</p>
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 12px;">
        <div><strong>收货客户：</strong>${order.customer}</div>
        <div><strong>制单日期：</strong>${order.date}</div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px;">
        <thead>
          <tr style="background-color: #f8fafc;">
            <th style="border: 1px solid #cbd5e1; padding: 6px 8px; width: 40px;">序号</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left;">物资名称</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left;">规格型号</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; width: 70px;">数量</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; width: 80px;">单价</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; width: 90px;">小计</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr style="background-color: #f1f5f9; font-weight: bold;">
            <td colspan="5" style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right;">合计出库总金额：</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; color: #0284c7;">¥${order.totalAmount.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <div style="display: flex; justify-content: space-between; font-size: 12px; color: #475569; margin-top: 24px; padding-top: 8px; border-top: 1px dashed #cbd5e1;">
        <div>出库经办人：${order.operator}</div>
        <div>仓库核对人：____________</div>
        <div>承运签收人：____________</div>
      </div>
    </div>
  `;
};

// 重新生成单据数据
const handleResetOrders = () => {
  orders.value = generateOrders(selectedOrderCount.value);
  previewOrder.value = orders.value[0] || null;
  ElMessage.info(`已重新初始化 ${selectedOrderCount.value} 张出库单待打印数据`);
};

// 启动批量调度
const handleStartBatch = async () => {
  const pendingOrders = orders.value;
  if (pendingOrders.length === 0) {
    ElMessage.warning('待打印单据队列为空');
    return;
  }

  // 重置单据状态为 pending
  pendingOrders.forEach(o => {
    o.status = 'pending';
    o.errorMsg = undefined;
  });

  ElMessage.success(
    `开始启动批量调度，并发数: ${concurrency.value}，总单据数: ${pendingOrders.length}`,
  );

  try {
    const result: BatchPrintResult<OutboundOrder> = await printBatch(
      pendingOrders,
      async (order: OutboundOrder) => {
        order.status = 'printing';
        // 模拟单据渲染微延迟
        await new Promise(r => setTimeout(r, 15));

        // 模拟特定单据偶发故障（用于验证错误隔离与重试）
        if (simulateFailure.value && (order.id === 5 || order.id === 18)) {
          throw new Error(`[模拟驱动异常] 设备网络暂时抖动 (单号: ${order.orderNo})`);
        }

        return renderOrderHtml(order);
      },
      {
        concurrency: concurrency.value,
        delayBetweenTasks: delayBetweenTasks.value,
        continueOnError: true,
        // 自定义单项打印器（模拟驱动执行，避免无头连续弹出 50 次浏览器系统打印窗）
        executeItem: async (_target, item, _index) => {
          const ord = item as OutboundOrder;
          // 模拟物理打印耗时 80ms ~ 150ms
          await new Promise(resolve => setTimeout(resolve, 80 + (ord.id % 5) * 15));
          ord.status = 'success';
        },
        onProgress: (prog: BatchPrintProgress) => {
          // 进度回调中同步对应单据状态
          const failedMap = new Set<number>();
          if (simulateFailure.value) {
            failedMap.add(5);
            failedMap.add(18);
          }
          orders.value.forEach(ord => {
            if (failedMap.has(ord.id) && ord.id <= prog.current) {
              ord.status = 'failed';
              ord.errorMsg = '模拟网络超时或打印机缺纸';
            }
          });
        },
      },
    );

    if (result.status === 'completed') {
      if (result.failedCount > 0) {
        ElMessage.warning(
          `批量打印完成：成功 ${result.successCount} 张，异常隔离 ${result.failedCount} 张`,
        );
      } else {
        ElMessage.success(`全部 ${result.successCount} 张出库单已全量完成打印调度！`);
      }
    } else if (result.status === 'cancelled') {
      ElMessage.info(`批量打印队列已被人工取消，已完成 ${result.successCount} 张`);
    }
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '批量打印调度异常');
  }
};

// 单项/全量重试失败任务
const handleRetryFailed = async () => {
  const failedOrders = orders.value.filter(o => o.status === 'failed');
  if (failedOrders.length === 0) {
    ElMessage.info('当前没有需要重试的失败单据');
    return;
  }

  // 关闭模拟故障以保证重试成功
  simulateFailure.value = false;
  failedOrders.forEach(o => {
    o.status = 'pending';
    o.errorMsg = undefined;
  });

  ElMessage.info(`开始重试 ${failedOrders.length} 张异常单据...`);

  await printBatch(
    failedOrders,
    async (order: OutboundOrder) => {
      order.status = 'printing';
      await new Promise(r => setTimeout(r, 20));
      return renderOrderHtml(order);
    },
    {
      concurrency: concurrency.value,
      executeItem: async (_target, item) => {
        const ord = item as OutboundOrder;
        await new Promise(resolve => setTimeout(resolve, 60));
        ord.status = 'success';
      },
    },
  );

  ElMessage.success('失败单据已全部重试成功！');
};

// 状态文本与标签映射
const statusText = computed(() => {
  switch (queueStatus.value) {
    case 'running':
      return '并发运行中';
    case 'paused':
      return '已暂停';
    case 'cancelled':
      return '已取消';
    case 'completed':
      return '调度完成';
    default:
      return '就绪待命';
  }
});

const statusTagType = computed(() => {
  switch (queueStatus.value) {
    case 'running':
      return 'primary';
    case 'paused':
      return 'warning';
    case 'cancelled':
      return 'danger';
    case 'completed':
      return 'success';
    default:
      return 'info';
  }
});

// 组件卸载时释放调度器
onUnmounted(() => {
  if (queueStatus.value === 'running' || queueStatus.value === 'paused') {
    cancelBatch();
  }
});
</script>

<template>
  <div class="batch-queue-container">
    <!-- 顶部调度控制台 -->
    <el-card shadow="never" class="control-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span class="title">⚡ 批量打印并发队列调度器大盘</span>
            <el-tag :type="statusTagType" effect="dark" size="small">{{ statusText }}</el-tag>
          </div>
          <div class="header-right">
            <el-radio-group
              v-model="selectedOrderCount"
              size="small"
              :disabled="queueStatus === 'running' || queueStatus === 'paused'"
              @change="handleResetOrders"
            >
              <el-radio-button :value="10">10 张</el-radio-button>
              <el-radio-button :value="50">50 张 (标杆)</el-radio-button>
              <el-radio-button :value="100">100 张</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>

      <!-- 参数调节栏 -->
      <div class="param-row">
        <div class="param-item">
          <span class="label">并发执行度 (Concurrency):</span>
          <el-slider
            v-model="concurrency"
            :min="1"
            :max="5"
            :step="1"
            show-stops
            :disabled="queueStatus === 'running' || queueStatus === 'paused'"
            style="width: 140px; margin: 0 12px"
          />
          <el-tag size="small" type="info">{{ concurrency }} 路并行</el-tag>
        </div>

        <div class="param-item">
          <span class="label">任务缓冲延迟:</span>
          <el-input-number
            v-model="delayBetweenTasks"
            :min="0"
            :max="500"
            :step="20"
            size="small"
            :disabled="queueStatus === 'running' || queueStatus === 'paused'"
          />
          <span class="unit">ms</span>
        </div>

        <div class="param-item">
          <el-checkbox
            v-model="simulateFailure"
            :disabled="queueStatus === 'running' || queueStatus === 'paused'"
          >
            注入偶发故障（测试隔离与重试）
          </el-checkbox>
        </div>
      </div>

      <!-- 控制按钮栏 -->
      <div class="action-row">
        <el-button
          type="primary"
          :disabled="queueStatus === 'running' || queueStatus === 'paused'"
          @click="handleStartBatch"
        >
          🚀 启动批量并发打印
        </el-button>

        <el-button type="warning" :disabled="queueStatus !== 'running'" @click="pauseBatch">
          ⏸️ 暂停队列
        </el-button>

        <el-button type="success" :disabled="queueStatus !== 'paused'" @click="resumeBatch">
          ▶️ 恢复队列
        </el-button>

        <el-button
          type="danger"
          :disabled="queueStatus !== 'running' && queueStatus !== 'paused'"
          @click="cancelBatch"
        >
          🛑 取消调度
        </el-button>

        <el-button
          type="warning"
          plain
          :disabled="
            queueStatus === 'running' || queueStatus === 'paused' || batchProgress.failedCount === 0
          "
          @click="handleRetryFailed"
        >
          🔄 重试失败单据 ({{ batchProgress.failedCount }})
        </el-button>

        <el-button
          :disabled="queueStatus === 'running' || queueStatus === 'paused'"
          @click="handleResetOrders"
        >
          重置单据数据
        </el-button>
      </div>

      <!-- 实时指标与进度条 -->
      <div class="progress-section">
        <div class="stats-grid">
          <div class="stat-box">
            <span class="stat-num">{{ orders.length }}</span>
            <span class="stat-title">总单据量</span>
          </div>
          <div class="stat-box text-success">
            <span class="stat-num">{{ batchProgress.successCount }}</span>
            <span class="stat-title">调度成功</span>
          </div>
          <div class="stat-box text-danger">
            <span class="stat-num">{{ batchProgress.failedCount }}</span>
            <span class="stat-title">异常拦截</span>
          </div>
          <div class="stat-box text-primary">
            <span class="stat-num">{{ batchProgress.percentage }}%</span>
            <span class="stat-title">当前执行进度</span>
          </div>
        </div>

        <el-progress
          :percentage="batchProgress.percentage"
          :status="batchProgress.failedCount > 0 ? 'warning' : 'success'"
          :stroke-width="16"
          striped
          :striped-flow="queueStatus === 'running'"
          class="custom-progress"
        />
      </div>
    </el-card>

    <!-- 下半部分：单据列表与单据模板实时拟真抽屉 -->
    <div class="content-row">
      <!-- 单据列表大表 -->
      <el-card shadow="never" class="table-card">
        <template #header>
          <div class="table-header">
            <span>📋 出库单队列明细 (共 {{ orders.length }} 张)</span>
            <span class="table-hint">点击行可即时预览打印模板</span>
          </div>
        </template>

        <el-table
          :data="orders"
          height="460"
          stripe
          border
          size="small"
          highlight-current-row
          @row-click="(row: OutboundOrder) => (previewOrder = row)"
        >
          <el-table-column prop="id" label="#" width="50" align="center" />
          <el-table-column prop="orderNo" label="出库单号" width="180" />
          <el-table-column prop="customer" label="客户公司" min-width="180" show-overflow-tooltip />
          <el-table-column prop="warehouse" label="发货仓库" width="150" show-overflow-tooltip />
          <el-table-column label="物料数" width="80" align="center">
            <template #default="{ row }"> {{ row.items.length }} 种 </template>
          </el-table-column>
          <el-table-column prop="totalAmount" label="总金额" width="100" align="right">
            <template #default="{ row }"> ¥{{ row.totalAmount.toFixed(2) }} </template>
          </el-table-column>
          <el-table-column prop="status" label="打印状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.status === 'success'" type="success" size="small"> 已完成 </el-tag>
              <el-tag v-else-if="row.status === 'printing'" type="primary" size="small">
                打印中
              </el-tag>
              <el-tag v-else-if="row.status === 'failed'" type="danger" size="small"> 异常 </el-tag>
              <el-tag v-else type="info" size="small"> 排队中 </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="errorMsg"
            label="执行备注 / 错误日志"
            min-width="160"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <span v-if="row.errorMsg" class="error-msg">{{ row.errorMsg }}</span>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 单据排版拟真预览卡片 -->
      <el-card shadow="never" class="preview-card">
        <template #header>
          <div class="preview-header">
            <span>👁️ 选定单据排版模板实时拟真</span>
            <el-tag v-if="previewOrder" size="small" type="info">{{ previewOrder.orderNo }}</el-tag>
          </div>
        </template>

        <div v-if="previewOrder" class="preview-body">
          <div class="sheet-container">
            <div class="sheet-title-box">
              <h2 class="sheet-main-title">企业标准物资出库核验单</h2>
              <p class="sheet-subtitle">
                单据编号: {{ previewOrder.orderNo }} | 发货仓库: {{ previewOrder.warehouse }}
              </p>
            </div>

            <div class="sheet-meta-row">
              <div><strong>收货客户：</strong>{{ previewOrder.customer }}</div>
              <div><strong>制单日期：</strong>{{ previewOrder.date }}</div>
            </div>

            <table class="sheet-table">
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center">序号</th>
                  <th style="text-align: left">物资名称</th>
                  <th style="text-align: left">规格型号</th>
                  <th style="width: 70px; text-align: right">数量</th>
                  <th style="width: 80px; text-align: right">单价</th>
                  <th style="width: 90px; text-align: right">小计</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in previewOrder.items" :key="idx">
                  <td style="text-align: center">{{ idx + 1 }}</td>
                  <td>{{ item.name }}</td>
                  <td class="sheet-spec">{{ item.spec }}</td>
                  <td style="text-align: right">{{ item.qty }} {{ item.unit }}</td>
                  <td style="text-align: right">¥{{ item.price.toFixed(2) }}</td>
                  <td style="text-align: right; font-weight: bold">
                    ¥{{ (item.qty * item.price).toFixed(2) }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="sheet-total-row">
                  <td colspan="5" style="text-align: right">合计出库总金额：</td>
                  <td style="text-align: right; color: #0284c7">
                    ¥{{ previewOrder.totalAmount.toFixed(2) }}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div class="sheet-signature-row">
              <div>出库经办人：{{ previewOrder.operator }}</div>
              <div>仓库核对人：____________</div>
              <div>承运签收人：____________</div>
            </div>
          </div>
        </div>
        <div v-else class="empty-preview">
          <span>请在左侧列表中选定一张出库单查看拟真排版</span>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.batch-queue-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.param-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
  padding: 12px 16px;
  background-color: #f8fafc;
  border-radius: 6px;
  margin-bottom: 16px;
}

.param-item {
  display: flex;
  align-items: center;
}

.param-item .label {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
}

.param-item .unit {
  font-size: 12px;
  color: #64748b;
  margin-left: 6px;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-box {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
}

.stat-title {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.text-success .stat-num {
  color: #10b981;
}

.text-danger .stat-num {
  color: #ef4444;
}

.text-primary .stat-num {
  color: #3b82f6;
}

.custom-progress {
  margin-top: 4px;
}

.content-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.table-card,
.preview-card {
  border-radius: 8px;
}

.table-header,
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.table-hint {
  font-size: 12px;
  color: #94a3b8;
  font-weight: normal;
}

.preview-body {
  max-height: 460px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background-color: #ffffff;
}

.sheet-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 24px;
  color: #0f172a;
}

.sheet-title-box {
  text-align: center;
  border-bottom: 2px solid #0284c7;
  padding-bottom: 12px;
  margin-bottom: 16px;
}

.sheet-main-title {
  margin: 0;
  font-size: 18px;
  letter-spacing: 2px;
}

.sheet-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: #64748b;
}

.sheet-meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 12px;
}

.sheet-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin-bottom: 16px;
}

.sheet-table th,
.sheet-table td {
  border: 1px solid #cbd5e1;
  padding: 6px 8px;
}

.sheet-table th {
  background-color: #f8fafc;
}

.sheet-spec {
  font-size: 11px;
  color: #475569;
}

.sheet-total-row {
  background-color: #f1f5f9;
  font-weight: bold;
}

.sheet-signature-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #475569;
  margin-top: 24px;
  padding-top: 8px;
  border-top: 1px dashed #cbd5e1;
}

.empty-preview {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 13px;
}

.error-msg {
  color: #ef4444;
  font-size: 12px;
}

.text-muted {
  color: #94a3b8;
}
</style>
