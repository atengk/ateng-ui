<script setup lang="ts">
/**
 * C-Lodop 硬件静默直连驱动与多打印机通道路由看板。
 *
 * 验证本地端口探针（HTTPS 8443 / HTTP 8000/18000）、物理打印机通道持久化绑定、
 * 连续打孔纸（241mm × 140mm）走纸规约与离线自动平滑降级至无头浏览器打印。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useLodop, usePrint, type PaperPreset } from '@atengk/print-vue';

// 模拟 C-Lodop 硬件设备池
const mockPrintersList = [
  'DASCOM DS-620 (连续打孔针式平推打印机)',
  'Xprinter XP-420B (电子面单热敏条码机)',
  'HP LaserJet Pro M404n (标准 A4 高速激光机)',
  'EPSON TM-T88VI (80mm 商用收银热敏小票机)',
];

// 模拟硬件驱动环境
const isMockServiceActive = ref(true);

const getMockLodop = () => {
  if (!isMockServiceActive.value) {
    return null;
  }
  return {
    GET_PRINTER_COUNT: () => mockPrintersList.length,
    GET_PRINTER_NAME: (index: number) => mockPrintersList[index] || '',
    PRINT_INIT: () => {},
    SET_PRINT_PAGESIZE: () => {},
    SET_PRINTER_INDEX_OR_NAME: () => true,
    SET_PRINT_COPIES: () => {},
    ADD_PRINT_HTM: () => {},
    PRINT: () => true,
    PREVIEW: () => true,
  };
};

// 状态机初始化
const {
  isServiceAvailable,
  isDetecting,
  printers,
  channelBindings,
  detectService,
  bindChannel,
  unbindChannel,
  printWithChannel,
} = useLodop({
  getLodop: getMockLodop,
  timeoutMs: 1000,
});

const { print } = usePrint();

// 通道定义
interface ChannelMeta {
  key: string;
  label: string;
  desc: string;
  defaultPaper: PaperPreset;
}

const businessChannels: ChannelMeta[] = [
  {
    key: 'continuous',
    label: '连续打孔多联单',
    desc: '商业发货三联单、仓储调拨联（等分 1/2，高 140mm）',
    defaultPaper: 'continuous-241-140',
  },
  {
    key: 'waybill',
    label: '电子物流面单',
    desc: '菜鸟/顺丰 100mm × 150mm 三联标准热敏单',
    defaultPaper: 'receipt-80',
  },
  {
    key: 'invoice',
    label: '标准发票/出库单',
    desc: '财务增值税发票、全页 A4 出库检验单',
    defaultPaper: 'a4',
  },
  {
    key: 'receipt',
    label: '前台收银小票',
    desc: '58mm / 80mm 商用热敏连续卷纸小票',
    defaultPaper: 'receipt-80',
  },
];

// 当前选中的测试通道与参数
const selectedChannel = ref('continuous');
const copies = ref(1);
const fallbackToBrowser = ref(true);
const lastLog = ref<string>('系统已就绪，等待操作...');

// 连续打孔三联单演示数据
const waybillData = ref({
  orderNo: 'TR-20261110-8801',
  date: '2026-11-10',
  consignor: '上海智能工业机器人制造中心',
  consignee: '深圳智造精工实业有限公司',
  deliveryAddress: '深圳市宝安区智造谷 8 栋 102 室',
  items: [
    {
      name: '微型无刷直流伺服电机 24V',
      spec: '28mm 100W 3000RPM',
      qty: 10,
      unit: '台',
      remark: '批次 A-09',
    },
    {
      name: '精密多圈高保真光学编码器',
      spec: '1024P/R 差分',
      qty: 10,
      unit: '只',
      remark: '含原厂质检合格证',
    },
    {
      name: '工业高柔性耐弯曲屏蔽电缆',
      spec: '8*0.3mm 双层屏蔽',
      qty: 50,
      unit: '米',
      remark: '耐折弯 1000 万次',
    },
  ],
  logisticsOperator: '顺丰重货专运 (单号: SF90182839218)',
  carrierSign: '李强 (承运司机)',
});

onMounted(async () => {
  // 初始化默认通道绑定
  if (!channelBindings.value.continuous) {
    bindChannel('continuous', mockPrintersList[0]);
  }
  if (!channelBindings.value.waybill) {
    bindChannel('waybill', mockPrintersList[1]);
  }
  if (!channelBindings.value.invoice) {
    bindChannel('invoice', mockPrintersList[2]);
  }
  if (!channelBindings.value.receipt) {
    bindChannel('receipt', mockPrintersList[3]);
  }

  await detectService();
});

// 切换模拟服务状态
const handleToggleMockService = async () => {
  await detectService();
  if (isServiceAvailable.value) {
    ElMessage.success('C-Lodop 硬件打印服务已恢复在线');
    lastLog.value = '硬件服务探针握手成功，端口 8443/8000 连接通畅。';
  } else {
    ElMessage.warning('C-Lodop 硬件打印服务已离线（模拟拔出线缆或后台服务停止）');
    lastLog.value =
      '探针探测超时，C-Lodop 服务离线。若开启 fallbackToBrowser 将自动降级为浏览器打印。';
  }
};

// 执行测试打印
const handleChannelPrint = async () => {
  const currentCh = businessChannels.find(c => c.key === selectedChannel.value);
  const targetPrinter = channelBindings.value[selectedChannel.value];

  lastLog.value = `正在向通道 [${currentCh?.label}] 派发打印任务，指定设备: [${targetPrinter || '系统默认'}]...`;

  try {
    await printWithChannel(selectedChannel.value, '#continuous-sheet-preview', {
      preset: currentCh?.defaultPaper || 'continuous-241-140',
      copies: copies.value,
      fallbackToBrowser: fallbackToBrowser.value,
      onSuccess: () => {
        ElMessage.success(`[${currentCh?.label}] 打印任务已成功下发至硬件驱动！`);
        lastLog.value = `任务成功下发：纸张规格=${currentCh?.defaultPaper}，份数=${copies.value}，打印机=${targetPrinter}`;
      },
      onFallback: reason => {
        ElMessage.info(`触发优雅降级：${reason}`);
        lastLog.value = `[优雅降级触发] ${reason}`;
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    ElMessage.error(`打印失败: ${msg}`);
    lastLog.value = `[执行中断异常] ${msg}`;
  }
};

// 直接唤起原生测试
const handleBrowserDirectPrint = async () => {
  try {
    await print('#continuous-sheet-preview', {
      fallbackToBrowser: true,
      onSuccess: () => {
        ElMessage.success('已唤起浏览器无头打印对话框');
      },
    });
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '打印异常');
  }
};

// 状态标签
const serviceStatusTag = computed(() => {
  if (isDetecting.value) return { text: '探测中...', type: 'warning' as const };
  if (isServiceAvailable.value) return { text: '在线已就绪', type: 'success' as const };
  return { text: '服务离线', type: 'danger' as const };
});
</script>

<template>
  <div class="lodop-terminal-container">
    <!-- 顶部状态与探针控制卡片 -->
    <el-card shadow="never" class="terminal-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span class="title">🔌 C-Lodop 硬件静默直连驱动与多打印机控制台</span>
            <el-tag :type="serviceStatusTag.type" size="small" effect="dark">
              {{ serviceStatusTag.text }}
            </el-tag>
          </div>
          <div class="header-right">
            <el-switch
              v-model="isMockServiceActive"
              active-text="C-Lodop 模拟服务在线"
              inactive-text="模拟断开/离线"
              @change="handleToggleMockService"
            />
          </div>
        </div>
      </template>

      <!-- 硬件探针与路由状态栏 -->
      <div class="probe-row">
        <div class="probe-item">
          <span class="label">服务探针监听端口:</span>
          <el-tag size="small" type="info">HTTPS 8443</el-tag>
          <el-tag size="small" type="info">HTTP 8000</el-tag>
          <el-tag size="small" type="info">HTTP 18000</el-tag>
          <el-button
            size="small"
            :loading="isDetecting"
            style="margin-left: 8px"
            @click="detectService(1000)"
          >
            🔄 重新探测
          </el-button>
        </div>

        <div class="probe-item">
          <el-checkbox v-model="fallbackToBrowser">
            开启离线自动平滑降级 (fallbackToBrowser)
          </el-checkbox>
        </div>
      </div>

      <!-- 执行日志与提示栏 -->
      <div class="log-banner">
        <span class="log-label">📡 驱动通信日志：</span>
        <span class="log-text">{{ lastLog }}</span>
      </div>
    </el-card>

    <div class="grid-content">
      <!-- 左栏：业务通道与打印机路由配置 -->
      <el-card shadow="never" class="channel-card">
        <template #header>
          <div class="channel-header">
            <span>⚙️ 业务打印通道与物理设备映射</span>
            <el-tag size="small" type="info">已枚举 {{ printers.length }} 台设备</el-tag>
          </div>
        </template>

        <el-table :data="businessChannels" size="small" border stripe>
          <el-table-column prop="label" label="业务通道" width="130" />
          <el-table-column prop="desc" label="应用场景" min-width="160" show-overflow-tooltip />
          <el-table-column label="绑定物理打印机设备" width="260">
            <template #default="{ row }">
              <el-select
                v-model="channelBindings[row.key]"
                placeholder="选择打印机"
                size="small"
                style="width: 100%"
                @change="(val: string) => bindChannel(row.key, val)"
              >
                <el-option v-for="p in mockPrintersList" :key="p" :label="p" :value="p" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="70" align="center">
            <template #default="{ row }">
              <el-button
                size="small"
                type="danger"
                link
                :disabled="!channelBindings[row.key]"
                @click="unbindChannel(row.key)"
              >
                解绑
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 调度测试控制面板 -->
        <div class="test-panel">
          <div class="test-header">🚀 业务通道静默打印联调测试</div>
          <div class="test-form">
            <div class="form-row">
              <span class="form-label">指定通道:</span>
              <el-radio-group v-model="selectedChannel" size="small">
                <el-radio-button v-for="c in businessChannels" :key="c.key" :value="c.key">
                  {{ c.label }}
                </el-radio-button>
              </el-radio-group>
            </div>

            <div class="form-row">
              <span class="form-label">打印份数:</span>
              <el-input-number v-model="copies" :min="1" :max="10" size="small" />
              <el-button type="primary" size="small" @click="handleChannelPrint">
                🎯 派发通道静默打印
              </el-button>
              <el-button size="small" @click="handleBrowserDirectPrint">
                🖨️ 浏览器预览打印
              </el-button>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 右栏：连续打孔三联单（241mm × 140mm）真实单据排版与走纸拟真 -->
      <el-card shadow="never" class="preview-card">
        <template #header>
          <div class="preview-header">
            <span>📄 工业连续打孔复写三联单真实排版 (241mm × 140mm)</span>
            <el-tag type="warning" size="small"
              >走纸指令: SET_PRINT_PAGESIZE(3, '241mm', '140mm')</el-tag
            >
          </div>
        </template>

        <div class="perforated-paper-outer">
          <!-- 左右模拟打孔带 -->
          <div class="tractor-holes left-holes">
            <span v-for="i in 10" :key="`l-${i}`" class="hole"></span>
          </div>

          <!-- 单据内容正文 -->
          <div id="continuous-sheet-preview" class="triplicate-bill">
            <!-- 联次标识与标题 -->
            <div class="bill-header">
              <div class="bill-badge">第二联：随货提货核对联（绿复写联）</div>
              <h2 class="bill-title">工业制造企业物资商业调拨交接联单</h2>
              <div class="bill-meta">
                <span
                  >单据编号: <strong>{{ waybillData.orderNo }}</strong></span
                >
                <span>开票日期: {{ waybillData.date }}</span>
                <span>纸张规格: <strong>241mm × 140mm (等分二联)</strong></span>
              </div>
            </div>

            <!-- 收发货双方信息 -->
            <div class="party-info">
              <div class="party-box">
                <span class="party-label">发货单位：</span>
                <span class="party-val">{{ waybillData.consignor }}</span>
              </div>
              <div class="party-box">
                <span class="party-label">收货单位：</span>
                <span class="party-val">{{ waybillData.consignee }}</span>
              </div>
            </div>

            <!-- 物料表格 -->
            <table class="bill-table">
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center">项</th>
                  <th style="text-align: left">物资物料品名</th>
                  <th style="text-align: left">技术规格参数</th>
                  <th style="width: 70px; text-align: right">实发数</th>
                  <th style="width: 50px; text-align: center">单位</th>
                  <th style="width: 120px; text-align: left">生产批号 / 质检</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in waybillData.items" :key="idx">
                  <td style="text-align: center">{{ idx + 1 }}</td>
                  <td>
                    <strong>{{ item.name }}</strong>
                  </td>
                  <td class="spec-font">{{ item.spec }}</td>
                  <td style="text-align: right; font-weight: bold; color: #0284c7">
                    {{ item.qty }}
                  </td>
                  <td style="text-align: center">{{ item.unit }}</td>
                  <td class="spec-font">{{ item.remark }}</td>
                </tr>
              </tbody>
            </table>

            <!-- 签字与打孔走纸提示 -->
            <div class="bill-footer">
              <div>发货制单：张建国</div>
              <div>承运司机：{{ waybillData.carrierSign }}</div>
              <div>收货仓库核收人：____________</div>
            </div>
            <div class="perforated-notice">
              [得实 DASCOM DS-620 针式打印机连续走纸测试 — 走纸高度 140mm
              遇切刀自动定格，绝不空跳整页 A4]
            </div>
          </div>

          <div class="tractor-holes right-holes">
            <span v-for="i in 10" :key="`r-${i}`" class="hole"></span>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.lodop-terminal-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.terminal-card {
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

.probe-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f8fafc;
  border-radius: 6px;
  margin-bottom: 12px;
}

.probe-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.probe-item .label {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
}

.log-banner {
  padding: 8px 12px;
  background-color: #0f172a;
  color: #38bdf8;
  border-radius: 6px;
  font-family: Consolas, monospace;
  font-size: 12px;
  display: flex;
  align-items: center;
}

.log-label {
  color: #94a3b8;
  margin-right: 6px;
}

.grid-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.channel-card,
.preview-card {
  border-radius: 8px;
}

.channel-header,
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.test-panel {
  margin-top: 16px;
  padding: 12px 16px;
  background-color: #f8fafc;
  border-radius: 6px;
  border: 1px dashed #cbd5e1;
}

.test-header {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 12px;
}

.test-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-label {
  font-size: 12px;
  color: #475569;
  width: 60px;
}

/* 连续打孔纸拟真样式 */
.perforated-paper-outer {
  background-color: #e2e8f0;
  padding: 12px;
  border-radius: 8px;
  display: flex;
  align-items: stretch;
  gap: 8px;
  overflow-x: auto;
}

