<script setup lang="ts">
/**
 * 字典管理套件 (DictManager / AtengDictSelect / AtengDictRadio / AtengDictCheckbox / AtengDictTag) 自验页面。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, onMounted } from 'vue';
import {
  ElCard,
  ElAlert,
  ElButton,
  ElForm,
  ElFormItem,
  ElDivider,
  ElMessage,
  ElTag,
} from 'element-plus';
import {
  DictManager,
  AtengDictSelect,
  AtengDictRadio,
  AtengDictCheckbox,
  AtengDictTag,
  type DictItem,
} from '@atengk/element-plus';

// 1. 全局字典数据源模拟
let serverRequestCount = 0;
const mockServerData: Record<string, DictItem[]> = {
  sys_user_gender: [
    { label: '男', value: '1', tagType: 'primary' },
    { label: '女', value: '2', tagType: 'danger' },
    { label: '未知', value: '0', tagType: 'info' },
  ],
  sys_user_role: [
    { label: '超级管理员', value: 'admin', tagType: 'danger' },
    { label: '安全审计员', value: 'auditor', tagType: 'warning' },
    { label: '普通操作员', value: 'operator', tagType: 'primary' },
    { label: '访客用户', value: 'guest', tagType: 'info' },
  ],
  sys_notice_level: [
    { label: '低危提示', value: 'low', tagType: 'info' },
    { label: '普通通知', value: 'medium', tagType: 'primary' },
    { label: '高危预警', value: 'high', tagType: 'warning' },
    { label: '致命故障', value: 'critical', tagType: 'danger' },
  ],
  sys_user_status: [
    { label: '正常启用', value: 1, tagType: 'success' },
    { label: '冻结停用', value: 0, tagType: 'danger' },
    { label: '审核中', value: 2, tagType: 'warning' },
  ],
};

// 注入模拟全局 Provider，附带 300ms 模拟网络延迟
DictManager.setProvider(async (code: string) => {
  serverRequestCount++;
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockServerData[code] ?? [];
});

// 2. 表单与双向绑定状态
const genderValue = ref<string>('1');
const rolesValue = ref<string[]>(['admin', 'operator']);
const staticValue = ref<string>('beijing');
const loaderValue = ref<string>('finance');
const noticeLevel = ref<string>('medium');
const buttonNoticeLevel = ref<string>('high');
const radioBorderLevel = ref<string>('low');
const checkboxHobbyArray = ref<string[]>(['low', 'high']);
const checkboxHobbyString = ref<string>('low,critical');
const statusTagValue = ref<string>('1');
const multiStatusString = ref<string>('1,0,2');

// Ticket #115 新增：非标字段映射绑定状态
const mappedSelectValue = ref<number>(901);
const mappedRadioValue = ref<string>('ali');
const weakCoerceValue = ref<string>('1'); // 字符串 "1" 对应选项数字 1

// 非标字典选项
const nonStandardDeptOptions = [
  { deptName: '架构组', deptId: 901, deptTag: 'success' },
  { deptName: '基础运维组', deptId: 902, deptTag: 'primary' },
  { deptName: '大数据智能组', deptId: 903, deptTag: 'warning' },
];

const nonStandardPayOptions = [
  { payTitle: '微信支付', payCode: 'wx' },
  { payTitle: '支付宝', payCode: 'ali' },
  { payTitle: '银联云闪付', payCode: 'union' },
];

// 静态字典选项覆盖
const staticOptions: DictItem[] = [
  { label: '北京市', value: 'beijing', tagType: 'primary' },
  { label: '上海市', value: 'shanghai', tagType: 'success' },
  { label: '深圳市', value: 'shenzhen', tagType: 'warning' },
];

// 自定义异步 loader 覆盖
const customLoader = async (): Promise<DictItem[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return [
    { label: '财务部', value: 'finance', tagType: 'success' },
    { label: '研发部', value: 'rd', tagType: 'primary' },
    { label: '市场部', value: 'marketing', tagType: 'warning' },
  ];
};

// 3. DictManager 并发去重与缓存测试
const requestLogs = ref<string[]>([]);
const cachedCodes = ref<string[]>([]);

const updateCachedCodes = () => {
  cachedCodes.value = Object.keys(mockServerData).filter(code => DictManager.hasCache(code));
};

const handleTestConcurrency = async () => {
  const currentCountBefore = serverRequestCount;
  requestLogs.value.unshift(
    `[${new Date().toLocaleTimeString()}] 触发 10 次并发请求拉取 sys_user_gender ...`,
  );

  const promises = Array.from({ length: 10 }).map(() => DictManager.loadDict('sys_user_gender'));
  await Promise.all(promises);

  const realNetworkCalls = serverRequestCount - currentCountBefore;
  requestLogs.value.unshift(
    `[${new Date().toLocaleTimeString()}] 并发 10 次完成！真实网络请求次数：${realNetworkCalls} 次（请求风暴完全合并去重）`,
  );
  updateCachedCodes();
  ElMessage.success(`并发 10 次成功！实际真实后端请求：${realNetworkCalls} 次`);
};

const handlePreloadBatch = async () => {
  requestLogs.value.unshift(
    `[${new Date().toLocaleTimeString()}] 触发 DictManager.preload(['sys_notice_level', 'sys_user_status']) ...`,
  );
  const res = await DictManager.preload(['sys_notice_level', 'sys_user_status']);
  requestLogs.value.unshift(
    `[${new Date().toLocaleTimeString()}] preload 批量预取成功！预热了: ${Object.keys(res).join(', ')}`,
  );
  updateCachedCodes();
  ElMessage.success('preload 批量预加载成功！已存入纯内存缓存');
};

const handleForceRefresh = async () => {
  requestLogs.value.unshift(
    `[${new Date().toLocaleTimeString()}] 穿透内存缓存强制刷新 sys_user_gender ...`,
  );
  await DictManager.loadDict('sys_user_gender', undefined, true);
  requestLogs.value.unshift(`[${new Date().toLocaleTimeString()}] 穿透刷新完成！`);
  updateCachedCodes();
  ElMessage.success('字典已穿透缓存完成刷新！');
};

const handleClearCache = () => {
  DictManager.clearCache();
  updateCachedCodes();
  requestLogs.value.unshift(`[${new Date().toLocaleTimeString()}] 已清空全部内存字典缓存`);
  ElMessage.info('已清空全部字典缓存');
};

// 4. AtengDictTag 冷加载防闪烁占位演示状态
const coldLoadReplaySeed = ref<number>(0);
const cacheSyncReplaySeed = ref<number>(0);
const manualExternalLoading = ref<boolean>(true);
const slowOrderStatusLoader = async (): Promise<DictItem[]> => {
  await new Promise(resolve => setTimeout(resolve, 1200));
  return [
    { label: '待支付', value: '0', tagType: 'warning' },
    { label: '已发货', value: '1', tagType: 'success' },
    { label: '已取消', value: '2', tagType: 'info' },
  ];
};
const replayColdLoadDemo = () => {
  coldLoadReplaySeed.value += 1;
};
const mountWithWarmCache = async () => {
  await DictManager.preload(['sys_user_status']);
  updateCachedCodes();
  cacheSyncReplaySeed.value += 1;
};
const mountWithColdCache = () => {
  DictManager.clearCache('sys_user_status');
  updateCachedCodes();
  cacheSyncReplaySeed.value += 1;
};

onMounted(() => {
  updateCachedCodes();
});
</script>

<template>
  <div class="dict-view">
    <ElCard header="字典基础设施套件 (Dict Suite)">
      <ElAlert
        title="套件核心能力 (Ticket #115 全维增强)"
        type="info"
        description="全链路打通企业级字典管理：DictManager 单例具备并发去重、preload 批量增量拉取与纯内存常驻缓存；AtengDictSelect / AtengDictRadio / AtengDictCheckbox / AtengDictTag 全面支持 fieldNames 自定义字段映射与 labelField/valueField 快捷属性，支持 valueType='auto' 弱比对防呆，支持按钮模式与边框样式。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <!-- 1. DictManager 飞行中并发合并与缓存控制 -->
      <div class="demo-section">
        <div class="section-title">
          <span>1. DictManager 请求去重与缓存状态</span>
          <div class="action-buttons">
            <ElButton type="primary" size="small" @click="handleTestConcurrency">
              模拟 10 次高并发请求 (去重验证)
            </ElButton>
            <ElButton type="success" size="small" @click="handlePreloadBatch">
              preload 批量预取 (Ticket #115)
            </ElButton>
            <ElButton type="warning" size="small" @click="handleForceRefresh">
              穿透缓存强制刷新
            </ElButton>
            <ElButton type="danger" size="small" @click="handleClearCache"> 清空内存缓存 </ElButton>
          </div>
        </div>

        <div class="cache-status-bar">
          <span class="status-label">当前常驻内存缓存字典：</span>
          <template v-if="cachedCodes.length > 0">
            <ElTag v-for="c in cachedCodes" :key="c" type="success" size="small" class="code-tag">
              {{ c }}
            </ElTag>
          </template>
          <span v-else class="empty-tip">暂无常驻缓存</span>
        </div>

        <div v-if="requestLogs.length > 0" class="log-box">
          <div v-for="(log, idx) in requestLogs.slice(0, 5)" :key="idx" class="log-line">
            {{ log }}
          </div>
        </div>
      </div>

      <ElDivider />

      <!-- 2. AtengDictSelect 下拉选择器 -->
      <div class="demo-section">
        <div class="section-title">2. AtengDictSelect 下拉选择器（单选 / 多选 / 筛选）</div>
        <ElForm label-width="160px" class="demo-form">
          <ElFormItem label="用户性别 (单选)">
            <AtengDictSelect
              v-model="genderValue"
              dict-code="sys_user_gender"
              placeholder="请选择性别"
              clearable
              style="width: 100%; max-width: 280px"
            />
            <span class="value-hint">当前值: {{ genderValue }}</span>
          </ElFormItem>

          <ElFormItem label="所属角色 (多选)">
            <AtengDictSelect
              v-model="rolesValue"
              dict-code="sys_user_role"
              multiple
              collapse-tags
              :max-collapse-tags="2"
              placeholder="请选择角色"
              clearable
              filterable
              style="width: 100%; max-width: 380px"
            />
            <span class="value-hint">当前值: {{ rolesValue }}</span>
          </ElFormItem>

          <ElFormItem label="城市选择 (静态Options)">
            <AtengDictSelect
              v-model="staticValue"
              :options="staticOptions"
              placeholder="请选择城市"
              clearable
              style="width: 100%; max-width: 280px"
            />
            <span class="value-hint">当前值: {{ staticValue }}</span>
          </ElFormItem>

          <ElFormItem label="部门选择 (自定义Loader)">
            <AtengDictSelect
              v-model="loaderValue"
              :loader="customLoader"
              placeholder="请选择部门"
              clearable
              style="width: 100%; max-width: 280px"
            />
            <span class="value-hint">当前值: {{ loaderValue }}</span>
          </ElFormItem>
        </ElForm>
      </div>

      <ElDivider />

      <!-- 3. Ticket #115 新增：自定义字段映射与弱比对自适应 -->
      <div class="demo-section">
        <div class="section-title">3. 自定义字段映射与类型自适应弱比对 (Ticket #115 核心增强)</div>
        <ElForm label-width="160px" class="demo-form">
          <ElFormItem label="字段映射 (fieldNames)">
            <AtengDictSelect
              v-model="mappedSelectValue"
              :options="nonStandardDeptOptions"
              :field-names="{ label: 'deptName', value: 'deptId', tagType: 'deptTag' }"
              placeholder="请选择非标部门"
              style="width: 100%; max-width: 280px"
            />
            <span class="value-hint">绑定值 (deptId): {{ mappedSelectValue }}</span>
          </ElFormItem>

          <ElFormItem label="快捷属性 (labelField/valueField)">
            <AtengDictRadio
              v-model="mappedRadioValue"
              :options="nonStandardPayOptions"
              label-field="payTitle"
              value-field="payCode"
              border
            />
            <span class="value-hint" style="margin-left: 16px"
              >当前值 (payCode): {{ mappedRadioValue }}</span
            >
          </ElFormItem>

          <ElFormItem label="弱比对防呆 (valueType='auto')">
            <AtengDictSelect
              v-model="weakCoerceValue"
              dict-code="sys_user_status"
              value-type="auto"
              placeholder="选项数值1与字符'1'自适应"
              style="width: 100%; max-width: 280px"
            />
            <span class="value-hint">
              绑定的为字符串 '{{ weakCoerceValue }}' (类型:
              {{ typeof weakCoerceValue }})，选项真实值为数字 1，完美高亮回显！
            </span>
          </ElFormItem>
        </ElForm>
      </div>

      <ElDivider />

      <!-- 4. AtengDictRadio 单选组 -->
      <div class="demo-section">
        <div class="section-title">4. AtengDictRadio 单选框组（普通 / 按钮 / 边框模式）</div>
        <ElForm label-width="160px" class="demo-form">
          <ElFormItem label="普通单选框风格">
            <AtengDictRadio v-model="noticeLevel" dict-code="sys_notice_level" />
            <span class="value-hint" style="margin-left: 16px">当前值: {{ noticeLevel }}</span>
          </ElFormItem>

          <ElFormItem label="按钮单选风格">
            <AtengDictRadio v-model="buttonNoticeLevel" dict-code="sys_notice_level" button />
            <span class="value-hint" style="margin-left: 16px"
              >当前值: {{ buttonNoticeLevel }}</span
            >
          </ElFormItem>

          <ElFormItem label="边框单选风格 (border)">
            <AtengDictRadio v-model="radioBorderLevel" dict-code="sys_notice_level" border />
            <span class="value-hint" style="margin-left: 16px">当前值: {{ radioBorderLevel }}</span>
          </ElFormItem>
        </ElForm>
      </div>

      <ElDivider />

      <!-- 5. AtengDictCheckbox 多选框组 -->
      <div class="demo-section">
        <div class="section-title">
          5. AtengDictCheckbox 多选框组（全选 / 按钮风格 / separator解构 / border边框）
        </div>
        <ElForm label-width="160px" class="demo-form">
          <ElFormItem label="普通多选 (带全选与border)">
            <AtengDictCheckbox
              v-model="checkboxHobbyArray"
              dict-code="sys_notice_level"
              show-check-all
              border
            />
            <span class="value-hint" style="margin-left: 16px"
              >当前数组: {{ checkboxHobbyArray }}</span
            >
          </ElFormItem>

          <ElFormItem label="按钮风格 (带全选)">
            <AtengDictCheckbox
              v-model="checkboxHobbyArray"
              dict-code="sys_notice_level"
              button
              show-check-all
            />
          </ElFormItem>

          <ElFormItem label="字符串解构绑定">
            <AtengDictCheckbox
              v-model="checkboxHobbyString"
              dict-code="sys_notice_level"
              separator=","
            />
            <span class="value-hint" style="margin-left: 16px"
              >当前字符串: '{{ checkboxHobbyString }}'</span
            >
          </ElFormItem>
        </ElForm>
      </div>

      <ElDivider />

      <!-- 6. AtengDictTag 彩色状态标签 -->
      <div class="demo-section">
        <div class="section-title">
          6. AtengDictTag 彩色状态标签（单值 / 多值 / 字段映射 / 空安全保底）
        </div>
        <div class="tag-row">
          <span class="row-label">单值展示 (value="1"):</span>
          <AtengDictTag dict-code="sys_user_status" :value="statusTagValue" />
          <span class="row-label" style="margin-left: 20px">单值展示 (value="0"):</span>
          <AtengDictTag dict-code="sys_user_status" value="0" />
          <span class="row-label" style="margin-left: 20px">单值展示 (value="2"):</span>
          <AtengDictTag dict-code="sys_user_status" value="2" />
        </div>

        <div class="tag-row" style="margin-top: 12px">
          <span class="row-label">多值逗号分割 (value="1,0,2"):</span>
          <AtengDictTag dict-code="sys_user_status" :value="multiStatusString" />
        </div>

        <div class="tag-row" style="margin-top: 12px">
          <span class="row-label">多值数组 (value="['admin', 'auditor']"):</span>
          <AtengDictTag dict-code="sys_user_role" :value="['admin', 'auditor']" />
        </div>

        <div class="tag-row" style="margin-top: 12px">
          <span class="row-label">非标字段映射 (fieldNames):</span>
          <AtengDictTag
            :options="nonStandardDeptOptions"
            :field-names="{ label: 'deptName', value: 'deptId', tagType: 'deptTag' }"
            :value="901"
          />
        </div>

        <div class="tag-row" style="margin-top: 12px">
          <span class="row-label">空值/未匹配/空 tagType 保底:</span>
          <AtengDictTag dict-code="sys_user_status" value="unknown" />
          <AtengDictTag dict-code="sys_user_status" :value="null" style="margin-left: 10px" />
          <AtengDictTag
            :options="[{ label: '中性默认 (tagType=&quot;&quot;)', value: 'neutral', tagType: '' }]"
            value="neutral"
            style="margin-left: 10px"
          />
          <span class="value-hint" style="margin-left: 10px">自动保底且零 Prop 警告</span>
        </div>
      </div>

      <ElDivider />

      <!-- 7. AtengDictTag 冷加载防闪烁占位模式对比 -->
      <div class="demo-section">
        <div class="section-title">
          <span
            >7. AtengDictTag 冷加载防闪烁占位策略 (默认骨架 / 文本 / 自定义插槽 / Raw 兼容)</span
          >
          <div class="action-buttons">
            <ElButton type="primary" size="small" @click="replayColdLoadDemo">
              重放 1.2s 冷加载对比
            </ElButton>
            <ElButton size="small" @click="manualExternalLoading = !manualExternalLoading">
              切换受控 loading: {{ manualExternalLoading ? 'true' : 'false' }}
            </ElButton>
          </div>
        </div>

        <div :key="coldLoadReplaySeed" class="tag-row">
          <span class="row-label">默认骨架胶囊 (skeleton):</span>
          <AtengDictTag :loader="slowOrderStatusLoader" value="0,1" round />

          <span class="row-label" style="margin-left: 16px">文本占位 (text):</span>
          <AtengDictTag
            :loader="slowOrderStatusLoader"
            value="1"
            loading-mode="text"
            loading-text="字典加载中..."
          />

          <span class="row-label" style="margin-left: 16px">#loading 插槽:</span>
          <AtengDictTag :loader="slowOrderStatusLoader" value="2">
            <template #loading="{ values }">
              <ElTag type="info" effect="plain" size="small">
                解析中({{ values.join(',') }})...
              </ElTag>
            </template>
          </AtengDictTag>

          <span class="row-label" style="margin-left: 16px">兼容原值 (raw):</span>
          <AtengDictTag :loader="slowOrderStatusLoader" value="0" loading-mode="raw" />
        </div>

        <div class="tag-row" style="margin-top: 12px">
          <span class="row-label">空值优先 (冷加载期直接保底):</span>
          <AtengDictTag :loader="slowOrderStatusLoader" :value="null" empty-text="--" />

          <span class="row-label" style="margin-left: 16px">外部受控 :loading (静态 options):</span>
          <AtengDictTag
            :options="staticOptions"
            value="shanghai"
            :loading="manualExternalLoading"
          />
        </div>

        <div class="tag-row" style="margin-top: 12px">
          <span class="row-label">同步缓存水合 vs 冷加载 (sys_user_status):</span>
          <AtengDictTag :key="cacheSyncReplaySeed" dict-code="sys_user_status" value="1" round />
          <ElButton size="small" type="success" plain @click="mountWithWarmCache">
            预热缓存并重挂（0 延迟直出）
          </ElButton>
          <ElButton size="small" type="warning" plain @click="mountWithColdCache">
            清缓存并重挂（骨架过渡）
          </ElButton>
        </div>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.dict-view {
  max-width: 1100px;
}

.demo-section {
  padding: 8px 0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.cache-status-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  margin-bottom: 10px;
}

.status-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.code-tag {
  font-weight: 500;
}

.empty-tip {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
}

.log-box {
  background-color: var(--el-fill-color-darker);
  color: var(--el-text-color-primary);
  font-family: monospace;
  font-size: 12px;
  padding: 10px 14px;
  border-radius: 4px;
  line-height: 1.6;
}

.log-line {
  word-break: break-all;
}

.demo-form {
  margin-top: 12px;
}

.demo-form :deep(.el-form-item) {
  flex-wrap: wrap;
}

.demo-form :deep(.el-form-item__content) {
  min-width: 0;
  max-width: 100%;
  flex-wrap: wrap;
  gap: 6px;
}

.value-hint {
  margin-left: 14px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 767px) {
  .value-hint {
    margin-left: 0;
  }
}

.tag-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.row-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
}
</style>
