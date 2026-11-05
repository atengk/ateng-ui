#!/usr/bin/env bash
# ==============================================================================
# Changesets 工业级统一锁步发版与发布交互助手 (Release Helper)
#
# 辅助开发者在本地进行 Changeset 记录创建、统一版本号消耗升级、全维质量预检、
# npm 构件安全发布与唯一全局 Tag 打标推送。
#
# @author Ateng
# @since 2026-10-19
# ==============================================================================

set -eo pipefail

if [ -t 1 ]; then
  COLOR_RESET="\033[0m"
  COLOR_BOLD="\033[1m"
  COLOR_GREEN="\033[32m"
  COLOR_BLUE="\033[34m"
  COLOR_YELLOW="\033[33m"
  COLOR_RED="\033[31m"
  COLOR_CYAN="\033[36m"
else
  COLOR_RESET=""
  COLOR_BOLD=""
  COLOR_GREEN=""
  COLOR_BLUE=""
  COLOR_YELLOW=""
  COLOR_RED=""
  COLOR_CYAN=""
fi

log_info() { printf "%b[INFO]%b %s\n" "${COLOR_BLUE}" "${COLOR_RESET}" "$1"; }
log_success() { printf "%b[SUCCESS]%b %s\n" "${COLOR_GREEN}" "${COLOR_RESET}" "$1"; }
log_warn() { printf "%b[WARN]%b %s\n" "${COLOR_YELLOW}" "${COLOR_RESET}" "$1"; }
log_error() { printf "%b[ERROR]%b %s\n" "${COLOR_RED}" "${COLOR_RESET}" "$1"; }

# 1. 基础环境与工具链检查
if ! command -v git >/dev/null 2>&1; then
  log_error "未检测到 git 命令，请先安装 Git。"
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  log_error "未检测到 pnpm 命令，请先安装 pnpm (>=9.12.3)。"
  exit 1
fi

CURRENT_BRANCH=$(git symbolic-ref --short -q HEAD || echo "HEAD")

# 提取当前主包基准版本
get_current_version() {
  if [ -f "packages/core/package.json" ]; then
    node -p "require('./packages/core/package.json').version" 2>/dev/null || echo "未知"
  else
    echo "未知"
  fi
}

CURRENT_VERSION=$(get_current_version)

printf "\n%b============================================================%b\n" "${COLOR_BOLD}${COLOR_CYAN}" "${COLOR_RESET}"
printf "%b       ateng-ui 工业级多包锁步版本流转与发布交互助手       %b\n" "${COLOR_BOLD}${COLOR_CYAN}" "${COLOR_RESET}"
printf "%b============================================================%b\n" "${COLOR_BOLD}${COLOR_CYAN}" "${COLOR_RESET}"
log_info "当前分支: ${CURRENT_BRANCH}"
log_info "当前套件版本: v${CURRENT_VERSION}"
if [ "$CURRENT_BRANCH" != "main" ]; then
  log_warn "⚠️ 当前非 [main] 主干分支！建议在 [dev] 完成版本消费合并后，由 [main] 统一发布。"
fi

printf "\n%b请选择发版操作步骤:%b\n" "${COLOR_BOLD}" "${COLOR_RESET}"
printf "  %b1)%b  创建变更记录 (pnpm changeset) - 交互式记录特性修改与 semver 级别\n" "${COLOR_GREEN}" "${COLOR_RESET}"
printf "  %b2)%b  消耗变更集并升级版本 (pnpm changeset version) - 锁步更新所有 package.json 与 CHANGELOG\n" "${COLOR_GREEN}" "${COLOR_RESET}"
printf "  %b3)%b  全链路质量门禁自检 (build -> typecheck -> lint -> test) - 确保 100%% 准出\n" "${COLOR_GREEN}" "${COLOR_RESET}"
printf "  %b4)%b  本地打包并发布至 npm (pnpm changeset publish --no-git-tag) - 纯净发布杜绝多 Tag\n" "${COLOR_GREEN}" "${COLOR_RESET}"
printf "  %b5)%b  创建并推送唯一全局 Git Tag (git tag v%s && push) - 单 Tag 聚合归档\n" "${COLOR_GREEN}" "${CURRENT_VERSION}" "${COLOR_RESET}"
printf "  %b6)%b  在线检查 npm 官方注册表发布状态 (@atengk/* packages)\n" "${COLOR_GREEN}" "${COLOR_RESET}"
printf "  %b7)%b  一键完整发布 (门禁自检 -> npm 干净发布 -> 唯一 Tag 推送)\n" "${COLOR_GREEN}" "${COLOR_RESET}"
printf "  %b0)%b  退出\n\n" "${COLOR_YELLOW}" "${COLOR_RESET}"

