/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

declare module '*?worker' {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}

interface Window {
  MonacoEnvironment?: {
    getWorker?: (workerId: string, label: string) => Worker;
    getWorkerUrl?: (workerId: string, label: string) => string;
  };
}
