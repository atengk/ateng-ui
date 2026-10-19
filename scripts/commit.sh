#!/usr/bin/env bash
# ==============================================================================
# Conventional Commits 规范化提交助手 (支持交互式与非交互式/AI自动化调用)
#
# 引导开发者或自动化脚本按规范组装提交信息，支持标题、多行列表详情 (Body)、
# GitHub Issue 关联/闭环 (Footer: Closes #N / Refs #N)、双分支安全守卫、
# 提供变更预览、类型校验、列表组装与一键推送。
#
# @author atengk
# @since 2026-10-19
# ==============================================================================

set -eo pipefail

# 终端色彩定义（在支持的终端下提供视觉区分，兼容非 TTY 降级）
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

log_info() {
  printf "%b[INFO]%b %s\n" "${COLOR_BLUE}" "${COLOR_RESET}" "$1"
}

log_success() {
  printf "%b[SUCCESS]%b %s\n" "${COLOR_GREEN}" "${COLOR_RESET}" "$1"
}

log_warn() {
  printf "%b[WARN]%b %s\n" "${COLOR_YELLOW}" "${COLOR_RESET}" "$1"
}

log_error() {
  printf "%b[ERROR]%b %s\n" "${COLOR_RED}" "${COLOR_RESET}" "$1"
}

append_issue_footers() {
  local prefix="$1"
  shift
  local raw_items=("$@")
  for raw in "${raw_items[@]}"; do
    local clean_raw
    clean_raw=$(echo "$raw" | tr ',' ' ')
    for id in $clean_raw; do
      id=$(echo "$id" | tr -d ' #\r\t')
      if [ -n "$id" ]; then
        local line="${prefix} #${id}"
        if [ -z "$COMMIT_FOOTER" ]; then
          COMMIT_FOOTER="$line"
        elif ! echo "$COMMIT_FOOTER" | grep -Fqx "$line" >/dev/null 2>&1; then
          COMMIT_FOOTER="${COMMIT_FOOTER}"$'\n'"$line"
        fi
      fi
    done
  done
}

# ==============================================================================
# 1. 命令行参数解析 (支持非交互式调用)
# ==============================================================================
CLI_TYPE=""
CLI_SCOPE=""
CLI_MSG=""
CLI_BODY=""
CLI_ITEMS=()
CLI_CLOSES=()
CLI_REFS=()
CLI_BREAKING=false
CLI_STAGE_ALL=false
CLI_DRY_RUN=false
CLI_PUSH=false
AUTO_CONFIRM=false
IS_NON_INTERACTIVE=false

show_help() {
  printf "%b\n" "用法: bash scripts/commit.sh [选项]"
  printf "%b\n" ""
  printf "%b\n" "选项说明 (支持交互向导与非交互式/AI自动化调用):"
  printf "%b\n" "  -t, --type <type>       提交类型 (feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)"
  printf "%b\n" "  -s, --scope <scope>     可选影响范围 (推荐: core, vue, element-plus, sample-core, sample-vue, sample-element-plus, root, deps, ci, docs, changeset)"
  printf "%b\n" "  -m, --message <msg>     提交主标题描述 (必填，简明扼要)"
  printf "%b\n" "  -d, --detail, --body    提交正文详细说明 (可选，支持多行文本)"
  printf "%b\n" "  -l, --item <text>       提交详细条目列表 (可选，可多次传入，自动组装为列表)"
  printf "%b\n" "  -c, --close, --closes   指定关闭的 Issue (可选，支持单个如 -c 12，多个如 -c 12 -c 13 或 -c \"12, 13\")"
  printf "%b\n" "  -i, --issue, --ref      指定关联引用的 Issue (可选，支持单个如 -i 12，多个如 -i 12 -i 13 或 -i \"12, 13\")"
  printf "%b\n" "  -b, --breaking          标记为破坏性更新 (Breaking Changes，自动追加 !)"
  printf "%b\n" "  -a, --all               自动暂存全部变动 (⚠️ [高危/不推荐] 相当于 git add -A，严禁日常或 Agent 自动化使用)"
  printf "%b\n" "  -n, --dry-run           演练空跑模式 (仅预览拟生成的提交信息与暂存区，不实际执行提交与推送)"
  printf "%b\n" "  -p, --push              提交成功后自动推送到当前分支远程仓库"
  printf "%b\n" "  -y, --yes               跳过确认提示，直接执行提交"
  printf "%b\n" "  -h, --help              显示帮助信息"
  printf "%b\n" ""
  printf "%b\n" "无参数运行示例 (交互向导模式):"
  printf "%b\n" "  git add <file-path>"
  printf "%b\n" "  bash scripts/commit.sh"
  printf "%b\n" ""
  printf "%b\n" "非交互式调用示例 (必须先精准 git add，严禁使用 git add .):"
  printf "%b\n" "  # 1. 基础提交与推送"
  printf "%b\n" "  git add packages/core/src/index.ts"
  printf "%b\n" "  bash scripts/commit.sh -t feat -s core -m \"支持 Axios 响应自动大数转换\" -l \"重构转换器\" -p -y"
  printf "%b\n" ""
  printf "%b\n" "  # 2. 单 Issue 闭环示例"
  printf "%b\n" "  bash scripts/commit.sh -t fix -s vue -m \"修复 usePagination 边界越界\" -c 10 -p -y"
}

