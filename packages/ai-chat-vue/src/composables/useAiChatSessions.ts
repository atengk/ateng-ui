/**
 * @atengk/ai-chat-vue 多会话管理响应式状态机 Hook。
 *
 * 管理历史多会话列表、当前会话焦点切换、生命周期增删改与 StorageAdapter 自动持久化。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, computed, type Ref } from 'vue';
import type {
  ChatMessage,
  ChatSession,
  StorageAdapter,
  UseAiChatSessionsOptions,
  UseAiChatSessionsReturn,
} from '../types';
import { LocalStorageAdapter } from '../storage/LocalStorageAdapter';

/**
 * 生成带前缀的唯一会话标识符。
 */
function createSessionId(): string {
  return `session_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useAiChatSessions(options: UseAiChatSessionsOptions = {}): UseAiChatSessionsReturn {
  const storage: StorageAdapter = options.storage ?? new LocalStorageAdapter();
  const storageKey = options.storageKey ?? 'ateng_ai_chat_sessions';
  const defaultTitle = options.defaultTitle ?? '新对话';
  const autoCreate = options.autoCreate ?? true;

  const sessions: Ref<ChatSession[]> = ref([]);
  const currentSessionId: Ref<string> = ref('');

  /**
   * 将当前内存中的会话列表序列化写入存储。
   */
  const persistSessions = (): void => {
    try {
      const payload = {
        currentSessionId: currentSessionId.value,
        sessions: sessions.value,
      };
      void storage.setItem(storageKey, JSON.stringify(payload));
    } catch (err) {
      console.warn('[ateng-ui:ai-chat] 会话持久化写入失败：', err);
    }
  };

  /**
   * 从存储适配器中恢复历史会话。
   */
  const restoreSessions = (): void => {
    try {
      const raw = storage.getItem(storageKey);
      if (raw && typeof raw === 'string') {
        const parsed = JSON.parse(raw) as {
          currentSessionId?: string;
          sessions?: ChatSession[];
        };
        if (parsed.sessions && Array.isArray(parsed.sessions) && parsed.sessions.length > 0) {
          sessions.value = parsed.sessions;
          if (
            parsed.currentSessionId &&
            sessions.value.some(s => s.id === parsed.currentSessionId)
          ) {
            currentSessionId.value = parsed.currentSessionId;
          } else {
            const first = sessions.value[0];
            if (first) {
              currentSessionId.value = first.id;
            }
          }
          return;
        }
      }
    } catch (err) {
      console.warn('[ateng-ui:ai-chat] 会话历史反序列化失败，重置为空：', err);
    }

    // 若存储为空且开启了 autoCreate
    if (autoCreate) {
      const initialSession: ChatSession = {
        id: createSessionId(),
        title: defaultTitle,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      sessions.value = [initialSession];
      currentSessionId.value = initialSession.id;
      persistSessions();
    }
  };

  // 立即恢复会话
  restoreSessions();

  /**
   * 当前激活的会话实体。
   */
  const currentSession = computed<ChatSession | null>(() => {
    if (!currentSessionId.value) return null;
    return sessions.value.find(s => s.id === currentSessionId.value) ?? null;
  });

  /**
   * 新建一个独立会话并自动切换为当前会话。
   */
  const createSession = (title?: string, initialMessages: ChatMessage[] = []): ChatSession => {
    const newSession: ChatSession = {
      id: createSessionId(),
      title: title || defaultTitle,
      messages: [...initialMessages],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    sessions.value.unshift(newSession);
    currentSessionId.value = newSession.id;
    persistSessions();
    return newSession;
  };

  /**
   * 切换当前激活的会话。
   */
  const switchSession = (sessionId: string): void => {
    if (sessionId === currentSessionId.value) return;
    if (sessions.value.some(s => s.id === sessionId)) {
      currentSessionId.value = sessionId;
      persistSessions();
    }
  };

  /**
   * 重命名指定会话标题。
   */
  const renameSession = (sessionId: string, newTitle: string): void => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    const target = sessions.value.find(s => s.id === sessionId);
    if (target) {
      target.title = trimmed;
      target.updatedAt = Date.now();
      persistSessions();
    }
  };

  /**
   * 删除指定会话（若删除的是当前会话，自动切换至相邻会话）。
   */
  const deleteSession = (sessionId: string): void => {
    const idx = sessions.value.findIndex(s => s.id === sessionId);
    if (idx === -1) return;

    sessions.value.splice(idx, 1);

    if (currentSessionId.value === sessionId) {
      if (sessions.value.length > 0) {
        const nextActive = sessions.value[Math.min(idx, sessions.value.length - 1)];
        if (nextActive) {
          currentSessionId.value = nextActive.id;
        }
      } else if (autoCreate) {
        const fallback = createSession();
        currentSessionId.value = fallback.id;
        return;
      } else {
        currentSessionId.value = '';
      }
    }

    persistSessions();
  };

  /**
   * 清空所有历史会话并重置。
   */
  const clearAllSessions = (): void => {
    sessions.value = [];
    currentSessionId.value = '';
    if (autoCreate) {
      const fallback = createSession();
      currentSessionId.value = fallback.id;
    } else {
      persistSessions();
    }
  };

  /**
   * 更新当前或指定会话的消息链并触发持久化。
   */
  const updateSessionMessages = (sessionId: string, newMessages: ChatMessage[]): void => {
    const target = sessions.value.find(s => s.id === sessionId);
    if (target) {
      target.messages = [...newMessages];
      target.updatedAt = Date.now();
      // 若会话标题为默认标题且有了第一条用户提问，自动生成语义摘要标题
      if (target.title === defaultTitle && newMessages.length > 0) {
        const firstUserMsg = newMessages.find(m => m.role === 'user');
        if (firstUserMsg && firstUserMsg.content.trim()) {
          target.title = firstUserMsg.content.trim().slice(0, 20);
        }
      }
      persistSessions();
    }
  };

  return {
    sessions,
    currentSessionId,
    currentSession,
    createSession,
    switchSession,
    renameSession,
    deleteSession,
    clearAllSessions,
    updateSessionMessages,
  };
}
