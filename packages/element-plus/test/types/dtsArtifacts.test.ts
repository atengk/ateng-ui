/**
 * `@atengk/element-plus` 类型声明产物与泛型契约回归门禁测试。
 *
 * 验证：
 * 1. `dist/` 目录为 39 个公开 SFC 组件与 4 个内部子组件生成完整 `.vue.d.ts` 文件（共 43 个）；
 * 2. `dist/index.d.ts` 导出 `./global`，且 `dist/global.d.ts` 注册全部 39 组 `Ateng*` + `At*`（78 个）全局组件声明，同时排除内部子组件；
 * 3. `AtengTable`、`AtengQueryForm`、`AtengDescriptions` 维持 `T extends object` 泛型约束与无 `slots: any` / `& any` 退化；
 * 4. 全部 `.d.ts` 产物不包含 `.pnpm/` 不可移植路径（防 TS2742）；
 * 5. 通过 TypeScript 编译器验证下游消费端在无索引签名 `interface`、`UsePaginationResult<Row, Query>`、`QueryFormPagination<T>`、`ProMenuRawItem` 与 `GlobalComponents` 场景下零诊断错误。
 *
 * @author Ateng
 * @since 2026-11-24
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';

const PKG_ROOT = path.resolve(__dirname, '../..');
const DIST_DIR = path.join(PKG_ROOT, 'dist');

/** 39 个公开 SFC 组件及其相对于 dist/ 的声明路径 */
const PUBLIC_COMPONENT_DTS: ReadonlyArray<{
  atengName: string;
  atName: string;
  relPath: string;
}> = [
  {
    atengName: 'AtengDialog',
    atName: 'AtDialog',
    relPath: 'components/dialog/AtengDialog.vue.d.ts',
  },
  {
    atengName: 'AtengDrawer',
    atName: 'AtDrawer',
    relPath: 'components/drawer/AtengDrawer.vue.d.ts',
  },
  { atengName: 'AtengEmpty', atName: 'AtEmpty', relPath: 'components/empty/AtengEmpty.vue.d.ts' },
  {
    atengName: 'AtengPageContainer',
    atName: 'AtPageContainer',
    relPath: 'components/page-container/AtengPageContainer.vue.d.ts',
  },
  {
    atengName: 'AtengSplitLayout',
    atName: 'AtSplitLayout',
    relPath: 'components/split-layout/AtengSplitLayout.vue.d.ts',
  },
  {
    atengName: 'AtengFooterBar',
    atName: 'AtFooterBar',
    relPath: 'components/footer-bar/AtengFooterBar.vue.d.ts',
  },
  { atengName: 'AtengCard', atName: 'AtCard', relPath: 'components/card/AtengCard.vue.d.ts' },
  {
    atengName: 'AtengCardGroup',
    atName: 'AtCardGroup',
    relPath: 'components/card/AtengCardGroup.vue.d.ts',
  },
  {
    atengName: 'AtengPageSkeleton',
    atName: 'AtPageSkeleton',
    relPath: 'components/page-skeleton/AtengPageSkeleton.vue.d.ts',
  },
  {
    atengName: 'AtengQueryForm',
    atName: 'AtQueryForm',
    relPath: 'components/query-form/AtengQueryForm.vue.d.ts',
  },
  { atengName: 'AtengTable', atName: 'AtTable', relPath: 'components/table/AtengTable.vue.d.ts' },
  {
    atengName: 'AtengDictSelect',
    atName: 'AtDictSelect',
    relPath: 'components/dict/AtengDictSelect.vue.d.ts',
  },
  {
    atengName: 'AtengDictRadio',
    atName: 'AtDictRadio',
    relPath: 'components/dict/AtengDictRadio.vue.d.ts',
  },
  {
    atengName: 'AtengDictCheckbox',
    atName: 'AtDictCheckbox',
    relPath: 'components/dict/AtengDictCheckbox.vue.d.ts',
  },
  {
    atengName: 'AtengDictTag',
    atName: 'AtDictTag',
    relPath: 'components/dict/AtengDictTag.vue.d.ts',
  },
  {
    atengName: 'AtengDescriptions',
    atName: 'AtDescriptions',
    relPath: 'components/descriptions/AtengDescriptions.vue.d.ts',
  },
  {
    atengName: 'AtengDescriptionsItem',
    atName: 'AtDescriptionsItem',
    relPath: 'components/descriptions/AtengDescriptionsItem.vue.d.ts',
  },
  {
    atengName: 'AtengDateRange',
    atName: 'AtDateRange',
    relPath: 'components/date-range/AtengDateRange.vue.d.ts',
  },
  {
    atengName: 'AtengExcelFeedback',
    atName: 'AtExcelFeedback',
    relPath: 'components/excel-feedback/AtengExcelFeedback.vue.d.ts',
  },
  {
    atengName: 'AtengExcelExport',
    atName: 'AtExcelExport',
    relPath: 'components/excel-export/AtengExcelExport.vue.d.ts',
  },
  {
    atengName: 'AtengUpload',
    atName: 'AtUpload',
    relPath: 'components/upload/AtengUpload.vue.d.ts',
  },
  {
    atengName: 'AtengStreamText',
    atName: 'AtStreamText',
    relPath: 'components/stream-text/AtengStreamText.vue.d.ts',
  },
  {
    atengName: 'AtengLogViewer',
    atName: 'AtLogViewer',
    relPath: 'components/log-viewer/AtengLogViewer.vue.d.ts',
  },
  {
    atengName: 'AtengStatistic',
    atName: 'AtStatistic',
    relPath: 'components/statistic/AtengStatistic.vue.d.ts',
  },
  {
    atengName: 'AtengCodeView',
    atName: 'AtCodeView',
    relPath: 'components/code-view/AtengCodeView.vue.d.ts',
  },
  {
    atengName: 'AtengIconSelect',
    atName: 'AtIconSelect',
    relPath: 'components/icon-select/AtengIconSelect.vue.d.ts',
  },
  {
    atengName: 'AtengCaptcha',
    atName: 'AtCaptcha',
    relPath: 'components/captcha/AtengCaptcha.vue.d.ts',
  },
  {
    atengName: 'AtengFilePreview',
    atName: 'AtFilePreview',
    relPath: 'components/file-preview/AtengFilePreview.vue.d.ts',
  },
  {
    atengName: 'AtengWatermark',
    atName: 'AtWatermark',
    relPath: 'components/watermark/AtengWatermark.vue.d.ts',
  },
  { atengName: 'AtengGrid', atName: 'AtGrid', relPath: 'components/grid/AtengGrid.vue.d.ts' },
  {
    atengName: 'AtengAnchor',
    atName: 'AtAnchor',
    relPath: 'components/anchor/AtengAnchor.vue.d.ts',
  },
  {
    atengName: 'AtengLayout',
    atName: 'AtLayout',
    relPath: 'components/layout/AtengLayout.vue.d.ts',
  },
  {
    atengName: 'AtengHeader',
    atName: 'AtHeader',
    relPath: 'components/layout/AtengHeader.vue.d.ts',
  },
  { atengName: 'AtengAside', atName: 'AtAside', relPath: 'components/layout/AtengAside.vue.d.ts' },
  {
    atengName: 'AtengContent',
    atName: 'AtContent',
    relPath: 'components/layout/AtengContent.vue.d.ts',
  },
  {
    atengName: 'AtengFooter',
    atName: 'AtFooter',
    relPath: 'components/layout/AtengFooter.vue.d.ts',
  },
  {
    atengName: 'AtengTabsNav',
    atName: 'AtTabsNav',
    relPath: 'components/tabs-nav/AtengTabsNav.vue.d.ts',
  },
  {
    atengName: 'AtengProLayout',
    atName: 'AtProLayout',
    relPath: 'components/pro-layout/AtengProLayout.vue.d.ts',
  },
  { atengName: 'AtengLoading', atName: 'AtLoading', relPath: 'loading/AtengLoading.vue.d.ts' },
];

