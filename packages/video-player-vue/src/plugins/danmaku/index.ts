/**
 * @atengk/video-player-vue/plugins/danmaku 独立按需分包入口。
 *
 * 遵循极致 Tree-Shaking 铁律：弹幕引擎作为独立 Subpath Entry 导出，
 * 未引用该特性的业务应用打包体积 0 字节打入。
 *
 * @author Ateng
 * @since 2026-10-26
 */

export * from './types';
export * from './DanmakuTrackPool';
export * from './DanmakuEngine';
export * from './createDanmakuPlugin';
