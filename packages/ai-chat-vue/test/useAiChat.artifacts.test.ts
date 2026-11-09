/**
 * @atengk/ai-chat-vue useAiChat Artifact 产物总线与版本演进专项单测。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect, vi } from 'vitest';
import { useAiChat } from '../src/composables/useAiChat';

describe('useAiChat - Artifact 全局产物总线与不可变版本链', () => {
  it('应当在流式中识别 <artifact> 并自动收集产物、剥离正文且支持 openArtifact 打开侧边栏', async () => {
    const streamHandler = vi.fn(async (_prompt, onChunk) => {
      onChunk('为您生成了一个登录组件：\n');
      onChunk(
        '<artifact identifier="login-form" title="登录表单" language="vue">\n<template><form></form></template>\n</artifact>\n',
      );
      onChunk('请查看右侧产物工作台。');
    });

    const {
      messages,
      sendMessage,
      artifacts,
      activeArtifact,
      activeArtifactVersion,
      isArtifactSidebarOpen,
      openArtifact,
      closeArtifact,
    } = useAiChat({ streamHandler });

    await sendMessage('请生成登录表单');

    // 1. 验证正文剥离了长标签代码
    const assistantMsg = messages.value[1];
    expect(assistantMsg.content).toBe('为您生成了一个登录组件：\n\n请查看右侧产物工作台。');
    expect(assistantMsg.artifacts).toHaveLength(1);

    // 2. 验证全局 artifacts 总线收集
    expect(artifacts.value).toHaveLength(1);
    expect(artifacts.value[0].identifier).toBe('login-form');
    expect(artifacts.value[0].versions).toHaveLength(1);
    expect(artifacts.value[0].versions[0].code.trim()).toBe('<template><form></form></template>');

    // 3. 打开侧边栏
    expect(isArtifactSidebarOpen.value).toBe(false);
    openArtifact('login-form');
    expect(isArtifactSidebarOpen.value).toBe(true);
    expect(activeArtifact.value?.identifier).toBe('login-form');
    expect(activeArtifactVersion.value).toBe(1);

    // 4. 关闭侧边栏
    closeArtifact();
    expect(isArtifactSidebarOpen.value).toBe(false);
  });

  it('应当对相同 identifier 多次修改生成递增的不可变版本演进链', async () => {
    let callCount = 0;
    const streamHandler = vi.fn(async (_prompt, onChunk) => {
      callCount++;
      if (callCount === 1) {
        onChunk('<artifact identifier="counter" title="计数器" language="vue">code v1</artifact>');
      } else {
        onChunk(
          '<artifact identifier="counter" title="计数器 (增强版)" language="vue">code v2</artifact>',
        );
      }
    });

    const { sendMessage, artifacts, openArtifact, activeArtifactVersion, selectArtifactVersion } =
      useAiChat({ streamHandler });

    // 第一轮生成
    await sendMessage('生成计数器');
    expect(artifacts.value).toHaveLength(1);
    expect(artifacts.value[0].versions).toHaveLength(1);

    // 第二轮迭代
    await sendMessage('帮我把计数器升级为带有加减重置功能的版本');
    expect(artifacts.value).toHaveLength(1);
    expect(artifacts.value[0].title).toBe('计数器 (增强版)');
    expect(artifacts.value[0].versions).toHaveLength(2);
    expect(artifacts.value[0].versions[0].version).toBe(1);
    expect(artifacts.value[0].versions[1].version).toBe(2);

    // 打开最新版本
    openArtifact('counter');
    expect(activeArtifactVersion.value).toBe(2);

    // 切换至历史版本 1
    selectArtifactVersion(1);
    expect(activeArtifactVersion.value).toBe(1);
  });
});
