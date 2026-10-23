/**
 * AtengDescriptions 结构化数据详情展示组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import {
  AtengDescriptions,
  AtengDescriptionsItem,
  type DescriptionsItemConfig,
  type AtengDescriptionsProps,
} from '../src/components/descriptions';
import { DictManager } from '../src/components/dict/DictManager';

describe('AtengDescriptions 组件规范与渲染测试', () => {
  let wrapper: VueWrapper | null = null;

  beforeEach(() => {
    DictManager.clearCache();
    DictManager.setProvider(async (code: string) => {
      if (code === 'sys_status') {
        return [
          { label: '启用', value: 1, tagType: 'success' },
          { label: '停用', value: 0, tagType: 'danger' },
        ];
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

  it('SFC 插槽优先模式：声明式 <AtengDescriptionsItem> 解析与基础渲染', async () => {
    const TestComponent = defineComponent({
      setup() {
        const info = {
          username: 'Ateng',
          role: '架构师',
        };
        return () =>
          h(
            AtengDescriptions,
            { data: info, title: '用户信息' },
            {
              default: () => [
                h(AtengDescriptionsItem, { prop: 'username', label: '用户名' }),
                h(AtengDescriptionsItem, { prop: 'role', label: '用户角色' }),
              ],
            },
          );
      },
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    await flushPromises();

    expect(wrapper.classes()).toContain('at-descriptions');
    expect(wrapper.text()).toContain('用户信息');
    expect(wrapper.text()).toContain('用户名');
    expect(wrapper.text()).toContain('Ateng');
    expect(wrapper.text()).toContain('用户角色');
    expect(wrapper.text()).toContain('架构师');
  });

  it('Schema 属性模式：支持通过 :items 传入纯配置渲染', async () => {
    const schemaItems: DescriptionsItemConfig[] = [
      { prop: 'dept', label: '所属部门' },
      { prop: 'city', label: '常驻城市' },
    ];
    const data = {
      dept: '基础架构部',
      city: '北京',
    };

    wrapper = mount(AtengDescriptions, {
      props: {
        data,
        items: schemaItems,
      },
      attachTo: document.body,
    });
    await flushPromises();

    expect(wrapper.text()).toContain('所属部门');
    expect(wrapper.text()).toContain('基础架构部');
    expect(wrapper.text()).toContain('常驻城市');
    expect(wrapper.text()).toContain('北京');
  });

  it('严格空安全防御不变量：null、undefined 或空值统一保底渲染为 "-"', async () => {
    const data = {
      nullVal: null,
      undefVal: undefined,
      emptyStr: '',
    };
    const items: DescriptionsItemConfig[] = [
      { prop: 'nullVal', label: '空1' },
      { prop: 'undefVal', label: '空2' },
      { prop: 'emptyStr', label: '空3', emptyText: 'N/A' },
    ];

    wrapper = mount(AtengDescriptions, {
      props: { data, items, emptyText: '-' },
      attachTo: document.body,
    });
    await flushPromises();

    expect(wrapper.text()).toContain('-');
    expect(wrapper.text()).toContain('N/A');
  });

  it('声明式脱敏管道：完整验证 phone、idCard、email、name、bankCard 脱敏计算', async () => {
    const data = {
      phone: '13812345678',
      idCard: '110101199003072345',
      email: 'service@atengk.com',
      name: '诸葛孔明',
      bankCard: '6222021234567890123',
    };
    const items: DescriptionsItemConfig[] = [
      { prop: 'phone', label: '手机号', mask: 'phone' },
      { prop: 'idCard', label: '身份证', mask: 'idCard' },
      { prop: 'email', label: '邮箱', mask: 'email' },
      { prop: 'name', label: '姓名', mask: 'name' },
      { prop: 'bankCard', label: '银行卡', mask: 'bankCard' },
    ];

    wrapper = mount(AtengDescriptions, {
      props: { data, items },
      attachTo: document.body,
    });
    await flushPromises();

    expect(wrapper.text()).toContain('138****5678');
    expect(wrapper.text()).toContain('110101********2345');
    expect(wrapper.text()).toContain('s*****e@atengk.com');
    expect(wrapper.text()).toContain('诸**明');
    expect(wrapper.text()).toContain('6222***********0123');
  });

  it('预置格式化管道：支持 currency 金额千分位与货币符号', async () => {
    const data = {
      balance: 1234567.89,
    };
    const items: DescriptionsItemConfig[] = [
      { prop: 'balance', label: '账户余额', type: 'currency', currencySymbol: '￥' },
    ];

    wrapper = mount(AtengDescriptions, {
      props: { data, items },
      attachTo: document.body,
    });
    await flushPromises();

    expect(wrapper.text()).toContain('￥1,234,567.89');
  });

  it('字典与状态 Tag 内生联动：配置 dictCode 自动渲染为 AtengDictTag 彩色标签', async () => {
    const data = {
      status: 1,
    };
    const items: DescriptionsItemConfig[] = [
      { prop: 'status', label: '账号状态', dictCode: 'sys_status' },
    ];

    wrapper = mount(AtengDescriptions, {
      props: { data, items },
      attachTo: document.body,
    });
    await flushPromises();

    const tag = wrapper.find('.el-tag');
    expect(tag.exists()).toBe(true);
    expect(tag.text()).toBe('启用');
    expect(tag.classes()).toContain('el-tag--success');
  });

  it('自定义 formatter 函数与具名作用域插槽', async () => {
    const data = {
      score: 95,
      customSlotVal: '自定义内容',
    };
    const items: DescriptionsItemConfig[] = [
      {
        prop: 'score',
        label: '成绩',
        formatter: (val: unknown) => `${val} 分 (优秀)`,
      },
      {
        prop: 'customSlotVal',
        label: '插槽展示',
      },
    ];

    const TestRoot = defineComponent({
      setup() {
        return () =>
          h(
            AtengDescriptions,
            { data, items },
            {
              customSlotVal: ({ value }: { value: unknown }) =>
                h('strong', { class: 'custom-slot-text' }, `插槽: ${value}`),
            },
          );
      },
    });

    wrapper = mount(TestRoot, { attachTo: document.body });
    await flushPromises();

    expect(wrapper.text()).toContain('95 分 (优秀)');
    expect(wrapper.find('.custom-slot-text').text()).toBe('插槽: 自定义内容');
  });

  it('Vue 3.5 SFC 原生泛型全链路打通：支持强类型 Data 绑定、自定义格式化与插槽作用域参数推导', async () => {
    interface AccountDetail {
      id: string;
      accountName: string;
      balance: number;
    }

    const account: AccountDetail = {
      id: 'acc_1001',
      accountName: '财务专有账户',
      balance: 8888.88,
    };

    let capturedSlotData: AccountDetail | undefined;

    const items: DescriptionsItemConfig<AccountDetail>[] = [
      {
        prop: 'balance',
        label: '账户余额',
        formatter: (_val, data) => `${data.accountName}: ￥${data.balance.toFixed(2)}`,
      },
      {
        prop: 'accountName',
        label: '账户名称',
      },
    ];

    const GenericRoot = defineComponent({
      setup() {
        return () =>
          h(
            AtengDescriptions as unknown as new () => {
              $props: AtengDescriptionsProps<AccountDetail>;
            },
            {
              data: account,
              items,
            },
            {
              accountName: ({ data }: { data: AccountDetail }) => {
                capturedSlotData = data;
                return h('span', { class: 'account-slot-text' }, data.accountName);
              },
            },
          );
      },
    });

    wrapper = mount(GenericRoot, { attachTo: document.body });
    await flushPromises();

    // 1. 验证自定义 formatter 中正确获取强类型 data
    expect(wrapper.text()).toContain('财务专有账户: ￥8888.88');

    // 2. 验证插槽作用域接收到强类型 data
    expect(capturedSlotData).toBeDefined();
    expect(capturedSlotData?.id).toBe('acc_1001');
    expect(wrapper.find('.account-slot-text').text()).toBe('财务专有账户');
  });

  it('统一空安全保底规范：未指定 emptyText 时默认保底渲染为 "--"，且空值项绝不呈现复制按钮', async () => {
    const data = {
      username: '',
      nullField: null,
      undefField: undefined,
      validField: '有效内容',
    };
    const items: DescriptionsItemConfig[] = [
      { prop: 'username', label: '用户名' },
      { prop: 'nullField', label: '空字段' },
      { prop: 'undefField', label: '未定义' },
      { prop: 'validField', label: '有效项' },
    ];

    wrapper = mount(AtengDescriptions, {
      props: { data, items, copyable: true },
      attachTo: document.body,
    });
    await flushPromises();

    // 默认保底渲染为 '--'
    expect(wrapper.text()).toContain('--');

    // 仅有效项渲染复制按钮，3个空值项绝不呈现复制按钮，杜绝视觉塌陷
    const copyBtns = wrapper.findAll('.at-descriptions__copy-btn');
    expect(copyBtns).toHaveLength(1);
  });

  it('一键复制与内存真明文契约：脱敏字段点击复制真实数据而非掩码脏数据', async () => {
    let copiedText = '';
    const writeTextMock = vi.fn().mockImplementation(async (text: string) => {
      copiedText = text;
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const data = {
      phone: '13812345678',
      idCard: '110101199003072345',
    };
    const items: DescriptionsItemConfig[] = [
      { prop: 'phone', label: '手机号', mask: 'phone', copyable: true },
      { prop: 'idCard', label: '身份证', mask: 'idCard' }, // 容器未开启，单项未显式开启 -> 不可复制
    ];

    wrapper = mount(AtengDescriptions, {
      props: { data, items },
      attachTo: document.body,
    });
    await flushPromises();

    // 页面脱敏展示
    expect(wrapper.text()).toContain('138****5678');
    expect(wrapper.text()).toContain('110101********2345');

    // 仅配置了 copyable: true 的手机号渲染复制按钮
    const copyBtns = wrapper.findAll('.at-descriptions__copy-btn');
    expect(copyBtns).toHaveLength(1);

    // 点击复制
    await copyBtns[0].trigger('click');
    await flushPromises();

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    // 关键断言：复制的是内存真实明文 '13812345678'，绝非脱敏后的 '138****5678'
    expect(copiedText).toBe('13812345678');
    expect(copyBtns[0].classes()).toContain('is-copied');
  });

  it('单项覆盖容器级 copyable：支持 item.copyable: false 排除特定敏感项', async () => {
    const data = {
      secretToken: 'sk-9999999999',
      orderNo: 'ORD202610230001',
    };
    const items: DescriptionsItemConfig[] = [
      { prop: 'secretToken', label: '密钥令牌', copyable: false },
      { prop: 'orderNo', label: '订单号' },
    ];

    wrapper = mount(AtengDescriptions, {
      props: { data, items, copyable: true },
      attachTo: document.body,
    });
    await flushPromises();

    const copyBtns = wrapper.findAll('.at-descriptions__copy-btn');
    // secretToken 显式关闭 copyable，仅 orderNo 渲染复制按钮
    expect(copyBtns).toHaveLength(1);
  });
});
