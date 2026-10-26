/**
 * @atengk/video-player-vue 外挂字幕类型契约。
 *
 * @author Ateng
 * @since 2026-10-26
 */

/**
 * 视频外挂字幕轨道项契约。
 */
export interface VideoSubtitleItem {
  /**
   * 字幕唯一标识符。
   */
  id: string;
  /**
   * 字幕显示名称或语言标签（如 "中英双语"、"简体中文"、"English"）。
   */
  label: string;
  /**
   * BCP 47 语言代码（如 'zh-CN', 'en-US'）。
   */
  lang?: string;
  /**
   * 字幕资源链接（.vtt 或 .srt URL）。
   */
  url?: string;
  /**
   * 内联字幕文本内容（若提供则优先直接解析，无需通过网络请求）。
   */
  content?: string;
  /**
   * 字幕格式类型，默认根据 URL 后缀或内容自动推断。
   */
  type?: 'vtt' | 'srt';
  /**
   * 是否作为默认激活的字幕轨道。
   */
  default?: boolean;
}

/**
 * 单条字幕时间片元元数据 (Cue)。
 */
export interface VideoSubtitleCue {
  /**
   * 片元标识符（可选）。
   */
  id?: string;
  /**
   * 片元开始时间戳（秒）。
   */
  startTime: number;
  /**
   * 片元结束时间戳（秒）。
   */
  endTime: number;
  /**
   * 片元展示文本。
   */
  text: string;
}

/**
 * 外挂字幕样式配置契约。
 */
export interface VideoSubtitleStyle {
  /**
   * 字号大小（像素数值或带单位的字符串，如 20 或 '20px'）。默认 20px。
   */
  fontSize?: number | string;
  /**
   * 文字颜色。默认 '#ffffff'。
   */
  color?: string;
  /**
   * 字幕文字阴影或描边。默认 '0 2px 4px rgba(0, 0, 0, 0.8)'。
   */
  textShadow?: string;
  /**
   * 容器背景底色。默认 'rgba(0, 0, 0, 0.6)'。
   */
  backgroundColor?: string;
  /**
   * 字幕离底部的距离（像素或 CSS 表达）。默认 '40px'。
   */
  bottom?: number | string;
}
