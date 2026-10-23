/**
 * AtengDateRange 快捷时间范围选择器组件规范与交互测试。
 *
 * 核心验证维度：
 * 1. 基础渲染与类名隔离（.at-date-range）；
 * 2. 数组模式双向绑定（v-model="range"）；
 * 3. 双字段解构模式双向绑定（v-model:start 与 v-model:end）；
 * 4. 快捷自然时间跨度计算（今天、昨天、近7天、近30天、本周、上周、本月）；
 * 5. 时刻边界智能补全（00:00:00 与 23:59:59）；
 * 6. 一键清空与保底值（clearValue）；
 * 7. defineExpose 暴露接口与插槽透传。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, afterEach } from 'vitest';
import { defineComponent, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { ElDatePicker } from 'element-plus';
import {
  AtengDateRange,
  getTodayRange,
  getYesterdayRange,
  getLast7DaysRange,
  getLast30DaysRange,
  getThisWeekRange,
  getLastWeekRange,
  getThisMonthRange,
  getThisQuarterRange,
  getThisYearRange,
  getDefaultDateRangeShortcuts,
} from '../src/components/date-range';

describe('AtengDateRange 快捷时间范围选择器交互测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('基础渲染与样式隔离：正确渲染 ElDatePicker 并包含 .at-date-range 根类名', () => {
    wrapper = mount(AtengDateRange);

    expect(wrapper.find('.at-date-range').exists()).toBe(true);
    expect(wrapper.find('.el-date-editor').classes()).toContain('at-date-range');
    const picker = wrapper.findComponent(ElDatePicker);
    expect(picker.exists()).toBe(true);
    expect(picker.props('type')).toBe('daterange');
  });

  it('双向绑定：支持标准数组 v-model="range" 双向同步', async () => {
    const TestComponent = defineComponent({
      components: { AtengDateRange },
      setup() {
        const range = ref<[string, string] | null>(['2026-10-01', '2026-10-07']);
        return { range };
      },
      template: '<AtengDateRange v-model="range" value-format="YYYY-MM-DD" />',
    });

    wrapper = mount(TestComponent);
    const picker = wrapper.findComponent(ElDatePicker);

    // 1. 验证初始值透传
    expect(picker.props('modelValue')).toEqual(['2026-10-01', '2026-10-07']);

    // 2. 模拟组件内部派发值更新
    picker.vm.$emit('update:modelValue', ['2026-10-10', '2026-10-20']);
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.range).toEqual(['2026-10-10', '2026-10-20']);

    // 3. 模拟外部修改
    wrapper.vm.range = ['2026-11-01', '2026-11-15'];
    await wrapper.vm.$nextTick();
    expect(picker.props('modelValue')).toEqual(['2026-11-01', '2026-11-15']);
  });

  it('双向绑定：支持 v-model:start 与 v-model:end 双字段解构同步', async () => {
    const TestComponent = defineComponent({
      components: { AtengDateRange },
      setup() {
        const startTime = ref<string | null>('2026-10-01');
        const endTime = ref<string | null>('2026-10-07');
        return { startTime, endTime };
      },
      template:
        '<AtengDateRange v-model:start="startTime" v-model:end="endTime" value-format="YYYY-MM-DD" />',
    });

    wrapper = mount(TestComponent);
    const picker = wrapper.findComponent(ElDatePicker);

    // 1. 初始解构值汇聚为 picker 的 [start, end]
    expect(picker.props('modelValue')).toEqual(['2026-10-01', '2026-10-07']);

    // 2. 触发选择器变更，双字段自动解构同步
    picker.vm.$emit('update:modelValue', ['2026-10-15', '2026-10-25']);
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.startTime).toBe('2026-10-15');
    expect(wrapper.vm.endTime).toBe('2026-10-25');

    // 3. 外部直接修改解构字段，内部数组动态响应
    wrapper.vm.startTime = '2026-12-01';
    wrapper.vm.endTime = '2026-12-31';
    await wrapper.vm.$nextTick();

    expect(picker.props('modelValue')).toEqual(['2026-12-01', '2026-12-31']);
  });

  it('时刻智能对齐：格式包含时间时，起始自动补齐 00:00:00，结束自动补齐 23:59:59', async () => {
    const TestComponent = defineComponent({
      components: { AtengDateRange },
      setup() {
        const start = ref<string | null>(null);
        const end = ref<string | null>(null);
        return { start, end };
      },
      template: `
        <AtengDateRange
          v-model:start="start"
          v-model:end="end"
          value-format="YYYY-MM-DD HH:mm:ss"
          :auto-time="true"
        />
      `,
    });

    wrapper = mount(TestComponent);
    const picker = wrapper.findComponent(ElDatePicker);

    // 1. 模拟选择日期范围（纯日期输入）
    picker.vm.$emit('update:modelValue', ['2026-10-01', '2026-10-07']);
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.start).toBe('2026-10-01 00:00:00');
    expect(wrapper.vm.end).toBe('2026-10-07 23:59:59');

    // 2. 模拟原生组件将结束时间默认置为 00:00:00 的场景
    picker.vm.$emit('update:modelValue', ['2026-10-05 00:00:00', '2026-10-10 00:00:00']);
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.start).toBe('2026-10-05 00:00:00');
    expect(wrapper.vm.end).toBe('2026-10-10 23:59:59');
  });

  it('Date 原生对象时刻对齐：Date 模式下精确调整起止毫秒边界', async () => {
    const TestComponent = defineComponent({
      components: { AtengDateRange },
      setup() {
        const range = ref<[Date, Date] | null>(null);
        return { range };
      },
      template: '<AtengDateRange v-model="range" :auto-time="true" />',
    });

    wrapper = mount(TestComponent);
    const picker = wrapper.findComponent(ElDatePicker);

    const inputStart = new Date(2026, 9, 1, 12, 30, 45);
    const inputEnd = new Date(2026, 9, 7, 8, 15, 20);

    picker.vm.$emit('update:modelValue', [inputStart, inputEnd]);
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.range).not.toBeNull();
    const [start, end] = wrapper.vm.range!;
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
  });

  it('清空操作：点击清空时触发 clear 事件并将解构字段与数组重置为 null（或 clearValue）', async () => {
    const TestComponent = defineComponent({
      components: { AtengDateRange },
      setup() {
        const startTime = ref<string | null>('2026-10-01');
        const endTime = ref<string | null>('2026-10-07');
        const cleared = ref(false);
        const onClear = () => {
          cleared.value = true;
        };
        return { startTime, endTime, cleared, onClear };
      },
      template: `
        <AtengDateRange
          v-model:start="startTime"
          v-model:end="endTime"
          value-format="YYYY-MM-DD"
          @clear="onClear"
        />
      `,
    });

    wrapper = mount(TestComponent);
    const picker = wrapper.findComponent(ElDatePicker);

    // 触发清空
    picker.vm.$emit('update:modelValue', null);
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.startTime).toBeNull();
    expect(wrapper.vm.endTime).toBeNull();
    expect(wrapper.vm.cleared).toBe(true);
  });

  it('快捷自然时间跨度工具函数算法精度与边界验证', () => {
    // 选定固定基准时间：2026-10-21（周三）14:30:00
    const baseDate = new Date(2026, 9, 21, 14, 30, 0);

    // 1. 今天
    const [todayStart, todayEnd] = getTodayRange(baseDate);
    expect(todayStart.getFullYear()).toBe(2026);
    expect(todayStart.getMonth()).toBe(9);
    expect(todayStart.getDate()).toBe(21);
    expect(todayStart.getHours()).toBe(0);
    expect(todayEnd.getDate()).toBe(21);
    expect(todayEnd.getHours()).toBe(23);
    expect(todayEnd.getMinutes()).toBe(59);
    expect(todayEnd.getSeconds()).toBe(59);

    // 2. 昨天
    const [yestStart, yestEnd] = getYesterdayRange(baseDate);
    expect(yestStart.getDate()).toBe(20);
    expect(yestEnd.getDate()).toBe(20);

    // 3. 近7天（含今天共 7 天：10-15 至 10-21）
    const [last7Start, last7End] = getLast7DaysRange(baseDate);
    expect(last7Start.getDate()).toBe(15);
    expect(last7End.getDate()).toBe(21);

    // 4. 近30天（含今天共 30 天：9-22 至 10-21）
    const [last30Start, last30End] = getLast30DaysRange(baseDate);
    expect(last30End.getDate()).toBe(21);
    const daysDiff = Math.round((last30End.getTime() - last30Start.getTime()) / (1000 * 3600 * 24));
    expect(daysDiff).toBe(30);

    // 5. 本周（周一 10-19 至 周日 10-25）
    const [thisWeekStart, thisWeekEnd] = getThisWeekRange(baseDate);
    expect(thisWeekStart.getDate()).toBe(19);
    expect(thisWeekEnd.getDate()).toBe(25);

    // 6. 上周（上周一 10-12 至 上周日 10-18）
    const [lastWeekStart, lastWeekEnd] = getLastWeekRange(baseDate);
    expect(lastWeekStart.getDate()).toBe(12);
    expect(lastWeekEnd.getDate()).toBe(18);

    // 7. 本月（10-01 至 10-31）
    const [thisMonthStart, thisMonthEnd] = getThisMonthRange(baseDate);
    expect(thisMonthStart.getDate()).toBe(1);
    expect(thisMonthEnd.getDate()).toBe(31);

    // 8. 本季度（第四季度：10-01 至 12-31）
    const [quarterStart, quarterEnd] = getThisQuarterRange(baseDate);
    expect(quarterStart.getMonth()).toBe(9);
    expect(quarterStart.getDate()).toBe(1);
    expect(quarterEnd.getMonth()).toBe(11);
    expect(quarterEnd.getDate()).toBe(31);

    // 9. 本年（2026-01-01 至 2026-12-31）
    const [yearStart, yearEnd] = getThisYearRange(baseDate);
    expect(yearStart.getMonth()).toBe(0);
    expect(yearStart.getDate()).toBe(1);
    expect(yearEnd.getMonth()).toBe(11);
    expect(yearEnd.getDate()).toBe(31);

    // 10. 默认快捷配置项包含全部 9 种预置自然周期
    const defaultShortcuts = getDefaultDateRangeShortcuts();
    expect(defaultShortcuts.length).toBe(9);
    const texts = defaultShortcuts.map(s => s.text);
    expect(texts).toEqual([
      '今天',
      '昨天',
      '近7天',
      '近30天',
      '本周',
      '上周',
      '本月',
      '本季度',
      '本年',
    ]);
  });

  it('表单清空联动：外部将 start 与 end 置为 null 时内部选择框瞬时同步清空', async () => {
    const TestComponent = defineComponent({
      components: { AtengDateRange },
      setup() {
        const startTime = ref<string | null>('2026-10-01');
        const endTime = ref<string | null>('2026-10-07');
        return { startTime, endTime };
      },
      template:
        '<AtengDateRange v-model:start="startTime" v-model:end="endTime" value-format="YYYY-MM-DD" />',
    });

    wrapper = mount(TestComponent);
    const picker = wrapper.findComponent(ElDatePicker);
    expect(picker.props('modelValue')).toEqual(['2026-10-01', '2026-10-07']);

    // 模拟表单 resetFields() 将双字段清空
    wrapper.vm.startTime = null;
    wrapper.vm.endTime = null;
    await wrapper.vm.$nextTick();

    expect(picker.props('modelValue')).toBeNull();
  });

  it('禁用日期策略：支持 disableFuture、disablePast 与自定义 disabledDate', () => {
    // 1. 禁用未来日期测试
    wrapper = mount(AtengDateRange, {
      props: {
        disableFuture: true,
      },
    });
    const picker = wrapper.findComponent(ElDatePicker);
    const disabledDateFn = picker.props('disabledDate') as (date: Date) => boolean;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    expect(disabledDateFn(tomorrow)).toBe(true);
    expect(disabledDateFn(yesterday)).toBe(false);
    wrapper.unmount();

    // 2. 禁用过去日期测试
    wrapper = mount(AtengDateRange, {
      props: {
        disablePast: true,
      },
    });
    const picker2 = wrapper.findComponent(ElDatePicker);
    const disabledDateFn2 = picker2.props('disabledDate') as (date: Date) => boolean;

    expect(disabledDateFn2(yesterday)).toBe(true);
    expect(disabledDateFn2(tomorrow)).toBe(false);
  });

  it('快捷预置禁用与自定义配置：支持 :shortcuts="false" 关闭或传入自定义项', () => {
    // 1. 关闭快捷预置
    wrapper = mount(AtengDateRange, {
      props: {
        shortcuts: false,
      },
    });
    let picker = wrapper.findComponent(ElDatePicker);
    expect(picker.props('shortcuts')).toEqual([]);
    wrapper.unmount();

    // 2. 自定义快捷预置
    const customShortcuts = [
      { text: '测试自定义', value: () => [new Date(), new Date()] as [Date, Date] },
    ];
    wrapper = mount(AtengDateRange, {
      props: {
        shortcuts: customShortcuts,
      },
    });
    picker = wrapper.findComponent(ElDatePicker);
    expect(picker.props('shortcuts')).toEqual(customShortcuts);
  });

  it('原生透传与 Expose：正确对外提供 datePickerRef 与 focus/handleOpen/handleClose', () => {
    wrapper = mount(AtengDateRange);
    const exposed = wrapper.vm as unknown as {
      datePickerRef: unknown;
      focus: () => void;
      handleOpen: () => void;
      handleClose: () => void;
    };

    expect(exposed.datePickerRef).toBeDefined();
    expect(typeof exposed.focus).toBe('function');
    expect(typeof exposed.handleOpen).toBe('function');
    expect(typeof exposed.handleClose).toBe('function');

    // 调用防崩保护
    expect(() => exposed.focus()).not.toThrow();
    expect(() => exposed.handleOpen()).not.toThrow();
    expect(() => exposed.handleClose()).not.toThrow();
  });
});
