/**
 * @atengk/ai-chat-vue useAiChatSessions 单元测试。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAiChatSessions } from '../src/composables/useAiChatSessions';
import { LocalStorageAdapter } from '../src/storage/LocalStorageAdapter';
import type { ChatMessage } from '../src/types';

describe('useAiChatSessions', () => {
  let storage: LocalStorageAdapter;

  beforeEach(() => {
    storage = new LocalStorageAdapter({ prefix: 'test_sessions:' });
    storage.clear();
  });

  it('初始存储为空时自动创建默认会话', () => {
    const { sessions, currentSessionId, currentSession } = useAiChatSessions({
      storage,
      defaultTitle: '新的开始',
    });

    expect(sessions.value.length).toBe(1);
    expect(currentSession.value?.title).toBe('新的开始');
    expect(currentSession.value?.id).toBe(currentSessionId.value);
    expect(currentSession.value?.messages).toEqual([]);
  });

  it('新建会话并自动切换当前焦点', () => {
    const { sessions, currentSessionId, currentSession, createSession } = useAiChatSessions({
      storage,
    });

    const s1 = currentSession.value!;
    const s2 = createSession('技术方案讨论');

    expect(sessions.value.length).toBe(2);
    expect(currentSessionId.value).toBe(s2.id);
    expect(currentSession.value?.id).toBe(s2.id);
    expect(currentSession.value?.title).toBe('技术方案讨论');
    expect(s1.id).not.toBe(s2.id);
  });

  it('支持重命名与更新会话消息链并触发持久化', () => {
    const { currentSession, renameSession, updateSessionMessages } = useAiChatSessions({
      storage,
    });

    const sid = currentSession.value!.id;
    renameSession(sid, '重命名后的会话');
    expect(currentSession.value?.title).toBe('重命名后的会话');

    const msg: ChatMessage = {
      id: 'm1',
      role: 'user',
      status: 'completed',
      content: '你好',
      createdAt: Date.now(),
    };
    updateSessionMessages(sid, [msg]);

    expect(currentSession.value?.messages.length).toBe(1);
    expect(currentSession.value?.messages[0].content).toBe('你好');

    // 重新从 storage 初始化，模拟页面刷新无损回显
    const reloaded = useAiChatSessions({ storage });
    expect(reloaded.sessions.value.length).toBe(1);
    expect(reloaded.sessions.value[0].title).toBe('重命名后的会话');
    expect(reloaded.sessions.value[0].messages.length).toBe(1);
    expect(reloaded.sessions.value[0].messages[0].content).toBe('你好');
  });

  it('删除当前会话时自动转移激活焦点至剩余会话', () => {
    const { sessions, currentSessionId, createSession, deleteSession } = useAiChatSessions({
      storage,
    });

    const s1Id = currentSessionId.value;
    const s2 = createSession('会话2');
    expect(sessions.value.length).toBe(2);
    expect(currentSessionId.value).toBe(s2.id);

    // 删除当前激活的会话2
    deleteSession(s2.id);
    expect(sessions.value.length).toBe(1);
    expect(currentSessionId.value).toBe(s1Id);

    // 删除仅存的最后一个会话，触发新建默认会话兜底
    deleteSession(s1Id);
    expect(sessions.value.length).toBe(1);
    expect(currentSessionId.value).not.toBe(s1Id);
  });
});
