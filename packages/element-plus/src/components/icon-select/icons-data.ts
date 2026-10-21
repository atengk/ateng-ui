/**
 * 内建通用标准 Element Plus 图标库元数据与原生 SVG 路径字典（零外部依赖）。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { IconItem } from './types';

export const DEFAULT_ICONS: IconItem[] = [
  // 基础操作类
  {
    name: 'Search',
    label: '搜索',
    pinyin: 'sousuo,ss',
    svgPath:
      '<path d="M790.6 745.4L648.8 603.6c43.6-54.2 69.8-123.4 69.8-198.6 0-174.5-141.5-316-316-316S86.6 230.5 86.6 405s141.5 316 316 316c75.2 0 144.4-26.2 198.6-69.8l141.8 141.8c6.2 6.2 14.4 9.4 22.6 9.4s16.4-3.1 22.6-9.4c12.5-12.5 12.5-32.8 0-45.2zM150.6 405c0-139.2 112.8-252 252-252s252 112.8 252 252-112.8 252-252 252-252-112.8-252-252z" fill="currentColor"/>',
  },
  {
    name: 'Edit',
    label: '编辑/修改',
    pinyin: 'bianji,xiugai,bj',
    svgPath:
      '<path d="M880 112H680c-17.7 0-32 14.3-32 32s14.3 32 32 32h200v704H144V176h200c17.7 0 32-14.3 32-32s-14.3-32-32-32H144c-35.3 0-64 28.7-64 64v704c0 35.3 28.7 64 64 64h736c35.3 0 64-28.7 64-64V176c0-35.3-28.7-64-64-64z" fill="currentColor"/><path d="M304 600l-40 120 120-40 400-400-80-80z" fill="currentColor"/>',
  },
  {
    name: 'Delete',
    label: '删除/移除',
    pinyin: 'shanchu,yichu,sc',
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
    name: 'Minus',
    label: '减少/减号',
    pinyin: 'jianshao,jianhao,js',
    svgPath: '<path d="M160 480h704v64H160z" fill="currentColor"/>',
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
    label: '刷新/重载',
    pinyin: 'shuaxin,chongzai,sx',
    svgPath:
      '<path d="M784 384h-160l60-60C628 268 544 240 452 256c-132 23-238 129-261 261-33 189 110 351 297 351 133 0 244-88 279-209 5-17 23-27 40-22 17 5 27 23 22 40-42 145-175 251-341 251-224 0-396-194-356-421 28-158 156-286 314-314 110-20 211 14 289 83l67-67v175z" fill="currentColor"/>',
  },
  {
    name: 'Setting',
    label: '设置/系统配置',
    pinyin: 'shezhi,peizhi,sz',
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
    label: '下载/导出',
    pinyin: 'xiazai,daochu,xz',
    svgPath:
      '<path d="M512 672L288 448h160V128h128v320h160zM128 768h768v128H128z" fill="currentColor"/>',
  },
  {
    name: 'Upload',
    label: '上传/导入',
    pinyin: 'shangchuan,daoru,sc',
    svgPath:
      '<path d="M512 128l224 224H576v320H448V352H288zM128 768h768v128H128z" fill="currentColor"/>',
  },
  {
    name: 'Lock',
    label: '锁定/安全',
    pinyin: 'suoding,anquan,sd',
    svgPath:
      '<path d="M512 128c-106 0-192 86-192 192v96H224v480h576V416H704v-96c0-106-86-192-192-192zm-128 192c0-70.7 57.3-128 128-128s128 57.3 128 128v96H384v-96zm128 256c35.3 0 64 28.7 64 64 0 23.6-12.8 44.2-32 55.4V736h-64v-40.6c-19.2-11.2-32-31.8-32-55.4 0-35.3 28.7-64 64-64z" fill="currentColor"/>',
  },
  {
    name: 'Unlock',
    label: '解锁/开放',
    pinyin: 'jiesuo,kaifang,js',
    svgPath:
      '<path d="M384 320c0-70.7 57.3-128 128-128s128 57.3 128 128h64c0-106-86-192-192-192s-192 86-192 192v96H224v480h576V416H384v-96zm128 256c35.3 0 64 28.7 64 64 0 23.6-12.8 44.2-32 55.4V736h-64v-40.6c-19.2-11.2-32-31.8-32-55.4 0-35.3 28.7-64 64-64z" fill="currentColor"/>',
  },
  {
    name: 'Key',
    label: '钥匙/凭据/密钥',
    pinyin: 'yaoshi,pingju,miyao,ys',
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
    name: 'Hide',
    label: '隐藏/不可见',
    pinyin: 'yincang,bukejian,yc',
    svgPath:
      '<path d="M211.2 166.4l576 576-45.2 45.2-128-128C568 676.8 539.8 688 512 688c-202.7 0-374.1-127.1-448-256 36.3-63.3 93.3-124 168.4-171.6L166 195.2l45.2-28.8zM512 336c17.7 0 34.7 3.5 50.3 9.8l-166.5 166.5C392.2 496.7 388.7 479.7 388.7 462c0-69.6 53.7-126 123.3-126zm0-80c-202.7 0-374.1 127.1-448 256 26.6 46.4 64.9 92.5 113.6 132.8l56.8-56.8C201.2 553.2 173.2 516.3 150.6 480c55.3-95.6 186.2-192 361.4-192 68.2 0 131.7 14.5 186.8 39.8l53.2-53.2C685.2 258.8 602.8 256 512 256z" fill="currentColor"/>',
  },
  {
    name: 'CopyDocument',
    label: '复制文档',
    pinyin: 'fuzhi,wendang,fz',
    svgPath:
      '<path d="M768 256H320c-35.3 0-64 28.7-64 64v512c0 35.3 28.7 64 64 64h448c35.3 0 64-28.7 64-64V320c0-35.3-28.7-64-64-64zm0 576H320V320h448v512zM224 160h480v64H224v512h-64V224c0-35.3 28.7-64 64-64z" fill="currentColor"/>',
  },
  {
    name: 'Share',
    label: '分享',
    pinyin: 'fenxiang,fx',
    svgPath:
      '<path d="M752 672c-47.5 0-89.8 20.8-119 53.8L378.8 549.4c3.4-12.1 5.2-24.8 5.2-37.4s-1.8-25.3-5.2-37.4L633 297.8c29.2 33 71.5 53.8 119 53.8 88.4 0 160-71.6 160-160S840.4 31.6 752 31.6s-160 71.6-160 160c0 12.6 1.8 25.3 5.2 37.4L343 405.4c-29.2-33-71.5-53.8-119-53.8-88.4 0-160 71.6-160 160s71.6 160 160 160c47.5 0 89.8-20.8 119-53.8l254.2 176.4c-3.4 12.1-5.2 24.8-5.2 37.4 0 88.4 71.6 160 160 160s160-71.6 160-160-71.6-160-160-160z" fill="currentColor"/>',
  },
  {
    name: 'Link',
    label: '链接/外链',
    pinyin: 'lianjie,wailian,lj',
    svgPath:
      '<path d="M576 640l-64 64c-70.7 70.7-185.3 70.7-256 0s-70.7-185.3 0-256l64-64 45.2 45.2-64 64c-45.7 45.7-45.7 120.1 0 165.8s120.1 45.7 165.8 0l64-64L576 640zm-128-256l64-64c70.7-70.7 185.3-70.7 256 0s70.7 185.3 0 256l-64 64-45.2-45.2 64-64c45.7-45.7 45.7-120.1 0-165.8s-120.1-45.7-165.8 0l-64 64L448 384z" fill="currentColor"/>',
  },
  {
    name: 'Operation',
    label: '操作/指令',
    pinyin: 'caozuo,zhiling,cz',
    svgPath:
      '<path d="M128 224h256v256H128zm0 320h256v256H128zm320-320h448v256H448zm0 320h448v256H448z" fill="currentColor"/>',
  },
  {
    name: 'Tools',
    label: '工具箱',
    pinyin: 'gongju,gj',
    svgPath:
      '<path d="M784 576l-160-160 45.2-45.2c25-25 25-65.5 0-90.5L624 235c-25-25-65.5-25-90.5 0l-45.2 45.2L328 120 120 328l160 160-200 200v192h192l200-200 160 160 208-208-56-56z" fill="currentColor"/>',
  },

  // 导航与页面结构类
  {
    name: 'HomeFilled',
    label: '首页/主页',
    pinyin: 'shouye,zhuye,sy',
    svgPath: '<path d="M512 128L128 448v448h256V640h256v256h256V448z" fill="currentColor"/>',
  },
  {
    name: 'Menu',
    label: '菜单/目录',
    pinyin: 'caidan,mulu,cd',
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
    name: 'UserFilled',
    label: '用户实心',
    pinyin: 'yonghushixin,yh',
    svgPath:
      '<path d="M512 128a160 160 0 1 0 0 320 160 160 0 0 0 0-320zm-288 640c0-96 128-160 288-160s288 64 288 160v64H224v-64z" fill="currentColor"/>',
  },
  {
    name: 'Avatar',
    label: '头像',
    pinyin: 'touxiang,tx',
    svgPath:
      '<path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 160c61.9 0 112 50.1 112 112s-50.1 112-112 112-112-50.1-112-112 50.1-112 112-112zm0 608c-121.3 0-229.6-58.4-297.8-148.8 1.9-97.7 65.6-179.2 153.8-179.2 16.5 0 32.3 4.1 46.2 11.5 28.5 15.2 61.2 24.5 97.8 24.5s69.3-9.3 97.8-24.5c13.9-7.4 29.7-11.5 46.2-11.5 88.2 0 151.9 81.5 153.8 179.2C741.6 773.6 633.3 832 512 832z" fill="currentColor"/>',
  },
  {
    name: 'Folder',
    label: '文件夹',
    pinyin: 'wenjianjia,wjj',
    svgPath: '<path d="M128 192h256l64 64h448v640H128zm64 128v448h640V320z" fill="currentColor"/>',
  },
  {
    name: 'FolderOpened',
    label: '文件夹展开',
    pinyin: 'wenjianjiazhankai,wjj',
    svgPath:
      '<path d="M128 192h256l64 64h448v160H128zm768 288H128l96 416h672z" fill="currentColor"/>',
  },
  {
    name: 'Document',
    label: '文件/文档',
    pinyin: 'wenjian,wendang,wj',
    svgPath:
      '<path d="M288 128h384l192 192v576H288zm64 64v704h448V352H640V192z" fill="currentColor"/>',
  },
  {
    name: 'Tickets',
    label: '凭据/票据/工单',
    pinyin: 'pingju,piaoju,gongdan,gd',
    svgPath:
      '<path d="M160 160h704v704H160zm64 64v576h576V224zM320 320h384v64H320zm0 160h384v64H320zm0 160h256v64H320z" fill="currentColor"/>',
  },
  {
    name: 'Management',
    label: '管理/组织',
    pinyin: 'guanli,zuzhi,gl',
    svgPath:
      '<path d="M128 160h352v352H128zm0 384h352v320H128zm384-384h384v320H512zm0 352h384v352H512z" fill="currentColor"/>',
  },
  {
    name: 'Files',
    label: '档案/多文件',
    pinyin: "dang'an,duowenjian,da",
    svgPath:
      '<path d="M192 128h512v64H192zm-64 128h640v64H128zm128 128h512v512H256zm64 64v384h384V448z" fill="currentColor"/>',
  },
  {
    name: 'Grid',
    label: '宫格/九宫格',
    pinyin: 'gongge,jiugongge,gg',
    svgPath:
      '<path d="M160 160h192v192H160zm256 0h192v192H416zm256 0h192v192H672zm-512 256h192v192H160zm256 0h192v192H416zm256 0h192v192H672zm-512 256h192v192H160zm256 0h192v192H416zm256 0h192v192H672z" fill="currentColor"/>',
  },
  {
    name: 'List',
    label: '列表/清单',
    pinyin: 'liebiao,qingdan,lb',
    svgPath:
      '<path d="M128 224h128v128H128zm256 32h512v64H384zm-256 192h128v128H128zm256 32h512v64H384zm-256 192h128v128H128zm256 32h512v64H384z" fill="currentColor"/>',
  },

  // 监控与图表数据类
  {
    name: 'Monitor',
    label: '大屏/监控/终端',
    pinyin: 'daping,jiankong,zhongduan,jk',
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
    name: 'DataAnalysis',
    label: '数据分析',
    pinyin: 'shujufenxi,fenxi,sjfx',
    svgPath:
      '<path d="M192 192h640v640H192zm64 64v512h512V256zm64 416h64v-192h-64zm160 0h64v-320h-64zm160 0h64v-128h-64z" fill="currentColor"/>',
  },
  {
    name: 'TrendCharts',
    label: '趋势图表',
    pinyin: 'qushitu,tubiao,qst',
    svgPath:
      '<path d="M128 832h768v64H128zM192 640l192-256 160 160 320-320v192h64V160H656v64h192l-288 288-160-160L160 576z" fill="currentColor"/>',
  },
  {
    name: 'Cpu',
    label: '计算芯片/CPU',
    pinyin: 'jisuan,yingjian,cpu',
    svgPath:
      '<path d="M256 256h512v512H256zm64 64v384h384V320zM384 128h64v64h-64zm192 0h64v64h-64zm-192 704h64v64h-64zm192 0h64v64h-64zM128 384h64v64h-64zm0 192h64v64h-64zm704-192h64v64h-64zm0 192h64v64h-64z" fill="currentColor"/>',
  },

  // 状态反馈类
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
    name: 'ChatDotRound',
    label: '对话气泡',
    pinyin: 'duihua,qipao,dh',
    svgPath:
      '<path d="M512 128c-212 0-384 143.3-384 320 0 78.4 34.3 150.8 92.5 206.8L160 832l192-64c48.8 14.8 102.7 24 160 24 212 0 384-143.3 384-320S724 128 512 128zm-160 352a48 48 0 1 1 0-96 48 48 0 0 1 0 96zm160 0a48 48 0 1 1 0-96 48 48 0 0 1 0 96zm160 0a48 48 0 1 1 0-96 48 48 0 0 1 0 96z" fill="currentColor"/>',
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
  {
    name: 'CircleCheck',
    label: '校验通过',
    pinyin: 'jiaoyan,tongguo,tg',
    svgPath:
      '<path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 832c-211.7 0-384-172.3-384-384s172.3-384 384-384 384 172.3 384 384-172.3 384-384 384zm196.2-563.8L448 592.5l-132.2-132.3-45.3 45.3 177.5 177.5 304.5-304.5z" fill="currentColor"/>',
  },
  {
    name: 'CircleClose',
    label: '错误/拒绝',
    pinyin: 'cuowu,jujue,cw',
    svgPath:
      '<path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 832c-211.7 0-384-172.3-384-384s172.3-384 384-384 384 172.3 384 384-172.3 384-384 384zm181-565L512 466.8 331 285.8l-45.2 45.2L466.8 512 285.8 693l45.2 45.2L512 557.2l181 181 45.2-45.2L557.2 512l181-181z" fill="currentColor"/>',
  },
  {
    name: 'QuestionFilled',
    label: '帮助/疑问',
    pinyin: 'bangzhu,yiwen,bz',
    svgPath:
      '<path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 672a48 48 0 1 1 0-96 48 48 0 0 1 0 96zm80-240c-32 24-48 48-48 96h-64c0-64 24-96 64-128 32-24 48-48 48-80 0-44.2-35.8-80-80-80s-80 35.8-80 80h-64c0-79.5 64.5-144 144-144s144 64.5 144 144c0 48-24 88-64 112z" fill="currentColor"/>',
  },
  {
    name: 'Star',
    label: '收藏/标星',
    pinyin: 'shoucang,biaoxing,sc',
    svgPath:
      '<path d="M512 128l118.8 240.7 265.6 38.6-192.2 187.3 45.4 264.5L512 735.1 274.4 859.1l45.4-264.5-192.2-187.3 265.6-38.6z" fill="none" stroke="currentColor" stroke-width="48"/><path d="M512 233.8L426.6 407l-191 27.7 138.2 134.7-32.6 190.2L512 670.3l170.8 89.8-32.6-190.2 138.2-134.7-191-27.7z" fill="currentColor"/>',
  },

  // 时间与媒体类
  {
    name: 'Calendar',
    label: '日历/日程',
    pinyin: 'rili,richeng,rl',
    svgPath:
      '<path d="M128 192h768v704H128zm64 192v448h640V384zM256 96h64v128h-64zm448 0h64v128h-64z" fill="currentColor"/>',
  },
  {
    name: 'Clock',
    label: '时钟/时间',
    pinyin: 'shizhong,shijian,sz',
    svgPath:
      '<path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 832c-211.7 0-384-172.3-384-384s172.3-384 384-384 384 172.3 384 384-172.3 384-384 384zm32-608h-64v256l192 112 32-55.4L544 472V288z" fill="currentColor"/>',
  },
  {
    name: 'Timer',
    label: '定时器/秒表',
    pinyin: 'dingshiqi,miaobiao,dsq',
    svgPath:
      '<path d="M512 160c-212 0-384 172-384 384s172 384 384 384 384-172 384-384-172-384-384-384zm0 704c-176.4 0-320-143.6-320-320s143.6-320 320-320 320 143.6 320 320-143.6 320-320 320zm32-480h-64v224l160 96 32-55.4-128-76.6V384zM448 64h128v64H448z" fill="currentColor"/>',
  },
  {
    name: 'Picture',
    label: '图片/相册',
    pinyin: 'tupian,xiangce,tp',
    svgPath:
      '<path d="M128 160h768v704H128zm64 64v448l224-224 160 160 160-160 96 96V224zM320 384a64 64 0 1 1 0-128 64 64 0 0 1 0 128z" fill="currentColor"/>',
  },
];
