/**
 * 4 大企业高频预设单据与金额大写工具单元测试。
 *
 * 验证 AtengInvoiceSheet、AtengReceiptSheet、AtengWaybillSheet、AtengLabelSheet
 * 与 digitUppercase 的渲染正确性、DOM 结构与样式契约。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { digitUppercase } from '../src/utils/currency';
import AtengInvoiceSheet from '../src/components/presets/AtengInvoiceSheet.vue';
import AtengReceiptSheet from '../src/components/presets/AtengReceiptSheet.vue';
import AtengWaybillSheet from '../src/components/presets/AtengWaybillSheet.vue';
import AtengLabelSheet from '../src/components/presets/AtengLabelSheet.vue';

describe('digitUppercase (人民币大写金额转换)', () => {
  it('处理 0 元与非法非数值', () => {
    expect(digitUppercase(0)).toBe('零元整');
    expect(digitUppercase(Number.NaN)).toBe('零元整');
  });

  it('转换纯整数字符串与数值', () => {
    expect(digitUppercase(1)).toBe('壹元整');
    expect(digitUppercase(10)).toBe('壹拾元整');
    expect(digitUppercase(100)).toBe('壹佰元整');
    expect(digitUppercase(1000)).toBe('壹仟元整');
    expect(digitUppercase(10000)).toBe('壹万元整');
    expect(digitUppercase(100000000)).toBe('壹亿元整');
    expect(digitUppercase(10005)).toBe('壹万零伍元整');
  });

  it('转换包含角分的浮点数', () => {
    expect(digitUppercase(123.45)).toBe('壹佰贰拾叁元肆角伍分');
    expect(digitUppercase(10.5)).toBe('壹拾元伍角');
    expect(digitUppercase(10.05)).toBe('壹拾元零伍分');
    expect(digitUppercase('88.88')).toBe('捌拾捌元捌角捌分');
  });

  it('正确处理负数场景', () => {
    expect(digitUppercase(-50)).toBe('负伍拾元整');
    expect(digitUppercase(-10.5)).toBe('负壹拾元伍角');
  });
});

describe('AtengInvoiceSheet (销售结算发票)', () => {
  let wrapper: VueWrapper<unknown> | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  it('挂载渲染发票头、购买方/销售方信息与明细表格', () => {
    wrapper = mount(AtengInvoiceSheet, {
      props: {
        title: '企业商品物资销售发货与结算单',
        orderNo: 'IV-20261110-001',
        date: '2026-11-10',
        customer: '北京某某科技有限公司',
        seller: '上海某某信息科技有限公司',
        warehouse: '华东 1 号总仓',
        items: [
          {
            name: '工业高性能伺服驱动器 24V',
            spec: 'DC12-48V 10A',
            unit: '台',
            qty: 2,
            price: 500,
            amount: 1000,
          },
        ],
        operator: '张制单',
        auditor: '李复核',
        receiver: '王收货',
      },
    });

    const text = wrapper.text();
    expect(text).toContain('企业商品物资销售发货与结算单');
    expect(text).toContain('IV-20261110-001');
    expect(text).toContain('北京某某科技有限公司');
    expect(text).toContain('上海某某信息科技有限公司');
    expect(text).toContain('工业高性能伺服驱动器 24V');
    expect(text).toContain('张制单');
    expect(text).toContain('李复核');
    expect(text).toContain('王收货');
    expect(text).toContain('壹仟元整');
    expect(wrapper.classes()).toContain('at-invoice-sheet');
  });

  it('支持印章插槽覆盖', () => {
    wrapper = mount(AtengInvoiceSheet, {
      props: {
        title: '测试发票',
      },
      slots: {
        seal: '<div class="custom-invoice-seal">测试印章插槽</div>',
      },
    });

    expect(wrapper.find('.custom-invoice-seal').exists()).toBe(true);
    expect(wrapper.text()).toContain('测试印章插槽');
  });
});

describe('AtengReceiptSheet (热敏连续小票)', () => {
  let wrapper: VueWrapper<unknown> | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  it('挂载渲染小票店名、订单号、商品明细与合计金额', () => {
    wrapper = mount(AtengReceiptSheet, {
      props: {
        storeName: '好客便利店（旗舰店）',
        orderNo: 'POS-20261110-001',
        time: '2026-11-10 12:30:00',
        cashier: '007号工号',
        widthPreset: 'receipt-80',
        items: [
          { name: '美式咖啡（大杯）', qty: 2, price: 15 },
          { name: '法式牛角包', qty: 1, price: 12 },
        ],
        discount: 5,
        paymentMethod: '微信刷卡支付',
        footerMessage: '凭此小票开具电子发票，当日有效',
      },
    });

    const text = wrapper.text();
    expect(text).toContain('好客便利店（旗舰店）');
    expect(text).toContain('POS-20261110-001');
    expect(text).toContain('美式咖啡（大杯）');
    expect(text).toContain('法式牛角包');
    expect(text).toContain('007号工号');
    expect(text).toContain('凭此小票开具电子发票');
    expect(text).toContain('¥37.00'); // (30 + 12) - 5 = 37

    const sheet = wrapper.find('.at-receipt-sheet');
    expect(sheet.exists()).toBe(true);
    expect(sheet.classes()).toContain('at-receipt-sheet--80mm');
  });

  it('支持 58mm 紧凑宽度模式', () => {
    wrapper = mount(AtengReceiptSheet, {
      props: {
        widthPreset: 'receipt-58',
      },
    });
    expect(wrapper.classes()).toContain('at-receipt-sheet--58mm');
  });
});

describe('AtengWaybillSheet (物流快递面单)', () => {
  let wrapper: VueWrapper<unknown> | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  it('挂载渲染快递承运商、大字三段码分拣标识与寄收件人网格', () => {
    wrapper = mount(AtengWaybillSheet, {
      props: {
        expressName: '顺风速运',
        packageHub: '华南深圳航空枢纽',
        routingCode: '010-02A-88',
        trackingNo: 'SF1234567890CN',
        sender: {
          name: '张发发',
          phone: '138****0001',
          region: '深圳市南山区',
          address: '科技园南区深南大道 999 号',
        },
        receiver: {
          name: '李收收',
          phone: '139****0002',
          region: '北京市朝阳区',
          address: '望京科技商务区阿里中心 8 楼',
        },
        cargoName: '精密光学电子仪器',
        itemCount: 1,
        weight: '2.5kg',
      },
    });

    const text = wrapper.text();
    expect(text).toContain('顺风速运');
    expect(text).toContain('华南深圳航空枢纽');
    expect(text).toContain('010-02A-88');
    expect(text).toContain('SF1234567890CN');
    expect(text).toContain('张发发');
    expect(text).toContain('李收收');
    expect(text).toContain('精密光学电子仪器');

    expect(wrapper.classes()).toContain('at-waybill-sheet');
  });
});

describe('AtengLabelSheet (仓储物料标签)', () => {
  let wrapper: VueWrapper<unknown> | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  it('挂载渲染物料货架标签 SKU、库位、批次与尺寸预设', () => {
    wrapper = mount(AtengLabelSheet, {
      props: {
        materialName: '高性能无刷伺服电机',
        materialCode: 'MTR-BLDC-48V-350W',
        spec: '1024 P/R 差分输出 24V',
        batchNo: 'LOT-20261110-B1',
        location: '库位: A-03-02-14',
        unit: '台',
        date: '2026-11-10',
        sizePreset: 'large',
      },
    });

    const text = wrapper.text();
    expect(text).toContain('高性能无刷伺服电机');
    expect(text).toContain('MTR-BLDC-48V-350W');
    expect(text).toContain('LOT-20261110-B1');
    expect(text).toContain('库位: A-03-02-14');

    const sheet = wrapper.find('.at-label-sheet');
    expect(sheet.exists()).toBe(true);
    expect(sheet.attributes('style')).toContain('width: 80mm');
    expect(sheet.attributes('style')).toContain('height: 50mm');
  });
});