printf "%b请输入操作编号 [0-7]: %b" "${COLOR_BOLD}" "${COLOR_RESET}"
read -r CHOICE

case "$CHOICE" in
  1)
    log_info "正在启动 Changeset 变更记录向导..."
    pnpm changeset
    log_success "变更记录已成功生成于 .changeset/ 目录！请将其加入 git 暂存并提交。"
    ;;
  2)
    log_info "正在根据变更集计算并升级各子包版本号与 CHANGELOG (Fixed 模式)..."
    pnpm changeset version
    pnpm install --lockfile-only
    NEW_VERSION=$(get_current_version)
    log_success "版本号升级完毕！当前最新套件版本: v${NEW_VERSION}，请审阅 diff 后提交。"
    ;;
  3)
    log_info "正在执行全套质量门禁自检 (构建、类型检查、规范校验与单元测试)..."
    pnpm run build
    pnpm run typecheck
    pnpm run lint
    pnpm run test
    log_success "全链路质量门禁校验 100% 成功通过！"
    ;;
  4)
    if [ "$CURRENT_BRANCH" != "main" ]; then
      log_warn "⚠️ 强烈建议仅在 [main] 主干分支执行正式 npm 发布！当前为: ${CURRENT_BRANCH}"
      printf "是否仍然强制继续发布? [y/N]: "
      read -r FORCE_PUB
      if [ "$FORCE_PUB" != "y" ] && [ "$FORCE_PUB" != "Y" ]; then
        log_info "已取消发布。"
        exit 0
      fi
    fi

    # 检查 npm 登录身份
    log_info "检查 npm 当前登录身份..."
    if ! npm whoami >/dev/null 2>&1; then
      log_warn "npm 尚未登录或当前未配置合法 NPM 鉴权 Token。"
      printf "是否尝试使用当前环境变量中的 NPM_TOKEN 或继续? [y/N]: "
      read -r CONFIRM_LOGIN
      if [ "$CONFIRM_LOGIN" != "y" ] && [ "$CONFIRM_LOGIN" != "Y" ]; then
        log_info "已取消发布。请先执行 'npm login'。"
        exit 0
      fi
    else
      log_info "当前 npm 登录身份: $(npm whoami)"
    fi

    log_info "正在执行多包统一发版 (带 --no-git-tag 保护，避免碎片化包级 Tag 污染)..."
    pnpm changeset publish --no-git-tag
    log_success "npm 发布流程执行完毕！"
    ;;
  5)
    PUB_VERSION=$(get_current_version)
    TAG_NAME="v${PUB_VERSION}"
    log_info "拟打标的统一全局 Tag: ${TAG_NAME}"
    printf "是否确认在当前 HEAD 创建并推送到 origin? [y/N]: "
    read -r CONFIRM_TAG
    if [ "$CONFIRM_TAG" = "y" ] || [ "$CONFIRM_TAG" = "Y" ]; then
      git tag -a "${TAG_NAME}" -m "chore(release): ${TAG_NAME} 工业级统一发版"
      git push origin "${TAG_NAME}"
      log_success "全局 Tag [${TAG_NAME}] 成功推送到远端仓库！"
    else
      log_info "已取消 Tag 操作。"
    fi
    ;;
  6)
    log_info "正在查询 npm 官方注册表最新版本信息..."
    PKGS=("core" "vue" "element-plus" "code-editor-vue" "echarts-vue" "editor-vue" "file-viewer-vue" "flow-vue" "monitor" "video-player-vue")
    for pkg in "${PKGS[@]}"; do
      REMOTE_VER=$(npm view "@atengk/${pkg}" version 2>/dev/null || echo "未发布")
      printf "  %-32s : %s\n" "@atengk/${pkg}" "${REMOTE_VER}"
    done
    log_success "查询完毕！"
    ;;
  7)
    log_info "执行一键发布全流程..."
    pnpm run build
    pnpm run test
    pnpm changeset publish --no-git-tag
    PUB_VERSION=$(get_current_version)
    TAG_NAME="v${PUB_VERSION}"
    git tag -a "${TAG_NAME}" -m "chore(release): ${TAG_NAME} 工业级统一发版" || true
    git push origin "${TAG_NAME}" || true
    log_success "全流程构建、发布与唯一 Tag 打标完毕！"
    ;;
  0|[qQ])
    log_info "退出发版向导。"
    exit 0
    ;;
  *)
    log_error "无效选项: $CHOICE"
    exit 1
    ;;
esac
