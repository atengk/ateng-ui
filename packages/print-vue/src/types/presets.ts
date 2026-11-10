/**
 * 4 大企业高频单据预设强类型契约定义。
 *
 * 涵盖销售结算发票、热敏连续小票、三段码物流面单与仓储货架物料标签。
 *
 * @author Ateng
 * @since 2026-11-10
 */

/**
 * 销售结算单据物料明细行契约。
 */
export interface InvoiceItem {
  /** 物料/商品品名 */
  name: string;
  /** 规格型号 */
  spec?: string;
  /** 计量单位 */
  unit: string;
  /** 销售出库数量 */
  qty: number;
  /** 含税单价（元） */
  price: number;
  /** 备选税率（如 0.13 代表 13%） */
  taxRate?: number;
  /** 单行小计金额（可选，未传时自动按 price * qty 计算） */
  amount?: number;
  /** 单行备注说明 */
  remark?: string;
}

/**
 * AtengInvoiceSheet 组件 Props 契约。
 */
export interface AtengInvoiceSheetProps {
  /** 单据主标题（默认 '企业物资销售发货与结算单'） */
  title?: string;
  /** 单据业务流水编号 */
  orderNo?: string;
  /** 业务开票日期（默认当前日期） */
  date?: string;
  /** 购货客户单位名称 */
  customer?: string;
  /** 销货经办单位名称 */
  seller?: string;
  /** 发货仓库 */
  warehouse?: string;
  /** 物料明细行列表 */
  items?: InvoiceItem[];
  /** 整单经办备注 */
  remarks?: string;
  /** 业务开票/制单人 */
  operator?: string;
  /** 仓库核对/保管员 */
  auditor?: string;
  /** 承运客户/提货签收人 */
  receiver?: string;
  /** 是否自动加盖电子印章（默认 true） */
  showSeal?: boolean;
  /** 印章公司全称 */
  sealCompany?: string;
  /** 印章职能名称 */
  sealTitle?: string;
  /** 印章防伪统一编码 */
  sealCode?: string;
}

/**
 * 热敏小票商品明细行契约。
 */
export interface ReceiptItem {
  /** 商品名称 */
  name: string;
  /** 购买数量 */
  qty: number;
  /** 单价（元） */
  price: number;
  /** 小计金额（可选，未传时按 price * qty） */
  amount?: number;
}

/**
 * AtengReceiptSheet 组件 Props 契约。
 */
export interface AtengReceiptSheetProps {
  /** 卷纸规格预设（'receipt-58' 58mm 紧凑型，'receipt-80' 80mm 标准型，默认 'receipt-80'） */
  widthPreset?: 'receipt-58' | 'receipt-80';
  /** 门店/商户名称 */
  storeName?: string;
  /** 销售小票单据编号 */
  orderNo?: string;
  /** 收银员编号或姓名 */
  cashier?: string;
  /** 交易完成时间 */
  time?: string;
  /** 商品购买明细列表 */
  items?: ReceiptItem[];
  /** 订单整单应收总金额（可选，未传自动计算合计） */
  totalAmount?: number;
  /** 优惠/折扣减免金额 */
  discount?: number;
  /** 支付途径（如 '微信支付'、'支付宝'、'现金'） */
  paymentMethod?: string;
  /** 底部条码/取餐叫号编号 */
  barcode?: string;
  /** 底部感谢语或退换货售后须知 */
  footerMessage?: string;
}

/**
 * 快递面单联系人实体。
 */
export interface WaybillContact {
  /** 姓名 */
  name: string;
  /** 联系电话 */
  phone: string;
  /** 所在省市区 */
  region?: string;
  /** 详细地址 */
  address: string;
  /** 单位/公司名称 */
  company?: string;
}

/**
 * AtengWaybillSheet 组件 Props 契约。
 */
export interface AtengWaybillSheetProps {
  /** 快递物流承运商名称（如 '顺丰速运'、'菜鸟特快'、'京东快递'） */
  expressName?: string;
  /** 快递运单号 */
  trackingNo?: string;
  /** 快递大字三段码路由分拣标识（如 '021-058-A09'） */
  routingCode?: string;
  /** 集包地/集货中心标识（如 '华东杭州枢纽包'） */
  packageHub?: string;
  /** 寄件人信息 */
  sender?: WaybillContact;
  /** 收件人信息 */
  receiver?: WaybillContact;
  /** 托寄物物品名称 */
  cargoName?: string;
  /** 计费重量描述（如 '2.5 kg'） */
  weight?: number | string;
  /** 件数（默认 1） */
  itemCount?: number;
  /** 运费结算方式（'寄付月结'、'现结'、'到付'） */
  freightType?: string;
  /** 代收货款 COD 金额（元，未设置时不显示） */
  codAmount?: number;
}

/**
 * AtengLabelSheet 组件 Props 契约。
 */
export interface AtengLabelSheetProps {
  /** 物料/资产物品名称 */
  materialName?: string;
  /** 物料编号 / SKU 编码 */
  materialCode?: string;
  /** 规格型号说明 */
  spec?: string;
  /** 生产批次编号 */
  batchNo?: string;
  /** 仓储库位编码（如 'A-02-18'） */
  location?: string;
  /** 计量单位 */
  unit?: string;
  /** 入库或质检日期 */
  date?: string;
  /** 条码/二维码所包含的内容字符串 */
  qrValue?: string;
  /** 标签尺寸规格（'small' 40mm*30mm，'medium' 60mm*40mm，'large' 80mm*50mm，默认 'medium'） */
  sizePreset?: 'small' | 'medium' | 'large';
}
