<script setup lang="ts">
/**
 * 企业级标准页面容器 AtengPageContainer 自验页面。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { ref } from 'vue';
import {
  ElButton,
  ElTag,
  ElTabs,
  ElTabPane,
  ElSwitch,
  ElMessage,
  ElTable,
  ElTableColumn,
  ElAlert,
  ElRadioGroup,
  ElRadioButton,
} from 'element-plus';
import {
  AtengPageContainer,
  AtengFooterBar,
  AtengAnchor,
  type AtengAnchorItem,
  type AtengPageActionItem,
} from '@atengk/element-plus';

const activeTab = ref('users');
const isGhost = ref(false);
const isFitViewport = ref(false);
const isFixedHeader = ref(false);
const isHeaderBlur = ref(true);
const isAutoBreadcrumb = ref(false);
const isFullscreen = ref(false);
const showFullscreenBtn = ref(true);
const collapseHeaderOnScroll = ref(true);
const isHeaderVisible = ref(true);
const enableWatermark = ref(false);
const enableExtraActions = ref(true);

const extraActions: AtengPageActionItem[] = [
  {
    key: 'export',
    label: '导出明细',
    type: 'primary',
    onClick: () => ElMessage.success('点击了操作项：导出明细'),
  },
  { key: 'import', label: '批量导入', onClick: () => ElMessage.info('点击了操作项：批量导入') },
  { key: 'print', label: '打印单据', onClick: () => ElMessage.info('点击了操作项：打印单据') },
  {
    key: 'archive',
    label: '归档数据',
    divided: true,
    onClick: () => ElMessage.warning('点击了操作项：归档数据'),
  },
  {
    key: 'lock',
    label: '锁定成员',
    disabled: true,
    onClick: () => ElMessage.error('该操作已禁用'),
  },
];

// 容器总线协同演示控制
const footerMode = ref<'none' | 'nested' | 'slot'>('nested');
const showAnchor = ref(true);

const anchorItems: AtengAnchorItem[] = [
  { href: '#sec-overview', title: '概览说明' },
  { href: '#sec-table', title: '团队成员列表' },
  { href: '#sec-audit', title: '安全审计' },
];

const breadcrumbList = [
  { label: '系统管理', path: '/' },
  { label: '组织架构', path: '/' },
  { label: '团队成员' },
];

const mockTableData = ref([
  { id: '1001', name: '张三', dept: '研发架构部', role: '资深后端开发', status: '正常' },
  { id: '1002', name: '李四', dept: '前端基建部', role: '高级前端开发', status: '正常' },
  { id: '1003', name: '王五', dept: '质量保障部', role: '自动化测试专家', status: '正常' },
  { id: '1004', name: '赵六', dept: '产品体验部', role: '交互体验专家', status: '禁用' },
  { id: '1005', name: '孙七', dept: '移动客户端部', role: 'iOS 架构师', status: '正常' },
  { id: '1006', name: '周八', dept: '数据平台部', role: '大数据工程师', status: '正常' },
  { id: '1007', name: '吴九', dept: 'DevOps平台部', role: 'SRE 专家', status: '正常' },
  { id: '1008', name: '郑十', dept: '云原生安全部', role: '安全专家', status: '正常' },
  { id: '1009', name: '钱十一', dept: '基础平台部', role: '微服务网关架构师', status: '正常' },
  { id: '1010', name: '刘十二', dept: 'AI模型工程部', role: '大模型应用专家', status: '正常' },
  { id: '1011', name: '陈十三', dept: '安全合规部', role: '等保合规专家', status: '正常' },
  { id: '1012', name: '杨十四', dept: '用户体验中心', role: '视觉设计主管', status: '正常' },
  { id: '1013', name: '黄十五', dept: '效能工程部', role: 'CI/CD 工具链专家', status: '正常' },
  { id: '1014', name: '朱十六', dept: '分布式数据库组', role: 'DBA 技术专家', status: '正常' },
  { id: '1015', name: '秦十七', dept: '移动客户端部', role: 'Android 架构师', status: '正常' },
]);

const handleBack = () => {
  ElMessage.info('触发了返回上一页事件 @back');
};

const handleCreate = () => {
  ElMessage.success('点击了右上角新建成员');
};

const handleFullscreen = (val: boolean) => {
  ElMessage.info(
    val
      ? '已激活视口脱壳全屏 (<Teleport to="body"> 已瞬移至顶层，可按 ESC 键或右上角按钮退出)'
      : '已退出脱壳全屏',
  );
};
</script>

<template>
  <div class="page-container-view" :class="{ 'is-full-height': isFitViewport }">
    <div class="control-panel">
      <span class="ctrl-item">
        <span>幽灵模式 (ghost)：</span>
        <ElSwitch v-model="isGhost" />
      </span>
      <span class="ctrl-item">
        <span>视口撑满 (fitViewport)：</span>
        <ElSwitch v-model="isFitViewport" />
      </span>
      <span class="ctrl-item">
        <span>吸顶页头 (fixedHeader)：</span>
        <ElSwitch v-model="isFixedHeader" />
      </span>
      <span class="ctrl-item">
        <span>吸顶轻量固顶 (headerBlur)：</span>
        <ElSwitch v-model="isHeaderBlur" />
      </span>
      <span class="ctrl-item">
        <span>自动路由推导 (autoBreadcrumb)：</span>
        <ElSwitch v-model="isAutoBreadcrumb" />
      </span>
      <span class="ctrl-item">
        <span>脱壳全屏按钮 (showFullscreen)：</span>
        <ElSwitch v-model="showFullscreenBtn" />
      </span>
      <span class="ctrl-item">
        <span>沉浸式滚动折叠页头 (collapseHeaderOnScroll)：</span>
        <ElSwitch v-model="collapseHeaderOnScroll" />
      </span>
      <span class="ctrl-item">
        <span>沉浸无页头模式 (headerVisible)：</span>
        <ElSwitch v-model="isHeaderVisible" />
      </span>
      <span class="ctrl-item">
        <span>防篡改安全水印 (watermark)：</span>
        <ElSwitch v-model="enableWatermark" />
      </span>
      <span class="ctrl-item">
        <span>页头操作流折叠 (extraActions)：</span>
        <ElSwitch v-model="enableExtraActions" />
      </span>
      <span class="ctrl-item">
        <span>底栏模式：</span>
        <ElRadioGroup v-model="footerMode" size="small">
          <ElRadioButton value="none">无底栏</ElRadioButton>
          <ElRadioButton value="nested">内容末尾嵌套 (自动占位)</ElRadioButton>
          <ElRadioButton value="slot">#footer 具名插槽</ElRadioButton>
        </ElRadioGroup>
      </span>
      <span class="ctrl-item">
        <span>楼层导航自动绑定：</span>
        <ElSwitch v-model="showAnchor" />
      </span>
    </div>

    <AtengPageContainer
      v-model:fullscreen="isFullscreen"
      title="团队成员中枢"
      sub-title="管理核心研发团队成员、组织归属与岗位授权"
      :breadcrumb="isAutoBreadcrumb ? undefined : breadcrumbList"
      show-back
      :ghost="isGhost"
      :fit-viewport="isFitViewport"
      :fixed-header="isFixedHeader"
      :header-blur="isHeaderBlur"
      :auto-breadcrumb="isAutoBreadcrumb"
      :show-fullscreen="showFullscreenBtn"
      :collapse-header-on-scroll="collapseHeaderOnScroll"
      :header-visible="isHeaderVisible"
      :watermark="enableWatermark ? '机密文档 @atengk 2026' : undefined"
      :extra-actions="enableExtraActions ? extraActions : undefined"
      :max-visible-actions="3"
      @back="handleBack"
      @fullscreen="handleFullscreen"
      @action-click="act => ElMessage.info('触发操作: ' + act.label)"
    >
      <template #tags>
        <ElTag type="success" size="small">在线 32 人</ElTag>
        <ElTag type="info" size="small">总编制 50 人</ElTag>
      </template>

      <template #extra>
        <ElButton>导出名单</ElButton>
        <ElButton type="primary" @click="handleCreate">新建成员</ElButton>
      </template>

      <template #tabs>
        <ElTabs v-model="activeTab">
          <ElTabPane label="正式成员" name="users" />
          <ElTabPane label="外包支持" name="contractors" />
          <ElTabPane label="离职档案" name="archive" />
        </ElTabs>
      </template>

      <!-- 专用具名底栏插槽演示 -->
      <template v-if="footerMode === 'slot'" #footer>
        <AtengFooterBar
          position="sticky"
          submit-text="保存团队设置 (专用插槽模式)"
          show-reset
          show-cancel
        />
      </template>

      <!-- 主体内容 -->
      <div class="content-body">
        <ElAlert
          id="sec-overview"
          title="容器上下文总线 (Container Context Bus) 零胶水协同"
          type="success"
          description="AtengPageContainer 统一向上文注入 PAGE_CONTAINER_INJECTION_KEY；当 AtengFooterBar 嵌套在内容末尾时，自动感知祖先容器上下文并注册自身高度，父容器为内部局部滚动内容自动追加等高 padding-bottom 占位垫块防遮挡；内嵌的 AtengAnchor 在未显式声明 container 属性时，自动识别并绑定页面容器的局部滚动内容区。"
          show-icon
          :closable="false"
          style="margin-bottom: 16px"
        />

        <div v-if="showAnchor" class="anchor-wrapper" style="margin-bottom: 16px">
          <AtengAnchor :items="anchorItems" direction="horizontal" />
        </div>

        <div id="sec-table" style="margin-bottom: 20px">
          <ElTable :data="mockTableData" border stripe style="width: 100%">
            <ElTableColumn prop="id" label="工号" width="100" />
            <ElTableColumn prop="name" label="姓名" width="120" />
            <ElTableColumn prop="dept" label="所属部门" width="180" />
            <ElTableColumn prop="role" label="岗位角色" />
            <ElTableColumn prop="status" label="状态" width="100">
              <template #default="{ row }">
                <ElTag :type="row.status === '正常' ? 'success' : 'danger'" size="small">
                  {{ row.status }}
                </ElTag>
              </template>
            </ElTableColumn>
          </ElTable>
        </div>

        <div id="sec-audit" class="audit-box">
          <h4>安全合规审计与团队日志</h4>
          <p>所有成员权限操作均受零信任分布式鉴权策略约束，变动行为已写入审计日志存储。</p>
        </div>

        <!-- 嵌套在内容末尾的底栏演示（触发父容器自动注入 padding-bottom 垫块） -->
        <AtengFooterBar
          v-if="footerMode === 'nested'"
          position="sticky"
          submit-text="提交审核 (内容嵌套自动占位模式)"
          show-reset
          show-cancel
        />
      </div>
    </AtengPageContainer>
  </div>
</template>

<style scoped>
.page-container-view {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.page-container-view.is-full-height {
  height: calc(100vh - 120px);
}

.control-panel {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 16px;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
  margin-bottom: 16px;
}

.ctrl-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.content-body {
  width: 100%;
}

.audit-box {
  padding: 16px;
  background-color: var(--el-fill-color-light);
  border-radius: var(--el-border-radius-base);
  margin-top: 16px;
  margin-bottom: 24px;
}

.anchor-wrapper {
  padding: 8px 12px;
  background-color: var(--el-fill-color-light);
  border-radius: var(--el-border-radius-base);
}
</style>
