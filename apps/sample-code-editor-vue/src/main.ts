/**
 * sample-code-editor-vue 自验展厅入口。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import '@atengk/code-editor-vue/style.css';
import { setupViteMonacoWorkers } from '@atengk/code-editor-vue';
import App from './App.vue';

// 配置 Vite 原生 Web Worker
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

setupViteMonacoWorkers({
  editorWorker,
  jsonWorker,
  cssWorker,
  htmlWorker,
  tsWorker,
});

const app = createApp(App);

app.use(ElementPlus);

app.mount('#app');