while [ $# -gt 0 ]; do
  case "$1" in
    -t|--type)
      CLI_TYPE="$2"
      IS_NON_INTERACTIVE=true
      shift 2
      ;;
    -s|--scope)
      CLI_SCOPE="$2"
      shift 2
      ;;
    -m|--message)
      CLI_MSG="$2"
      IS_NON_INTERACTIVE=true
      shift 2
      ;;
    -d|--detail|--body)
      CLI_BODY="$2"
      shift 2
      ;;
    -l|--item)
      CLI_ITEMS+=("$2")
      shift 2
      ;;
    -c|--close|--closes)
      CLI_CLOSES+=("$2")
      shift 2
      ;;
    -i|--issue|--ref|--refs)
      CLI_REFS+=("$2")
      shift 2
      ;;
    -b|--breaking)
      CLI_BREAKING=true
      shift
      ;;
    -a|--all)
      CLI_STAGE_ALL=true
      shift
      ;;
    -n|--dry-run)
      CLI_DRY_RUN=true
      shift
      ;;
    -p|--push)
      CLI_PUSH=true
      shift
      ;;
    -y|--yes)
      AUTO_CONFIRM=true
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      log_error "未知参数: $1 (使用 -h 或 --help 查看支持的选项)"
      exit 1
      ;;
  esac
done

# ==============================================================================
# 2. 基础环境与工作区自检
# ==============================================================================
if ! command -v git >/dev/null 2>&1; then
  log_error "未检测到 git 命令，请先安装 Git。"
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log_error "当前目录并非有效的 Git 工作区！"
  exit 1
fi

CURRENT_BRANCH=$(git symbolic-ref --short -q HEAD || echo "HEAD")
log_info "当前分支: ${CURRENT_BRANCH}"

if [ "$CURRENT_BRANCH" = "main" ]; then
  log_warn "⚠️ 当前处于稳定主干分支 [main]！建议日常开发在 [dev] 或特性分支进行。"
fi

# ==============================================================================
# 3. 暂存区检查
# ==============================================================================
if [ "$CLI_STAGE_ALL" = true ]; then
  log_warn "检测到 -a / --all 参数，正在自动暂存当前工作区的所有变更..."
  git add -A
fi

if git diff --cached --quiet; then
  if [ "$CLI_DRY_RUN" = true ]; then
    log_warn "【Dry Run 演练模式】检测到暂存区当前无内容，继续执行提交信息组装与预览演练。"
  else
    log_error "暂存区无任何可提交的内容，请先使用 'git add <file>' 暂存改动。"
    exit 1
  fi
fi

# ==============================================================================
# 4. 收集与校验提交信息
# ==============================================================================
VALID_TYPES="^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)$"
INTERACTIVE_ITEMS=()
INTERACTIVE_CLOSES=()
INTERACTIVE_REFS=()

