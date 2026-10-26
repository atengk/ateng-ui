/**
 * sample-video-player-vue 自验展厅入口。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { createApp } from 'vue';
import { install as installVideoPlayer } from '@atengk/video-player-vue';
import '@atengk/video-player-vue/style.css';
import App from './App.vue';

const app = createApp(App);

app.use(installVideoPlayer);

app.mount('#app');
