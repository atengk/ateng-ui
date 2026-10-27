/**
 * sample-file-viewer-vue 自验展厅入口。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { createApp } from 'vue';
import { install as installFileViewer } from '@atengk/file-viewer-vue';
import '@atengk/file-viewer-vue/style.css';
import App from './App.vue';

const app = createApp(App);

app.use(installFileViewer);

app.mount('#app');