.tractor-holes {
  width: 16px;
  background-color: #cbd5e1;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
  padding: 6px 0;
}

.hole {
  width: 8px;
  height: 8px;
  background-color: #64748b;
  border-radius: 50%;
  display: inline-block;
}

.triplicate-bill {
  flex: 1;
  background-color: #f0fdf4; /* 模拟二联绿色复写纸底色 */
  border: 1px dashed #86efac;
  border-radius: 4px;
  padding: 16px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #14532d;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.bill-header {
  text-align: center;
  border-bottom: 2px solid #16a34a;
  padding-bottom: 8px;
  margin-bottom: 12px;
}

.bill-badge {
  font-size: 11px;
  color: #15803d;
  font-weight: 600;
  margin-bottom: 2px;
}

.bill-title {
  margin: 0;
  font-size: 17px;
  letter-spacing: 1px;
}

.bill-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #166534;
  margin-top: 6px;
}

.party-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 10px;
}

.bill-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  margin-bottom: 12px;
}

.bill-table th,
.bill-table td {
  border: 1px solid #86efac;
  padding: 4px 6px;
}

.bill-table th {
  background-color: #dcfce7;
  font-weight: 600;
}

.spec-font {
  font-size: 10px;
  color: #166534;
}

.bill-footer {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin-top: 12px;
  padding-top: 6px;
  border-top: 1px dashed #86efac;
}

.perforated-notice {
  font-size: 10px;
  color: #15803d;
  text-align: center;
  margin-top: 8px;
  font-style: italic;
}
</style>
