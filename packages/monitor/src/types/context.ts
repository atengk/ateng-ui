/**
 * 全链路可观测性上下文契约定义。
 *
 * @author Ateng
 * @since 2026-10-31
 */

/**
 * 用户鉴权元数据实体。
 */
export interface UserContext {
  /** 用户唯一主键标识 */
  id?: string;
  /** 用户姓名或展示昵称 */
  name?: string;
  /** 用户角色代码 */
  role?: string;
  /** 用户邮箱 */
  email?: string;
  /** 拓展属性 */
  [key: string]: unknown;
}

/**
 * 宿主硬件、视口与网络设备上下文。
 */
export interface DeviceContext {
  /** 浏览器 User-Agent */
  userAgent: string;
  /** 系统主语言 */
  language: string;
  /** 视口像素尺寸 */
  viewport: {
    width: number;
    height: number;
  };
  /** 物理屏幕分辨率 */
  screen: {
    width: number;
    height: number;
  };
  /** 设备像素比 (DPR) */
  pixelRatio: number;
  /** 网络在线状态 */
  online: boolean;
  /** 网络连接类型 (如 4g, 5g, wifi, 2g) */
  connectionType?: string;
}

/**
 * 全局动态上下文数据结构。
 */
export interface MonitorContext {
  /** 静态应用版本标识 (如 Git Commit Hash 或 Semver) */
  appVersion: string;
  /** 部署运行环境 (如 'prod' | 'uat' | 'test' | 'dev') */
  environment: string;
  /** 会话唯一标识符 (单次标签页会话有效) */
  sessionId: string;
  /** 多租户企业隔离标识 */
  tenantId?: string;
  /** 当前已登录用户信息 */
  user?: UserContext;
  /** 静态或动态自定义标签键值对 */
  tags: Record<string, string>;
  /** 附加额外上下文数据 */
  extra: Record<string, unknown>;
}

/**
 * 事件发射时的完整上下文快照。
 */
export interface MonitorContextSnapshot extends MonitorContext {
  /** 设备环境数据 */
  device: DeviceContext;
  /** 事件触发时的页面绝对 URL */
  url: string;
  /** 事件触发时的文档标题 */
  title: string;
}

/**
 * 上下文管理器公共门面接口。
 */
export interface ContextStoreInstance {
  /**
   * 获取当前上下文快照数据（已克隆防污染）。
   */
  getContext: () => MonitorContext;

  /**
   * 获取当前完整上下文快照（包含当前 URL、标题及实时设备状态）。
   */
  getSnapshot: () => MonitorContextSnapshot;

  /**
   * 动态设置或更新当前登录用户信息。
   *
   * @param user 用户上下文实体，传入 undefined 表示注销清空
   */
  setUser: (user?: UserContext) => void;

  /**
   * 动态设置当前租户标识符。
   *
   * @param tenantId 租户 ID，传入 undefined 表示清空
   */
  setTenant: (tenantId?: string) => void;

  /**
   * 设置自定义单一标签。
   *
   * @param key 标签键名
   * @param value 标签文本值
   */
  setTag: (key: string, value: string) => void;

  /**
   * 批量合并设置自定义标签。
   *
   * @param tags 标签字典
   */
  setTags: (tags: Record<string, string>) => void;

  /**
   * 设置附加诊断数据。
   *
   * @param key 字段名
   * @param value 附加数据
   */
  setExtra: (key: string, value: unknown) => void;

  /**
   * 重置清空所有动态上下文数据（多在单测或登出时调用）。
   */
  reset: () => void;
}
