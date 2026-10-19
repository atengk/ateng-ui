#!/usr/bin/env bash
# ==============================================================================
# Changesets 独立发版与发布交互助手 (Release Helper)
#
# 辅助开发者在本地进行 Changeset 记录创建、版本号消耗升级与 npm 构件发布。
#
# @author atengk
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

CURRENT_BRANCH=$(git symbolic-ref --short -q HEAD || echo "HEAD")

printf "\n%b============================================================%b\n" "${COLOR_BOLD}${COLOR_CYAN}" "${COLOR_RESET}"
printf "%b       ateng-ui Changesets 版本流转与发布交互助手       %b\n" "${COLOR_BOLD}${COLOR_CYAN}" "${COLOR_RESET}"
printf "%b============================================================%b\n" "${COLOR_BOLD}${COLOR_CYAN}" "${COLOR_RESET}"
log_info "当前分支: ${CURRENT_BRANCH}"

printf "\n%b请选择发版操作步骤:%b\n" "${COLOR_BOLD}" "${COLOR_RESET}"
printf "  %b1)%b  创建变更记录 (pnpm changeset) - 记录修改与 semver 影响\n" "${COLOR_GREEN}" "${COLOR_RESET}"
printf "  %b2)%b  消耗变更集并升级版本 (pnpm changeset version) - 更新 package.json 与 CHANGELOG\n" "${COLOR_GREEN}" "${COLOR_RESET}"
printf "  %b3)%b  本地打包并发布至 npm (pnpm changeset publish)\n" "${COLOR_GREEN}" "${COLOR_RESET}"
printf "  %b4)%b  一键完整发布 (构建 -> 校验 -> 发布)\n" "${COLOR_GREEN}" "${COLOR_RESET}"
printf "  %b0)%b  退出\n\n" "${COLOR_YELLOW}" "${COLOR_RESET}"

printf "%b请输入操作编号 [0-4]: %b" "${COLOR_BOLD}" "${COLOR_RESET}"
read -r CHOICE

case "$CHOICE" in
  1)
    log_info "正在启动 Changeset 变更记录向导..."
    pnpm changeset
    log_success "变更集已成功生成于 .changeset/ 目录！请将其加入 git 暂存并提交。"
    ;;
  2)
    log_info "正在根据变更集计算并升级各子包版本号与 CHANGELOG..."
    pnpm changeset version
    pnpm install --lockfile-only
    log_success "版本号与 CHANGELOG 升级完毕，请审阅 diff 后提交。"
    ;;
  3)
    if [ "$CURRENT_BRANCH" != "main" ]; then
      log_warn "⚠️ 强烈建议仅在 [main] 主干分支执行正式 npm 发布！当前为: ${CURRENT_BRANCH}"
      printf "是否仍然强制继续发布? [y/N]: "
      read -r FORCE_PUB
      if [ "$FORCE_PUB" != "y" ] && [ "$FORCE_PUB" != "Y" ]; then
        log_info "已取消发布。"
        exit 0
      fi
    fi
    log_info "正在执行多包独立发版 (发布至官方 npm，Access: public)..."
    pnpm changeset publish
    log_success "发布流程执行完毕！"
    ;;
  4)
    log_info "执行全套发布前构建与验证..."
    pnpm run build
    pnpm run test
    pnpm changeset publish
    log_success "全流程构建与发布完毕！"
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
