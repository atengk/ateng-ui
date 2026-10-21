/**
 * 内建通用标准图标库元数据与原生 SVG 路径字典（零外部依赖）。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { IconItem } from './types';

export const DEFAULT_ICONS: IconItem[] = [
  // 常用操作类
  {
    name: 'Search',
    label: '搜索',
    pinyin: 'sousuo,ss',
    svgPath:
      '<path d="M790.6 745.4L648.8 603.6c43.6-54.2 69.8-123.4 69.8-198.6 0-174.5-141.5-316-316-316S86.6 230.5 86.6 405s141.5 316 316 316c75.2 0 144.4-26.2 198.6-69.8l141.8 141.8c6.2 6.2 14.4 9.4 22.6 9.4s16.4-3.1 22.6-9.4c12.5-12.5 12.5-32.8 0-45.2zM150.6 405c0-139.2 112.8-252 252-252s252 112.8 252 252-112.8 252-252 252-252-112.8-252-252z" fill="currentColor"/>',
  },
  {
    name: 'Edit',
    label: '编辑',
    pinyin: 'bianji,bj',
    svgPath:
      '<path d="M880 112H680c-17.7 0-32 14.3-32 32s14.3 32 32 32h200v704H144V176h200c17.7 0 32-14.3 32-32s-14.3-32-32-32H144c-35.3 0-64 28.7-64 64v704c0 35.3 28.7 64 64 64h736c35.3 0 64-28.7 64-64V176c0-35.3-28.7-64-64-64z" fill="currentColor"/><path d="M304 600l-40 120 120-40 400-400-80-80z" fill="currentColor"/>',
  },
  {
    name: 'Delete',
    label: '删除',
    pinyin: 'shanchu,sc',
    svgPath:
      '<path d="M216 288h592v560c0 44.2-35.8 80-80 80H296c-44.2 0-80-35.8-80-80V288zm160-192h272v64H376zM128 160h768v64H128z" fill="currentColor"/>',
  },
  {
    name: 'Plus',
    label: '新增/加号',
    pinyin: 'xinzeng,jiahao,xz',
    svgPath:
      '<path d="M480 160h64v704h-64z" fill="currentColor"/><path d="M160 480h704v64H160z" fill="currentColor"/>',
  },
  {
    name: 'Check',
    label: '确认/勾选',
    pinyin: 'queren,gouxuan,qr',
    svgPath:
      '<path d="M384 736L160 512l45.2-45.2 178.8 178.8 450.8-450.8 45.2 45.2z" fill="currentColor"/>',
  },
  {
    name: 'Close',
    label: '关闭/取消',
    pinyin: 'guanbi,quxiao,gb',
    svgPath:
      '<path d="M240 240l544 544-45.2 45.2L194.8 285.2z" fill="currentColor"/><path d="M784 240L240 784l-45.2-45.2L738.8 194.8z" fill="currentColor"/>',
  },
  {
    name: 'Refresh',
    label: '刷新',
    pinyin: 'shuaxin,sx',
    svgPath:
      '<path d="M784 384h-160l60-60C628 268 544 240 452 256c-132 23-238 129-261 261-33 189 110 351 297 351 133 0 244-88 279-209 5-17 23-27 40-22 17 5 27 23 22 40-42 145-175 251-341 251-224 0-396-194-356-421 28-158 156-286 314-314 110-20 211 14 289 83l67-67v175z" fill="currentColor"/>',
  },
  {
    name: 'Setting',
    label: '设置',
    pinyin: 'shezhi,sz',
    svgPath:
      '<path d="M512 320c-106 0-192 86-192 192s86 192 192 192 192-86 192-192-86-192-192-192zm0 320c-70.7 0-128-57.3-128-128s57.3-128 128-128 128 57.3 128 128-57.3 128-128 128zM896 550v-76l-98-32c-9-33-23-64-42-91l54-90-54-54-90 54c-27-19-58-33-91-42l-32-98h-76l-32 98c-33 9-64 23-91 42l-90-54-54 54 54 90c-19 27-33 58-42 91l-98 32v76l98 32c9 33 23 64 42 91l-54 90 54 54 90-54c27 19 58 33 91 42l32 98h76l32-98c33-9 64-23 91-42l90 54 54-54-54-90c19-27 33-58 42-91l98-32z" fill="currentColor"/>',
  },
  {
    name: 'Filter',
    label: '过滤/筛选',
    pinyin: 'guolv,shaixuan,gl',
    svgPath: '<path d="M128 192h768v64L576 640v256l-128-64V640L128 256z" fill="currentColor"/>',
  },
  {
    name: 'Download',
    label: '下载',
    pinyin: 'xiazai,xz',
    svgPath:
      '<path d="M512 672L288 448h160V128h128v320h160zM128 768h768v128H128z" fill="currentColor"/>',
  },
  {
    name: 'Upload',
    label: '上传',
    pinyin: 'shangchuan,sc',
    svgPath:
      '<path d="M512 128l224 224H576v320H448V352H288zM128 768h768v128H128z" fill="currentColor"/>',
  },
  {
    name: 'Lock',
    label: '锁定',
    pinyin: 'suoding,sd',
    svgPath:
      '<path d="M512 128c-106 0-192 86-192 192v96H224v480h576V416H704v-96c0-106-86-192-192-192zm-128 192c0-70.7 57.3-128 128-128s128 57.3 128 128v96H384v-96zm128 256c35.3 0 64 28.7 64 64 0 23.6-12.8 44.2-32 55.4V736h-64v-40.6c-19.2-11.2-32-31.8-32-55.4 0-35.3 28.7-64 64-64z" fill="currentColor"/>',
  },
  {
    name: 'Unlock',
    label: '解锁',
    pinyin: 'jiesuo,js',
    svgPath:
      '<path d="M384 320c0-70.7 57.3-128 128-128s128 57.3 128 128h64c0-106-86-192-192-192s-192 86-192 192v96H224v480h576V416H384v-96zm128 256c35.3 0 64 28.7 64 64 0 23.6-12.8 44.2-32 55.4V736h-64v-40.6c-19.2-11.2-32-31.8-32-55.4 0-35.3 28.7-64 64-64z" fill="currentColor"/>',
  },
  {
    name: 'Key',
    label: '钥匙/凭据',
    pinyin: 'yaoshi,pingju,ys',
    svgPath:
      '<path d="M672 160c-123.7 0-224 100.3-224 224 0 35.8 8.5 69.6 23.5 99.6L128 827.1V896h128v-64h64v-64h64v-64l64.4-64.4c29.9 15 63.8 23.4 99.6 23.4 123.7 0 224-100.3 224-224S795.7 160 672 160zm0 128c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64z" fill="currentColor"/>',
  },
  {
    name: 'View',
    label: '查看/显示',
    pinyin: 'chakan,xianshi,ck',
    svgPath:
      '<path d="M512 256C309.3 256 137.9 383.1 64 512c73.9 128.9 245.3 256 448 256s374.1-127.1 448-256c-73.9-128.9-245.3-256-448-256zm0 416c-88.4 0-160-71.6-160-160s71.6-160 160-160 160 71.6 160 160-71.6 160-160 160zm0-256c-53 0-96 43-96 96s43 96 96 96 96-43 96-96-43-96-96-96z" fill="currentColor"/>',
  },
  {
    name: 'CopyDocument',
    label: '复制文档',
    pinyin: 'fuzhi,wendang,fz',
    svgPath:
      '<path d="M768 256H320c-35.3 0-64 28.7-64 64v512c0 35.3 28.7 64 64 64h448c35.3 0 64-28.7 64-64V320c0-35.3-28.7-64-64-64zm0 576H320V320h448v512zM224 160h480v64H224v512h-64V224c0-35.3 28.7-64 64-64z" fill="currentColor"/>',
  },

  // 导航与业务类
  {
    name: 'HomeFilled',
    label: '首页',
    pinyin: 'shouye,sy',
    svgPath: '<path d="M512 128L128 448v448h256V640h256v256h256V448z" fill="currentColor"/>',
  },
  {
    name: 'Menu',
    label: '菜单',
    pinyin: 'caidan,cd',
    svgPath:
      '<path d="M128 256h768v64H128zm0 224h768v64H128zm0 224h768v64H128z" fill="currentColor"/>',
  },
  {
    name: 'User',
    label: '用户/个人',
    pinyin: 'yonghu,geren,yh',
    svgPath:
      '<path d="M512 448c97.2 0 176-78.8 176-176S609.2 96 512 96s-176 78.8-176 176 78.8 176 176 176zm0 96c-132.5 0-384 66.5-384 192v64h768v-64c0-125.5-251.5-192-384-192z" fill="currentColor"/>',
  },
  {
    name: 'Tools',
    label: '工具',
    pinyin: 'gongju,gj',
    svgPath:
      '<path d="M784 576l-160-160 45.2-45.2c25-25 25-65.5 0-90.5L624 235c-25-25-65.5-25-90.5 0l-45.2 45.2L328 120 120 328l160 160-200 200v192h192l200-200 160 160 208-208-56-56z" fill="currentColor"/>',
  },
  {
    name: 'Document',
    label: '文件/文档',
    pinyin: 'wenjian,wendang,wj',
    svgPath:
      '<path d="M288 128h384l192 192v576H288zm64 64v704h448V352H640V192z" fill="currentColor"/>',
  },
  {
    name: 'Folder',
    label: '文件夹',
    pinyin: 'wenjianjia,wjj',
    svgPath: '<path d="M128 192h256l64 64h448v640H128zm64 128v448h640V320z" fill="currentColor"/>',
  },
  {
    name: 'Monitor',
    label: '大屏/监控/桌面',
    pinyin: 'daping,jiankong,zhuomian,jk',
    svgPath:
      '<path d="M128 160h768v512H128zm64 64v384h640V224zM384 736h256v64H384zm-64 128h384v64H320z" fill="currentColor"/>',
  },
  {
    name: 'DataLine',
    label: '数据折线/统计',
    pinyin: 'shuju,zhexian,tongji,sj',
    svgPath:
      '<path d="M896 832H128V128h64v640h704zM256 640l160-256 160 160 224-320 45.2 32-269.2 384-160-160L256 704z" fill="currentColor"/>',
  },
  {
    name: 'DataBoard',
    label: '数据看板',
    pinyin: 'shujukanban,kanban,kb',
    svgPath:
      '<path d="M128 160h768v704H128zm64 64v576h640V224zM256 320h224v160H256zm288 0h224v288H544zm-288 224h224v224H256zm288 128h224v96H544z" fill="currentColor"/>',
  },
  {
    name: 'Bell',
    label: '通知/铃铛',
    pinyin: 'tongzhi,lingdang,tz',
    svgPath:
      '<path d="M512 896c44.2 0 80-35.8 80-80H432c0 44.2 35.8 80 80 80zm288-256V416c0-141.4-96-258.9-224-282.7V96h-128v37.3C320 157.1 224 274.6 224 416v224l-64 64v64h704v-64z" fill="currentColor"/>',
  },
  {
    name: 'Message',
    label: '消息/信件',
    pinyin: 'xiaoxi,xinjian,xx',
    svgPath:
      '<path d="M128 224h768v576H128zm64 64v32l320 200 320-200V288zm0 112v336h640V400L512 600z" fill="currentColor"/>',
  },
  {
    name: 'Warning',
    label: '警告/提醒',
    pinyin: 'jinggao,tixing,jg',
    svgPath:
      '<path d="M512 64L64 896h896zm0 192l320 576H192zm-32 160h64v192h-64zm0 256h64v64h-64z" fill="currentColor"/>',
  },
  {
    name: 'InfoFilled',
    label: '信息/详情',
    pinyin: 'xinxi,xiangqing,xx',
    svgPath:
      '<path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm32 672h-64V448h64zm0-320h-64V352h64z" fill="currentColor"/>',
  },
  {
    name: 'SuccessFilled',
    label: '成功/完成',
    pinyin: 'chenggong,wancheng,cg',
    svgPath:
      '<path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm202.8 349.2l-248 248c-12.5 12.5-32.8 12.5-45.2 0l-120-120c-12.5-12.5-12.5-32.8 0-45.2s32.8-12.5 45.2 0L444 593.8l225.8-225.8c12.5-12.5 32.8-12.5 45.2 0s12.6 32.6-.2 45.2z" fill="currentColor"/>',
  },
];