/** 4 个内部子组件路径 */
const INTERNAL_SUBCOMPONENT_DTS: ReadonlyArray<{ name: string; relPath: string }> = [
  { name: 'IconPanel', relPath: 'components/icon-select/IconPanel.vue.d.ts' },
  { name: 'ProLayoutTabs', relPath: 'components/pro-layout/ProLayoutTabs.vue.d.ts' },
  { name: 'ProMenu', relPath: 'components/pro-layout/ProMenu.vue.d.ts' },
  { name: 'ProMenuItemNode', relPath: 'components/pro-layout/ProMenuItemNode.vue.d.ts' },
];

function collectDtsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectDtsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('@atengk/element-plus 类型声明产物与泛型回归门禁', () => {
  it('dist/ 产出全部 43 个 .vue.d.ts 声明文件', () => {
    expect(fs.existsSync(DIST_DIR)).toBe(true);

    for (const item of PUBLIC_COMPONENT_DTS) {
      const target = path.join(DIST_DIR, item.relPath);
      expect(fs.existsSync(target), `缺少公开组件声明: ${item.relPath}`).toBe(true);
    }

    for (const sub of INTERNAL_SUBCOMPONENT_DTS) {
      const target = path.join(DIST_DIR, sub.relPath);
      expect(fs.existsSync(target), `缺少子组件声明: ${sub.relPath}`).toBe(true);
    }

    const vueDtsCount = collectDtsFiles(DIST_DIR).filter(file => file.endsWith('.vue.d.ts')).length;
    expect(vueDtsCount).toBe(43);
  });

  it('dist/index.d.ts 导出 global 且 GlobalComponents 覆盖 39 组 78 个组件并排除内部子组件', () => {
    const indexDts = fs.readFileSync(path.join(DIST_DIR, 'index.d.ts'), 'utf-8');
    expect(indexDts).toContain("export * from './global';");

    const globalDts = fs.readFileSync(path.join(DIST_DIR, 'global.d.ts'), 'utf-8');
    expect(globalDts).toContain("declare module 'vue'");
    expect(globalDts).toContain('interface GlobalComponents');

    for (const item of PUBLIC_COMPONENT_DTS) {
      expect(globalDts).toContain(`${item.atengName}: typeof ${item.atengName};`);
      expect(globalDts).toContain(`${item.atName}: typeof ${item.atengName};`);
    }

    for (const sub of INTERNAL_SUBCOMPONENT_DTS) {
      expect(globalDts).not.toContain(sub.name);
    }
  });

  it('核心泛型 SFC 声明保持 T extends object、双泛型参数且无 slots/any 退化', () => {
    const tableDts = fs.readFileSync(
      path.join(DIST_DIR, 'components/table/AtengTable.vue.d.ts'),
      'utf-8',
    );
    expect(tableDts).toContain(
      '<T extends object = Record<string, unknown>, TParams extends PageQuery = PageQuery>',
    );
    expect(tableDts).toContain('slots: Readonly<AtengTableSlots<T>> & AtengTableSlots<T>;');
    expect(tableDts).not.toMatch(/slots:.*any/);

    const queryFormDts = fs.readFileSync(
      path.join(DIST_DIR, 'components/query-form/AtengQueryForm.vue.d.ts'),
      'utf-8',
    );
    expect(queryFormDts).toContain('<T extends object = Record<string, unknown>>');
    expect(queryFormDts).toContain(
      'slots: Readonly<AtengQueryFormSlots<T>> & AtengQueryFormSlots<T>;',
    );
    expect(queryFormDts).not.toMatch(/slots:.*any/);

    const descriptionsDts = fs.readFileSync(
      path.join(DIST_DIR, 'components/descriptions/AtengDescriptions.vue.d.ts'),
      'utf-8',
    );
    expect(descriptionsDts).toContain('<T extends object = Record<string, unknown>>');
    expect(descriptionsDts).toContain(
      'slots: Readonly<AtengDescriptionsSlots<T>> & AtengDescriptionsSlots<T>;',
    );

    const queryFormTypesDts = fs.readFileSync(
      path.join(DIST_DIR, 'components/query-form/types.d.ts'),
      'utf-8',
    );
    expect(queryFormTypesDts).toContain(
      'export interface QueryFormPagination<T extends object = Record<string, unknown>>',
    );

    const proLayoutTypesDts = fs.readFileSync(
      path.join(DIST_DIR, 'components/pro-layout/types.d.ts'),
      'utf-8',
    );
    expect(proLayoutTypesDts).toContain('export type ProMenuRawItem = ProMenuItem | object;');
  });

  it('所有 dist/*.d.ts 产物均不包含 .pnpm/ 不可移植内部路径与 & any 污染', () => {
    const allDts = collectDtsFiles(DIST_DIR);
    for (const filePath of allDts) {
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content, `${path.relative(DIST_DIR, filePath)} 泄露 .pnpm 路径`).not.toContain(
        '.pnpm',
      );
      expect(content, `${path.relative(DIST_DIR, filePath)} 出现 & any 退化`).not.toMatch(
        /&\s*any\b/,
      );
    }
  });

  it('下游消费者通过 TypeScript 编译器校验 GlobalComponents 与非索引签名泛型契约零错误', () => {
    const virtualFile = path.join(PKG_ROOT, 'test/types/__virtual_consumer_check__.ts');
    const virtualSource = `
      import type { GlobalComponents } from 'vue';
      import type { PageQuery } from '@atengk/core';
      import type { UsePaginationResult } from '@atengk/vue';
      import {
        AtengDialog,
        AtengTable,
        AtTable,
        AtengQueryForm,
        AtQueryForm,
        AtengDescriptions,
        AtDescriptions,
        AtengProLayout,
        type AtengTableProps,
        type AtengTableInstance,
        type AtengQueryFormProps,
        type AtengQueryFormInstance,
        type AtengDescriptionsProps,
        type AtengDescriptionsInstance,
        type QueryFormPagination,
        type ProMenuRawItem,
      } from '@atengk/element-plus';

      interface UserRow {
        id: string;
        name: string;
        status: number;
      }

      interface UserQuery extends PageQuery {
        keyword: string;
        deptId?: string;
      }

      interface PlainMenu {
        menuId: string;
        menuName: string;
      }

      // 1. GlobalComponents 全局组件映射验证（Ateng* 与 At* 别名全覆盖）
      type CheckGlobalAtengTable = GlobalComponents['AtengTable'];
      type CheckGlobalAtTable = GlobalComponents['AtTable'];
      type CheckGlobalAtQueryForm = GlobalComponents['AtQueryForm'];
      type CheckGlobalAtDescriptions = GlobalComponents['AtDescriptions'];
      type CheckGlobalAtLoading = GlobalComponents['AtLoading'];
      const _verifyTableAlias: CheckGlobalAtengTable = AtengTable;
      const _verifyAtTableAlias: CheckGlobalAtTable = AtTable;
      const _verifyQueryFormAlias: CheckGlobalAtQueryForm = AtQueryForm;
      const _verifyDescAlias: CheckGlobalAtDescriptions = AtDescriptions;

      // 2. 实例契约验证（非泛型 SFC InstanceType 与泛型 SFC Instance 接口）
      type DialogInst = InstanceType<typeof AtengDialog>;
      type TableInst = AtengTableInstance<UserRow>;
      type QueryFormInst = AtengQueryFormInstance<UserQuery>;
      type DescriptionsInst = AtengDescriptionsInstance;
      declare const dialogInst: DialogInst;
      declare const tableInst: TableInst;
      declare const queryFormInst: QueryFormInst;
      tableInst.refresh();
      queryFormInst.search();
      void dialogInst;

      // 3. 无索引签名 interface 传参至 Table / QueryForm / Descriptions / ProLayout
      const _tableProps: AtengTableProps<UserRow, UserQuery> = {
        data: [{ id: '1', name: 'Alice', status: 1 }],
      };
      const _queryFormProps: AtengQueryFormProps<UserQuery> = {
        model: { keyword: 'admin' },
      };
      const _descProps: AtengDescriptionsProps<UserRow> = {
        data: { id: '1', name: 'Alice', status: 1 },
        items: [{ prop: 'name', label: '姓名' }],
      };
      const _rawMenus: ProMenuRawItem[] = [{ menuId: 'm1', menuName: '仪表盘' } satisfies PlainMenu];

      interface PlainSearchForm {
        keyword: string;
        enabled?: boolean;
      }

      // 4. UsePaginationResult<UserRow, UserQuery> 同时直接赋值 Table 与 QueryForm 的 pagination
      //    以及未继承 PageQuery 的普通 interface 直连 QueryFormPagination<T>
      declare const pagination: UsePaginationResult<UserRow, UserQuery>;
      declare const plainPagination: QueryFormPagination<PlainSearchForm>;
      const _tableWithPagination: AtengTableProps<UserRow, UserQuery> = { pagination };
      const _formWithPagination: AtengQueryFormProps<UserQuery> = { pagination };
      const _formStructPagination: QueryFormPagination<UserQuery> = pagination;
      const _plainFormProps: AtengQueryFormProps<PlainSearchForm> = {
        model: { keyword: 'ops' },
        pagination: plainPagination,
      };

      export {
        _verifyTableAlias,
        _verifyAtTableAlias,
        _verifyQueryFormAlias,
        _verifyDescAlias,
        _tableProps,
        _queryFormProps,
        _descProps,
        _rawMenus,
        _tableWithPagination,
        _formWithPagination,
        _formStructPagination,
        _plainFormProps,
        AtengProLayout,
      };
      export type { CheckGlobalAtLoading, DescriptionsInst };
    `;

    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      types: [],
    };

    const host = ts.createCompilerHost(compilerOptions);
    const originalGetSourceFile = host.getSourceFile.bind(host);
    const originalFileExists = host.fileExists.bind(host);

    host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
      if (path.resolve(fileName) === path.resolve(virtualFile)) {
        return ts.createSourceFile(fileName, virtualSource, languageVersion);
      }
      return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
    };
    host.fileExists = fileName => {
      if (path.resolve(fileName) === path.resolve(virtualFile)) {
        return true;
      }
      return originalFileExists(fileName);
    };

    const program = ts.createProgram([virtualFile], compilerOptions, host);
    const diagnostics = ts.getPreEmitDiagnostics(program, program.getSourceFile(virtualFile));
    const formattedErrors = diagnostics.map(diag =>
      ts.flattenDiagnosticMessageText(diag.messageText, '\n'),
    );

    expect(formattedErrors).toEqual([]);
  });
});
