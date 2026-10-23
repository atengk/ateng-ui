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
} from 'element-plus';
import { AtengPageContainer } from '@atengk/element-plus';

const activeTab = ref('users');
const isGhost = ref(false);
const isFitViewport = ref(false);
const isFixedHeader = ref(false);
const isHeaderBlur = ref(true);
const isAutoBreadcrumb = ref(false);
const isFullscreen = ref(false);
const showFullscreenBtn = ref(true);
const collapseHeaderOnScroll = ref(true);

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
        <span>吸顶毛玻璃 (headerBlur)：</span>
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
      @back="handleBack"
      @fullscreen="handleFullscreen"
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

      <!-- 主体内容 -->
      <div class="content-body">
        <ElAlert
          title="AtengPageContainer 核心设计与全屏/折叠增强"
          type="info"
          description="标配统一页头结构（面包屑/返回键/主副标题/状态 Tag/Extra 操作区/内嵌 Tabs）。支持双模滚动切换：默认整页流动，开启 fitViewport 后 Flex 100% 撑满视口剩余高度并局部滚动；脱壳全屏特性：通过 <Teleport to='body'> 将容器瞬移至顶层，彻底绕过父级侧边栏包含块 CSS transform 限制，集成 lockScroll 滚动防穿透锁并支持 ESC 退出；沉浸式折叠：向下滚动平滑收折页头，回滚平滑复原。"
          show-icon
          :closable="false"
          style="margin-bottom: 16px"
        />

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
</style>
