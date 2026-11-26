/**
 * AtengDict* 字典套件（Select / Radio / Tag）组件规范与交互单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import {
  AtengDictSelect,
  AtengDictRadio,
  AtengDictTag,
  DictManager,
  type DictItem,
  type AtengDictSelectExpose,
  type AtengDictRadioExpose,
  type AtengDictTagExpose,
} from '../src/components/dict';

describe('AtengDict* 字典套件组件交互测试', () => {
  let wrapper: VueWrapper | null = null;

  const mockGenderDict: DictItem[] = [
    { label: '男', value: '1', tagType: 'primary' },
    { label: '女', value: '2', tagType: 'danger' },
    { label: '保密', value: '0', tagType: 'info', disabled: true },
  ];

  const mockStatusDict: DictItem[] = [
    { label: '启用', value: 1, tagType: 'success' },
    { label: '停用', value: 0, tagType: 'danger' },
  ];

  beforeEach(() => {
    DictManager.clearCache();
    DictManager.setProvider(async (code: string) => {
      if (code === 'sys_user_gender') {
        return mockGenderDict;
      }
      if (code === 'sys_status') {
        return mockStatusDict;
      }
      return [];
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
    DictManager.clearCache();
    vi.restoreAllMocks();
  });

  describe('AtengDictSelect 下拉选择组件', () => {
    it('基础渲染：根据 dict-code 自动拉取字典项并渲染 ElOption', async () => {
      const selected = ref('');
      wrapper = mount(AtengDictSelect, {
        props: {
          dictCode: 'sys_user_gender',
          modelValue: selected.value,
          'onUpdate:modelValue': (val: unknown) => {
            selected.value = String(val ?? '');
          },
        },
        attachTo: document.body,
      });

      // 等待异步字典拉取与渲染
      await flushPromises();

      const vm = wrapper.vm as unknown as AtengDictSelectExpose;
      expect(vm.dictItems.length).toBe(3);
      expect(vm.dictItems[0].label).toBe('男');
      expect(vm.dictItems[1].label).toBe('女');
      expect(wrapper.classes()).toContain('at-dict-select');
    });

    it('静态 options 优先级高于 dictCode，且不触发网络请求', async () => {
      const staticOptions: DictItem[] = [{ label: '测试项', value: 'test' }];
      wrapper = mount(AtengDictSelect, {
        props: {
          dictCode: 'sys_user_gender',
          options: staticOptions,
        },
        attachTo: document.body,
      });
      await nextTick();

      const vm = wrapper.vm as unknown as AtengDictSelectExpose;
      expect(vm.dictItems).toEqual(staticOptions);
      expect(DictManager.hasCache('sys_user_gender')).toBe(false);
    });

    it('支持局部 loader 覆盖全局 provider', async () => {
      const customData: DictItem[] = [{ label: '自定义A', value: 'A' }];
      const customLoader = vi.fn().mockResolvedValue(customData);

      wrapper = mount(AtengDictSelect, {
        props: {
          dictCode: 'custom_code',
          loader: customLoader,
        },
        attachTo: document.body,
      });
      await flushPromises();

      const vm = wrapper.vm as unknown as AtengDictSelectExpose;
      expect(vm.dictItems).toEqual(customData);
      expect(customLoader).toHaveBeenCalledTimes(1);
    });

    it('实例暴露与 refresh 强制穿透刷新', async () => {
      wrapper = mount(AtengDictSelect, {
        props: {
          dictCode: 'sys_status',
        },
        attachTo: document.body,
      });
      await flushPromises();

      const vm = wrapper.vm as unknown as AtengDictSelectExpose;
      expect(typeof vm.refresh).toBe('function');
      expect(vm.selectRef).toBeDefined();

      const refreshSpy = vi.spyOn(DictManager, 'loadDict');
      await vm.refresh();
      expect(refreshSpy).toHaveBeenCalledWith('sys_status', undefined, true);
    });
  });

  describe('AtengDictRadio 单选框组组件', () => {
    it('普通单选与按钮单选切换', async () => {
      const val = ref('1');

      // 1. 普通 Radio
      wrapper = mount(AtengDictRadio, {
        props: {
          dictCode: 'sys_user_gender',
          modelValue: val.value,
          'onUpdate:modelValue': (v: unknown) => {
            val.value = String(v ?? '');
          },
        },
        attachTo: document.body,
      });
      await flushPromises();

      expect(wrapper.classes()).toContain('at-dict-radio');
      const vm = wrapper.vm as unknown as AtengDictRadioExpose;
      expect(vm.dictItems.length).toBe(3);

      // 2. 按钮 Radio
      await wrapper.setProps({ button: true });
      await nextTick();
      expect(wrapper.findComponent({ name: 'ElRadioButton' }).exists()).toBe(true);
    });

    it('受控单选变更派发 change 与 update:modelValue 事件', async () => {
      const val = ref('1');
      wrapper = mount(AtengDictRadio, {
        props: {
          dictCode: 'sys_user_gender',
          modelValue: val.value,
          'onUpdate:modelValue': (v: unknown) => {
            val.value = String(v ?? '');
          },
        },
        attachTo: document.body,
      });
      await flushPromises();

      const radioGroup = wrapper.findComponent({ name: 'ElRadioGroup' });
      radioGroup.vm.$emit('update:modelValue', '2');
      await flushPromises();

      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['2']);
    });
  });

  describe('AtengDictTag 彩色状态标签展示组件', () => {
    it('单值匹配与 Element Plus Tag 彩色语义映射', async () => {
      wrapper = mount(AtengDictTag, {
        props: {
          dictCode: 'sys_status',
          value: 1,
        },
        attachTo: document.body,
      });
      await flushPromises();

      expect(wrapper.classes()).toContain('at-dict-tag');
      const tag = wrapper.find('.el-tag');
      expect(tag.exists()).toBe(true);
      expect(tag.text()).toBe('启用');
      // 验证 tagType="success" 渲染成功
      expect(tag.classes()).toContain('el-tag--success');
    });

    it('多值字符串映射：逗号分隔多值字符串拆分渲染多个标签', async () => {
      wrapper = mount(AtengDictTag, {
        props: {
          dictCode: 'sys_user_gender',
          value: '1, 2',
        },
        attachTo: document.body,
      });
      await flushPromises();

      const tags = wrapper.findAll('.el-tag');
      expect(tags.length).toBe(2);
      expect(tags[0].text()).toBe('男');
      expect(tags[0].classes()).toContain('el-tag--primary');
      expect(tags[1].text()).toBe('女');
      expect(tags[1].classes()).toContain('el-tag--danger');
    });

    it('多值数组模式映射', async () => {
      wrapper = mount(AtengDictTag, {
        props: {
          dictCode: 'sys_user_gender',
          value: ['1', '2'],
        },
        attachTo: document.body,
      });
      await flushPromises();

      const tags = wrapper.findAll('.el-tag');
      expect(tags.length).toBe(2);
      expect(tags[0].text()).toBe('男');
      expect(tags[1].text()).toBe('女');
    });

    it('空安全保底防御：值为 null、undefined 或空字符串时保底渲染 emptyText (-)', async () => {
      wrapper = mount(AtengDictTag, {
        props: {
          dictCode: 'sys_status',
          value: null,
          emptyText: '--',
        },
        attachTo: document.body,
      });
      await flushPromises();

      expect(wrapper.find('.el-tag').exists()).toBe(false);
      expect(wrapper.find('.at-dict-tag__empty').text()).toBe('--');
    });

    it('未匹配项优雅降级：原样展示原值并不崩溃', async () => {
      wrapper = mount(AtengDictTag, {
        props: {
          dictCode: 'sys_status',
          value: 999,
        },
        attachTo: document.body,
      });
      await flushPromises();

      const tag = wrapper.find('.el-tag');
      expect(tag.exists()).toBe(true);
      expect(tag.text()).toBe('999');

      const vm = wrapper.vm as unknown as AtengDictTagExpose;
      expect(typeof vm.refresh).toBe('function');
      expect(vm.matchingItems.length).toBe(1);
    });

    it('空串/纯空白/非法 tagType 归一化防御：渲染 ElTag 不触发 Element Plus Prop 警告', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const optionsWithEdgeTagTypes = [
        { label: '空串标签', value: 'empty', tagType: '' },
        { label: '空白标签', value: 'blank', tagType: '   ' },
        { label: '未知类型标签', value: 'invalid', tagType: 'custom-unknown' },
      ];

      wrapper = mount(AtengDictTag, {
        props: {
          options: optionsWithEdgeTagTypes,
          value: ['empty', 'blank', 'invalid'],
        },
        attachTo: document.body,
      });
      await flushPromises();

      const tags = wrapper.findAllComponents({ name: 'ElTag' });
      expect(tags).toHaveLength(3);
      for (const tag of tags) {
        // ElTag 收到 undefined 时内部 prop 默认回退为 'primary'
        expect(tag.props('type')).toBe('primary');
      }
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('冷加载默认骨架胶囊占位：异步字典返回前不渲染原码 Tag，返回后准确水合（含多值等量胶囊与 matchingItems 契约）', async () => {
      let resolveDict!: (items: DictItem[]) => void;
      const pendingDict = new Promise<DictItem[]>(resolve => {
        resolveDict = resolve;
      });
      DictManager.setProvider(async () => pendingDict);

      wrapper = mount(AtengDictTag, {
        props: {
          dictCode: 'sys_cold_status',
          value: '1,0',
          size: 'small',
          round: true,
        },
        attachTo: document.body,
      });

      // 首帧同步挂载后、异步返回前：严禁渲染原始编码 Tag，应呈现 2 个尺寸匹配的骨架胶囊
      expect(wrapper.find('.el-tag').exists()).toBe(false);
      expect(wrapper.text()).not.toContain('1');
      expect(wrapper.text()).not.toContain('0');
      const skeletons = wrapper.findAll('.at-dict-tag__skeleton');
      expect(skeletons).toHaveLength(2);
      expect(skeletons[0].classes()).toContain('is-small');
      expect(skeletons[0].classes()).toContain('is-round');

      const vm = wrapper.vm as unknown as AtengDictTagExpose;
      expect(vm.isLoading).toBe(true);
      expect(vm.matchingItems).toEqual([]);

      // 异步字典返回后：水合为真实标签与语义颜色
      resolveDict([
        { label: '启用', value: 1, tagType: 'success' },
        { label: '停用', value: 0, tagType: 'danger' },
      ]);
      await flushPromises();

      expect(wrapper.find('.at-dict-tag__skeleton').exists()).toBe(false);
      const tags = wrapper.findAll('.el-tag');
      expect(tags).toHaveLength(2);
      expect(tags[0].text()).toBe('启用');
      expect(tags[0].classes()).toContain('el-tag--success');
      expect(tags[1].text()).toBe('停用');
      expect(tags[1].classes()).toContain('el-tag--danger');
      expect(vm.isLoading).toBe(false);
      expect(vm.matchingItems).toHaveLength(2);
    });

    it('支持 loadingMode="text"、loadingText、#loading 插槽与 loadingMode="raw" 向后兼容及外部受控 loading', async () => {
      let resolveText!: (items: DictItem[]) => void;
      const textLoader = vi.fn().mockImplementation(
        () =>
          new Promise<DictItem[]>(resolve => {
            resolveText = resolve;
          }),
      );

      // 1. text 模式：多值场景仅渲染单份文本占位
      wrapper = mount(AtengDictTag, {
        props: {
          loader: textLoader,
          value: ['1', '2'],
          loadingMode: 'text',
          loadingText: '字典加载中...',
        },
        attachTo: document.body,
      });

      expect(wrapper.find('.el-tag').exists()).toBe(false);
      expect(wrapper.find('.at-dict-tag__skeleton').exists()).toBe(false);
      expect(wrapper.find('.at-dict-tag__loading-text').text()).toBe('字典加载中...');

      resolveText([{ label: '项1', value: '1', tagType: 'primary' }]);
      await flushPromises();
      expect(wrapper.find('.at-dict-tag__loading-text').exists()).toBe(false);
      expect(wrapper.findAll('.el-tag')).toHaveLength(2);
      wrapper.unmount();

      // 2. #loading 作用域插槽优先于默认骨架/文本
      const slotWrapper = mount(AtengDictTag, {
        props: {
          loader: () => new Promise<DictItem[]>(() => {}),
          value: 'A,B',
        },
        slots: {
          loading: ({ values }: { values: Array<string | number | boolean> }) =>
            h('span', { class: 'custom-loading-slot' }, `待解析:${values.join('|')}`),
        },
        attachTo: document.body,
      });
      expect(slotWrapper.find('.custom-loading-slot').text()).toBe('待解析:A|B');
      expect(slotWrapper.find('.at-dict-tag__skeleton').exists()).toBe(false);
      slotWrapper.unmount();

      // 3. raw 向后兼容模式：加载期间即刻渲染原值 Tag，完成后刷新为标签
      let resolveRaw!: (items: DictItem[]) => void;
      wrapper = mount(AtengDictTag, {
        props: {
          loader: () =>
            new Promise<DictItem[]>(resolve => {
              resolveRaw = resolve;
            }),
          value: '0',
          loadingMode: 'raw',
        },
        attachTo: document.body,
      });
      expect(wrapper.find('.el-tag').text()).toBe('0');
      const rawVm = wrapper.vm as unknown as AtengDictTagExpose;
      expect(rawVm.isLoading).toBe(true);
      expect(rawVm.matchingItems).toHaveLength(1);

      resolveRaw([{ label: '显示', value: '0', tagType: 'success' }]);
      await flushPromises();
      expect(wrapper.find('.el-tag').text()).toBe('显示');
      wrapper.unmount();

      // 4. 外部受控 :loading 覆盖（配合自定义异步 options）
      wrapper = mount(AtengDictTag, {
        props: {
          options: [{ label: '已上线', value: 1, tagType: 'success' }],
          value: 1,
          loading: true,
        },
        attachTo: document.body,
      });
      expect(wrapper.find('.at-dict-tag__skeleton').exists()).toBe(true);
      expect(wrapper.find('.el-tag').exists()).toBe(false);

      await wrapper.setProps({ loading: false });
      expect(wrapper.find('.at-dict-tag__skeleton').exists()).toBe(false);
      expect(wrapper.find('.el-tag').text()).toBe('已上线');
    });

    it('边界防御：空值优先、加载空数组/异常回退原值、autoLoad=false 不卡死、切换竞态丢弃与 refresh 稳态保留', async () => {
      // 1. 空值优先：即使字典处于冷加载中，value 为 null 仍直接渲染 emptyText
      wrapper = mount(AtengDictTag, {
        props: {
          loader: () => new Promise<DictItem[]>(() => {}),
          value: null,
          emptyText: '--',
        },
        attachTo: document.body,
      });
      expect(wrapper.find('.at-dict-tag__skeleton').exists()).toBe(false);
      expect(wrapper.find('.at-dict-tag__empty').text()).toBe('--');
      wrapper.unmount();

      // 2. 加载返回 [] 或异常 reject 兜底后，结束占位并安全回退展示原始编码
      let rejectOrResolve!: (items: DictItem[]) => void;
      wrapper = mount(AtengDictTag, {
        props: {
          loader: () =>
            new Promise<DictItem[]>(resolve => {
              rejectOrResolve = resolve;
            }),
          value: 'LEGACY_9',
        },
        attachTo: document.body,
      });
      expect(wrapper.find('.at-dict-tag__skeleton').exists()).toBe(true);
      rejectOrResolve([]);
      await flushPromises();
      expect(wrapper.find('.at-dict-tag__skeleton').exists()).toBe(false);
      expect(wrapper.find('.el-tag').text()).toBe('LEGACY_9');
      wrapper.unmount();

      let triggerReject!: (reason?: unknown) => void;
      wrapper = mount(AtengDictTag, {
        props: {
          loader: () =>
            new Promise<DictItem[]>((_, reject) => {
              triggerReject = reject;
            }),
          value: 'ERR_404',
        },
        attachTo: document.body,
      });
      expect(wrapper.find('.at-dict-tag__skeleton').exists()).toBe(true);
      triggerReject(new Error('字典接口超时'));
      await flushPromises();
      expect(wrapper.find('.at-dict-tag__skeleton').exists()).toBe(false);
      expect(wrapper.find('.el-tag').text()).toBe('ERR_404');
      wrapper.unmount();

      // 3. autoLoad=false 且无缓存时不卡在骨架，直接回退原值；手动 refresh() 期间展示占位并水合
      let resolveManual!: (items: DictItem[]) => void;
      DictManager.setProvider(
        async () =>
          new Promise<DictItem[]>(resolve => {
            resolveManual = resolve;
          }),
      );
      wrapper = mount(AtengDictTag, {
        props: {
          dictCode: 'manual_dict',
          value: '1',
          autoLoad: false,
        },
        attachTo: document.body,
      });
      expect(wrapper.find('.at-dict-tag__skeleton').exists()).toBe(false);
      expect(wrapper.find('.el-tag').text()).toBe('1');

      const manualVm = wrapper.vm as unknown as AtengDictTagExpose;
      const refreshPromise = manualVm.refresh();
      await nextTick();
      expect(wrapper.find('.at-dict-tag__skeleton').exists()).toBe(true);
      resolveManual([{ label: '手动水合', value: '1', tagType: 'primary' }]);
      await refreshPromise;
      await flushPromises();
      expect(wrapper.find('.el-tag').text()).toBe('手动水合');

      // 4. 已就绪后再次 refresh() 穿透刷新期间：保留既有标签不退回骨架
      let resolveSecondRefresh!: (items: DictItem[]) => void;
      DictManager.setProvider(
        async () =>
          new Promise<DictItem[]>(resolve => {
            resolveSecondRefresh = resolve;
          }),
      );
      const secondRefresh = manualVm.refresh();
      await nextTick();
      expect(manualVm.isLoading).toBe(true);
      expect(wrapper.find('.at-dict-tag__skeleton').exists()).toBe(false);
      expect(wrapper.find('.el-tag').text()).toBe('手动水合');
      resolveSecondRefresh([{ label: '刷新后标签', value: '1', tagType: 'success' }]);
      await secondRefresh;
      await flushPromises();
      expect(wrapper.find('.el-tag').text()).toBe('刷新后标签');
      wrapper.unmount();

      // 5. 动态切换 dictCode：立即清理旧数据并丢弃过期请求响应
      let resolveSlowB!: (items: DictItem[]) => void;
      let resolveFastC!: (items: DictItem[]) => void;
      DictManager.setProvider(async code => {
        if (code === 'dict_a') {
          return [{ label: '标签A', value: 'x' }];
        }
        if (code === 'dict_b') {
          return new Promise<DictItem[]>(resolve => {
            resolveSlowB = resolve;
          });
        }
        return new Promise<DictItem[]>(resolve => {
          resolveFastC = resolve;
        });
      });

      wrapper = mount(AtengDictTag, {
        props: { dictCode: 'dict_a', value: 'x' },
        attachTo: document.body,
      });
      await flushPromises();
      expect(wrapper.find('.el-tag').text()).toBe('标签A');

      // 切换到冷缓存 dict_b：立即清理旧标签并显示骨架
      await wrapper.setProps({ dictCode: 'dict_b' });
      expect(wrapper.find('.el-tag').exists()).toBe(false);
      expect(wrapper.find('.at-dict-tag__skeleton').exists()).toBe(true);

      // 快速切换到 dict_c 并让 dict_c 先返回
      await wrapper.setProps({ dictCode: 'dict_c' });
      resolveFastC([{ label: '标签C', value: 'x' }]);
      await flushPromises();
      expect(wrapper.find('.el-tag').text()).toBe('标签C');

      // 过期的 dict_b 晚到：必须被序号守卫丢弃，绝不覆盖标签C
      resolveSlowB([{ label: '过期B', value: 'x' }]);
      await flushPromises();
      expect(wrapper.find('.el-tag').text()).toBe('标签C');
    });

    it('同步缓存水合：DictManager 已缓存时挂载首帧与微任务期 0 次插入原始数字编码 (MutationObserver 验证)', async () => {
      await DictManager.loadDict('sys_status');
      expect(DictManager.hasCache('sys_status')).toBe(true);

      const container = document.createElement('div');
      document.body.appendChild(container);

      const observedTextSnapshots: string[] = [];
      const observer = new MutationObserver(() => {
        observedTextSnapshots.push(container.textContent ?? '');
      });
      observer.observe(container, { childList: true, subtree: true, characterData: true });

      const Host = defineComponent({
        setup() {
          return () => h(AtengDictTag, { dictCode: 'sys_status', value: 0 });
        },
      });
      wrapper = mount(Host, { attachTo: container });

      // 同步挂载即刻（未 flushPromises）已直接呈现中文标签且无任何骨架或原码闪烁
      expect(wrapper.find('.at-dict-tag__skeleton').exists()).toBe(false);
      expect(wrapper.find('.el-tag').text()).toBe('停用');

      await flushPromises();
      observer.disconnect();

      expect(observedTextSnapshots.some(txt => txt.includes('0'))).toBe(false);
      expect(wrapper.find('.el-tag').text()).toBe('停用');
    });
  });

  describe('全套件同步缓存水合验证 (Select / Radio)', () => {
    it('DictManager 已缓存时 AtengDictSelect 与 AtengDictRadio 在 setup 阶段同步水合，无需等待异步微任务', async () => {
      await DictManager.loadDict('sys_status');
      await DictManager.loadDict('sys_user_gender');

      const selectWrapper = mount(AtengDictSelect, {
        props: { dictCode: 'sys_status', modelValue: 0 },
        attachTo: document.body,
      });
      const selectVm = selectWrapper.vm as unknown as AtengDictSelectExpose;
      expect(selectVm.isLoading).toBe(false);
      expect(selectVm.dictItems.map(item => item.label)).toEqual(['启用', '停用']);
      selectWrapper.unmount();

      const radioWrapper = mount(AtengDictRadio, {
        props: { dictCode: 'sys_user_gender', modelValue: '1' },
        attachTo: document.body,
      });
      const radioVm = radioWrapper.vm as unknown as AtengDictRadioExpose;
      expect(radioVm.isLoading).toBe(false);
      expect(radioWrapper.findAll('.el-radio')).toHaveLength(3);
      expect(radioWrapper.findAll('.el-radio').map(item => item.text())).toEqual([
        '男',
        '女',
        '保密',
      ]);
      radioWrapper.unmount();
    });
  });

  describe('数据字典套件功能增强与字段映射 (Ticket #115 验收测试)', () => {
    it('AtengDictSelect 自定义字段映射：支持 fieldNames={ label: "deptName", value: "deptId" }', async () => {
      const customOptions = [
        { deptName: '研发部', deptId: 101, deptTag: 'success' },
        { deptName: '市场部', deptId: 102, deptTag: 'warning' },
      ];

      wrapper = mount(AtengDictSelect, {
        props: {
          options: customOptions,
          fieldNames: {
            label: 'deptName',
            value: 'deptId',
            tagType: 'deptTag',
          },
          modelValue: 101,
        },
        attachTo: document.body,
      });
      await flushPromises();

      const vm = wrapper.vm as unknown as AtengDictSelectExpose;
      expect(vm.dictItems.length).toBe(2);
      expect(vm.dictItems[0].label).toBe('研发部');
      expect(vm.dictItems[0].value).toBe(101);
      expect(vm.dictItems[0].tagType).toBe('success');
      expect(vm.dictItems[1].label).toBe('市场部');
    });

    it('AtengDictSelect 快捷属性与回退链：支持 labelField/valueField 与部分缺失安全回退', async () => {
      const mixedOptions = [
        { title: '管理层', id: 'm1' },
        { label: '标准项', value: 's1' }, // 缺少 title/id，安全回退 label/value
      ];

      wrapper = mount(AtengDictSelect, {
        props: {
          options: mixedOptions,
          labelField: 'title',
          valueField: 'id',
          modelValue: 'm1',
        },
        attachTo: document.body,
      });
      await flushPromises();

      const vm = wrapper.vm as unknown as AtengDictSelectExpose;
      expect(vm.dictItems.length).toBe(2);
      expect(vm.dictItems[0].label).toBe('管理层');
      expect(vm.dictItems[0].value).toBe('m1');
      expect(vm.dictItems[1].label).toBe('标准项');
      expect(vm.dictItems[1].value).toBe('s1');
    });

    it('valueType="auto" 弱比对防呆：选项为数字 1，绑定模型为字符串 "1" 时精准高亮与回显', async () => {
      wrapper = mount(AtengDictSelect, {
        props: {
          dictCode: 'sys_status', // options: [{ label: '启用', value: 1 }, { label: '停用', value: 0 }]
          modelValue: '1', // 字符串 "1"
          valueType: 'auto',
        },
        attachTo: document.body,
      });
      await flushPromises();

      const vm = wrapper.vm as unknown as AtengDictSelectExpose;
      expect(vm.dictItems.length).toBe(2);
      expect(vm.dictItems[0].value).toBe(1);

      // 验证触发 change 时尊重外部字符串习惯
      const select = wrapper.findComponent({ name: 'ElSelect' });
      select.vm.$emit('update:modelValue', 0);
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['0']);
    });

    it('AtengDictRadio 支持 fieldNames 映射与 border 边框选项', async () => {
      const customOptions = [
        { codeName: '微信支付', codeVal: 'wx' },
        { codeName: '支付宝', codeVal: 'ali' },
      ];

      wrapper = mount(AtengDictRadio, {
        props: {
          options: customOptions,
          fieldNames: { label: 'codeName', value: 'codeVal' },
          border: true,
          modelValue: 'wx',
        },
        attachTo: document.body,
      });
      await flushPromises();

      const radios = wrapper.findAllComponents({ name: 'ElRadio' });
      expect(radios.length).toBe(2);
      expect(radios[0].props('border')).toBe(true);
      expect(wrapper.text()).toContain('微信支付');
      expect(wrapper.text()).toContain('支付宝');
    });

    it('AtengDictTag 支持 fieldNames 映射与 valueType="auto" 弱匹配数字与字符', async () => {
      const statusOptions = [
        { name: '正常运行', id: 10, color: 'success' },
        { name: '系统维护', id: 20, color: 'danger' },
      ];

      wrapper = mount(AtengDictTag, {
        props: {
          options: statusOptions,
          fieldNames: { label: 'name', value: 'id', tagType: 'color' },
          value: '10', // 字符串 "10"，对应选项中的数字 10
          valueType: 'auto',
        },
        attachTo: document.body,
      });
      await flushPromises();

      const tag = wrapper.find('.el-tag');
      expect(tag.exists()).toBe(true);
      expect(tag.text()).toBe('正常运行');
      expect(tag.classes()).toContain('el-tag--success');
    });
  });
});
