/**
 * sample-monitor 自验展厅主入口。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';

import { createVueErrorHandler } from '@atengk/monitor';
import App from './App.vue';
import { setupSampleMonitor } from './monitor';

const app = createApp(App);
const monitor = setupSampleMonitor();

// 挂载 Vue 框架全局错误处理器
app.config.errorHandler = createVueErrorHandler(monitor);

app.use(ElementPlus);
app.mount('#app');