if [ "$IS_NON_INTERACTIVE" = true ]; then
  TYPE="$CLI_TYPE"
  if ! echo "$TYPE" | grep -Eq "$VALID_TYPES"; then
    log_error "无效的提交类型: [$TYPE]。必须为下列之一:"
    log_error "feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert"
    exit 1
  fi

  SUBJECT=$(echo "$CLI_MSG" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  if [ -z "$SUBJECT" ]; then
    log_error "提交描述 (-m, --message) 不能为空！"
    exit 1
  fi

  SCOPE=$(echo "$CLI_SCOPE" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  if [ "$CLI_BREAKING" = true ]; then
    BREAKING_FLAG="!"
  else
    BREAKING_FLAG=""
  fi
else
  printf "\n%b请选择本次提交类型 (Commit Type):%b\n" "${COLOR_BOLD}" "${COLOR_RESET}"
  printf "  %b1)%b  feat     : 🚀 新特性 / 新功能 (Features)\n" "${COLOR_GREEN}" "${COLOR_RESET}"
  printf "  %b2)%b  fix      : 🐛 缺陷与 Bug 修复 (Bug Fixes)\n" "${COLOR_GREEN}" "${COLOR_RESET}"
  printf "  %b3)%b  docs     : 📝 仅文档变动 (Documentation)\n" "${COLOR_GREEN}" "${COLOR_RESET}"
  printf "  %b4)%b  style    : 🎨 代码格式与排版调整（不影响逻辑，Style）\n" "${COLOR_GREEN}" "${COLOR_RESET}"
  printf "  %b5)%b  refactor : 🚜 代码重构（既非新特性也非缺陷修复，Refactor）\n" "${COLOR_GREEN}" "${COLOR_RESET}"
  printf "  %b6)%b  perf     : ⚡ 性能优化 (Performance)\n" "${COLOR_GREEN}" "${COLOR_RESET}"
  printf "  %b7)%b  test     : 🧪 测试相关（新增用例或重构测试，Tests）\n" "${COLOR_GREEN}" "${COLOR_RESET}"
  printf "  %b8)%b  build    : 📦 构建系统、外部依赖或脚手架调整 (Build)\n" "${COLOR_GREEN}" "${COLOR_RESET}"
  printf "  %b9)%b  ci       : 👷 CI/CD 流水线与 GitHub Actions 修改 (CI)\n" "${COLOR_GREEN}" "${COLOR_RESET}"
  printf "  %b10)%b chore    : 🧹 杂项维护（不改动源码与测试，Chore）\n" "${COLOR_GREEN}" "${COLOR_RESET}"
  printf "  %b11)%b revert   : ⏪ 代码回滚 (Revert)\n" "${COLOR_GREEN}" "${COLOR_RESET}"
  printf "  %b0)%b  q / exit : 🚪 取消并退出\n\n" "${COLOR_YELLOW}" "${COLOR_RESET}"

  TYPE=""
  while [ -z "$TYPE" ]; do
    printf "%b请输入对应数字编号 [1-11]: %b" "${COLOR_BOLD}" "${COLOR_RESET}"
    read -r TYPE_NUM
    case "$TYPE_NUM" in
      1) TYPE="feat" ;;
      2) TYPE="fix" ;;
      3) TYPE="docs" ;;
      4) TYPE="style" ;;
      5) TYPE="refactor" ;;
      6) TYPE="perf" ;;
      7) TYPE="test" ;;
      8) TYPE="build" ;;
      9) TYPE="ci" ;;
      10) TYPE="chore" ;;
      11) TYPE="revert" ;;
      0|[qQ]|[eE][xX][iI][tT])
        log_warn "用户取消操作，退出提交向导。"
        exit 0
        ;;
      *)
        log_warn "无效选项，请输入 0 到 11 之间的编号。"
        ;;
    esac
  done

  printf "\n%b请选择或输入影响范围 Scope (留空按回车，推荐选择):%b\n" "${COLOR_BOLD}" "${COLOR_RESET}"
  printf "  1) core                2) vue               3) element-plus\n"
  printf "  4) sample-core         5) sample-vue        6) sample-element-plus\n"
  printf "  7) root                8) deps              9) ci\n"
  printf "  10) docs               11) changeset        0) 自定义 / 留空\n"
  printf "%b请输入编号或直接输入范围名: %b" "${COLOR_BOLD}" "${COLOR_RESET}"
  read -r SCOPE_INPUT
  case "$SCOPE_INPUT" in
    1) SCOPE="core" ;;
    2) SCOPE="vue" ;;
    3) SCOPE="element-plus" ;;
    4) SCOPE="sample-core" ;;
    5) SCOPE="sample-vue" ;;
    6) SCOPE="sample-element-plus" ;;
    7) SCOPE="root" ;;
    8) SCOPE="deps" ;;
    9) SCOPE="ci" ;;
    10) SCOPE="docs" ;;
    11) SCOPE="changeset" ;;
    0|"") SCOPE="" ;;
    *) SCOPE=$(echo "$SCOPE_INPUT" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//') ;;
  esac

  printf "%b是否包含破坏性更新 (Breaking Changes)? [y/N]: %b" "${COLOR_BOLD}" "${COLOR_RESET}"
  read -r IS_BREAKING
  IS_BREAKING=$(echo "$IS_BREAKING" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  case "$IS_BREAKING" in
    [yY][eE][sS]|[yY]) BREAKING_FLAG="!" ;;
    *) BREAKING_FLAG="" ;;
  esac

  SUBJECT=""
  while [ -z "$SUBJECT" ]; do
    printf "%b请输入提交主标题 Subject (必填，简要概括本次变动): %b" "${COLOR_BOLD}" "${COLOR_RESET}"
    read -r SUBJECT
    SUBJECT=$(echo "$SUBJECT" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    if [ -z "$SUBJECT" ]; then
      log_warn "提交主标题不能为空，请重新输入。"
    fi
  done

  printf "\n%b请输入详细变更列表 Body (可选，按回车逐条输入，直接回车跳过/空行结束):%b\n" "${COLOR_BOLD}" "${COLOR_RESET}"
  ITEM_INDEX=1
  while true; do
    printf "  %b[%d]%b 条目说明: " "${COLOR_CYAN}" "$ITEM_INDEX" "${COLOR_RESET}"
    read -r LINE_ITEM
    LINE_ITEM=$(echo "$LINE_ITEM" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    if [ -z "$LINE_ITEM" ]; then
      break
    fi
    INTERACTIVE_ITEMS+=("- ${LINE_ITEM}")
    ITEM_INDEX=$((ITEM_INDEX + 1))
  done

  printf "\n%b关联 GitHub Issue 自动闭环 (如需关闭多个请用空格或逗号隔开，无则回车跳过):%b\n" "${COLOR_BOLD}" "${COLOR_RESET}"
  printf "  Closes Issues (如 12 15): "
  read -r CLOSES_INPUT
  if [ -n "$CLOSES_INPUT" ]; then
    INTERACTIVE_CLOSES+=("$CLOSES_INPUT")
  fi

  printf "  Refs Issues (仅引用不关闭，如 18): "
  read -r REFS_INPUT
  if [ -n "$REFS_INPUT" ]; then
    INTERACTIVE_REFS+=("$REFS_INPUT")
  fi
fi

# 组装 Header
if [ -n "$SCOPE" ]; then
  COMMIT_HEADER="${TYPE}(${SCOPE})${BREAKING_FLAG}: ${SUBJECT}"
else
  COMMIT_HEADER="${TYPE}${BREAKING_FLAG}: ${SUBJECT}"
fi

# 组装 Body
COMMIT_BODY=""
if [ -n "$CLI_BODY" ]; then
  COMMIT_BODY="$CLI_BODY"
fi

for item in "${CLI_ITEMS[@]}"; do
  if [ -z "$COMMIT_BODY" ]; then
    COMMIT_BODY="- $item"
  else
    COMMIT_BODY="${COMMIT_BODY}"$'\n'"- $item"
  fi
done

for item in "${INTERACTIVE_ITEMS[@]}"; do
  if [ -z "$COMMIT_BODY" ]; then
    COMMIT_BODY="$item"
  else
    COMMIT_BODY="${COMMIT_BODY}"$'\n'"$item"
  fi
done

# 组装 Footer
COMMIT_FOOTER=""
append_issue_footers "Closes" "${CLI_CLOSES[@]}" "${INTERACTIVE_CLOSES[@]}"
append_issue_footers "Refs" "${CLI_REFS[@]}" "${INTERACTIVE_REFS[@]}"

# 预览
printf "\n%b\n" "${COLOR_BOLD}${COLOR_CYAN}------------------- 拟生成的提交信息预览 -------------------${COLOR_RESET}"
printf "%b\n" "${COLOR_BOLD}${COLOR_GREEN}${COMMIT_HEADER}${COLOR_RESET}"
if [ -n "$COMMIT_BODY" ]; then
  printf "\n%b\n" "${COLOR_CYAN}${COMMIT_BODY}${COLOR_RESET}"
fi
if [ -n "$COMMIT_FOOTER" ]; then
  printf "\n%b\n" "${COLOR_YELLOW}${COMMIT_FOOTER}${COLOR_RESET}"
fi
printf "%b\n\n" "${COLOR_BOLD}${COLOR_CYAN}------------------------------------------------------------${COLOR_RESET}"

if [ "$CLI_DRY_RUN" = true ]; then
  log_info "【Dry Run 演练模式】提交信息组装与格式校验完成，已安全跳过实际提交与远程推送。"
  exit 0
fi

if [ "$AUTO_CONFIRM" = true ] || [ ! -t 0 ]; then
  log_info "已指定 -y 或处于非交互环境，直接执行提交。"
else
  printf "%b是否确认以此信息执行提交? [Y/n]: %b" "${COLOR_BOLD}" "${COLOR_RESET}"
  read -r CONFIRM_COMMIT
  CONFIRM_COMMIT=$(echo "$CONFIRM_COMMIT" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  case "$CONFIRM_COMMIT" in
    [nN][oO]|[nN])
      log_warn "操作已由用户取消，未执行任何提交。"
      exit 0
      ;;
    *)
      ;;
  esac
fi

# 执行提交
if [ -n "$COMMIT_BODY" ] && [ -n "$COMMIT_FOOTER" ]; then
  git commit -m "$COMMIT_HEADER" -m "$COMMIT_BODY" -m "$COMMIT_FOOTER"
elif [ -n "$COMMIT_BODY" ]; then
  git commit -m "$COMMIT_HEADER" -m "$COMMIT_BODY"
elif [ -n "$COMMIT_FOOTER" ]; then
  git commit -m "$COMMIT_HEADER" -m "$COMMIT_FOOTER"
else
  git commit -m "$COMMIT_HEADER"
fi
log_success "代码提交成功！"

# 推送
if [ "$CLI_PUSH" = true ]; then
  log_info "正在自动推送到 origin/${CURRENT_BRANCH}..."
  git push origin "$CURRENT_BRANCH"
  log_success "推送成功！"
elif [ -t 0 ] && [ "$AUTO_CONFIRM" = false ]; then
  printf "\n%b是否立即推送到远程分支 (origin/%s)? [y/N]: %b" "${COLOR_BOLD}" "$CURRENT_BRANCH" "${COLOR_RESET}"
  read -r CONFIRM_PUSH
  CONFIRM_PUSH=$(echo "$CONFIRM_PUSH" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  case "$CONFIRM_PUSH" in
    [yY][eE][sS]|[yY])
      log_info "正在推送到 origin/${CURRENT_BRANCH}..."
      git push origin "$CURRENT_BRANCH"
      log_success "推送成功！"
      ;;
    *)
      log_info "已跳过远程推送。你可以在就绪后随时运行 'git push origin ${CURRENT_BRANCH}'。"
      ;;
  esac
fi
