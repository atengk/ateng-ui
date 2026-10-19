/**
 * @atengk/core 原生 TS 自验工程主入口。
 *
 * @author Ateng
 * @since 2026-10-19
 */
import { VERSION } from '@atengk/core';

const app = document.getElementById('app');
if (app) {
  app.innerHTML = `<h1>sample-core: @atengk/core v${VERSION}</h1>`;
}
