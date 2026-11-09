/**
 * @atengk/ai-chat-vue ArtifactDemuxer 流式产物解复用器。
 *
 * 基于有限状态自动机（FSM）从大模型文本流中抽离 <artifact>...</artifact> 与
 * <antArtifact>...</antArtifact> 标签，将大段源码剥离出普通气泡并提炼为
 * 不可变版本链 ArtifactPayload 实体。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { ArtifactPayload, ArtifactVersion } from '../types';

/**
 * 增量流式产物解复用输出。
 */
export interface ArtifactDemuxResult {
  /**
   * 剥离产物标签后的正文增量分块。
   */
  textChunk: string;

  /**
   * 本次分块中刚刚完成闭合并提取出的产物列表（可能包含新版本演进）。
   */
  artifacts: ArtifactPayload[];
}

interface PendingArtifactHeader {
  identifier: string;
  title: string;
  language: string;
  type?: string;
}

export class ArtifactDemuxer {
  private insideArtifact: boolean = false;
  private currentHeader: PendingArtifactHeader | null = null;
  private artifactCodeBuffer: string = '';
  private buffer: string = '';
  private content: string = '';

  // 内部全局产物字典：保持同一 identifier 的不可变版本链递增
  private artifactMap: Map<string, ArtifactPayload>;

  /**
   * 构造函数，支持注入跨会话轮次共享的历史产物映射。
   *
   * @param sharedArtifactMap 可选共享产物字典
   */
  constructor(sharedArtifactMap?: Map<string, ArtifactPayload>) {
    this.artifactMap = sharedArtifactMap || new Map();
  }

  /**
   * 从 HTML/XML 风格标签属性中提取指定属性值。
   */
  private static extractAttribute(tagStr: string, attrName: string): string {
    const reg = new RegExp(`${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([\\w-]+))`, 'i');
    const match = reg.exec(tagStr);
    if (!match) return '';
    return match[1] || match[2] || match[3] || '';
  }

  /**
   * 输入流式文本分块并执行多路解复用。
   *
   * @param chunk 文本流分块
   * @returns 纯净正文增量分块与就绪产物载荷列表
   */
  feed(chunk: string): ArtifactDemuxResult {
    if (!chunk) {
      return { textChunk: '', artifacts: [] };
    }

    let textOut = '';
    const emittedArtifacts: ArtifactPayload[] = [];

    const streamText = this.buffer + chunk;
    this.buffer = '';

    let cursor = 0;
    const len = streamText.length;

    while (cursor < len) {
      if (!this.insideArtifact) {
        // --- 正文处理态：寻找开启标签 <artifact 或 <antArtifact ---
        const remaining = streamText.slice(cursor);
        const lowerRemaining = remaining.toLowerCase();

        // 匹配开启标签起点
        const matchArtifact = lowerRemaining.indexOf('<artifact');
        const matchAntArtifact = lowerRemaining.indexOf('<antartifact');

        let openIdx = -1;
        let tagPrefixLen = 0;

        if (matchArtifact !== -1 && matchAntArtifact !== -1) {
          if (matchArtifact < matchAntArtifact) {
            openIdx = matchArtifact;
            tagPrefixLen = '<artifact'.length;
          } else {
            openIdx = matchAntArtifact;
            tagPrefixLen = '<antartifact'.length;
          }
        } else if (matchArtifact !== -1) {
          openIdx = matchArtifact;
          tagPrefixLen = '<artifact'.length;
        } else if (matchAntArtifact !== -1) {
          openIdx = matchAntArtifact;
          tagPrefixLen = '<antartifact'.length;
        }

        if (openIdx !== -1) {
          // 找到了开启标签的前缀，检查是否有闭合的 '>'
          const openTagCloseIdx = remaining.indexOf('>', openIdx + tagPrefixLen);
          if (openTagCloseIdx !== -1) {
            // 完整的开启标签已到达
            const textBefore = remaining.slice(0, openIdx);
            textOut += textBefore;
            this.content += textBefore;

            const fullOpenTag = remaining.slice(openIdx, openTagCloseIdx + 1);
            const identifier =
              ArtifactDemuxer.extractAttribute(fullOpenTag, 'identifier') ||
              `art_${Date.now().toString(36)}`;
            const title = ArtifactDemuxer.extractAttribute(fullOpenTag, 'title') || '代码交付物';
            const language =
              ArtifactDemuxer.extractAttribute(fullOpenTag, 'language') || 'markdown';
            const type = ArtifactDemuxer.extractAttribute(fullOpenTag, 'type') || 'code';

            this.currentHeader = { identifier, title, language, type };
            this.insideArtifact = true;
            this.artifactCodeBuffer = '';

            cursor += openTagCloseIdx + 1;
          } else {
            // 开启标签尚不完整（缺少 '>'），将前缀前正文输出，残余保留至 buffer
            const textBefore = remaining.slice(0, openIdx);
            textOut += textBefore;
            this.content += textBefore;
            this.buffer = remaining.slice(openIdx);
            cursor = len;
          }
        } else {
          // 未发现完整开启标签，检查尾部是否疑似开启标签前缀（如 "<", "<art", "<ant" 等）
          let matchPrefixLen = 0;
          for (let p = Math.min(12, remaining.length); p > 0; p--) {
            const tail = remaining.slice(-p).toLowerCase();
            if ('<artifact'.startsWith(tail) || '<antartifact'.startsWith(tail)) {
              matchPrefixLen = p;
              break;
            }
          }

          if (matchPrefixLen > 0) {
            const textBefore = remaining.slice(0, remaining.length - matchPrefixLen);
            textOut += textBefore;
            this.content += textBefore;
            this.buffer = remaining.slice(remaining.length - matchPrefixLen);
            cursor = len;
          } else {
            textOut += remaining;
            this.content += remaining;
            cursor = len;
          }
        }
      } else {
        // --- 产物代码收集态：寻找闭合标签 </artifact> 或 </antartifact> ---
        const remaining = streamText.slice(cursor);
        const lowerRemaining = remaining.toLowerCase();

        const matchClose1 = lowerRemaining.indexOf('</artifact>');
        const matchClose2 = lowerRemaining.indexOf('</antartifact>');

        let closeIdx = -1;
        let closeTagLen = 0;

        if (matchClose1 !== -1 && matchClose2 !== -1) {
          if (matchClose1 < matchClose2) {
            closeIdx = matchClose1;
            closeTagLen = '</artifact>'.length;
          } else {
            closeIdx = matchClose2;
            closeTagLen = '</antartifact>'.length;
          }
        } else if (matchClose1 !== -1) {
          closeIdx = matchClose1;
          closeTagLen = '</artifact>'.length;
        } else if (matchClose2 !== -1) {
          closeIdx = matchClose2;
          closeTagLen = '</antartifact>'.length;
        }

        if (closeIdx !== -1) {
          // 命中闭合标签
          const codeChunk = remaining.slice(0, closeIdx);
          this.artifactCodeBuffer += codeChunk;

          const header = this.currentHeader!;
          const finalCode = this.artifactCodeBuffer;

          // 维护不可变版本链
          let artifact = this.artifactMap.get(header.identifier);
          if (!artifact) {
            const initialVersion: ArtifactVersion = {
              version: 1,
              code: finalCode,
              timestamp: Date.now(),
            };
            artifact = {
              identifier: header.identifier,
              title: header.title,
              language: header.language,
              type: header.type as 'code' | 'markdown' | 'html' | 'svg',
              versions: [initialVersion],
            };
            this.artifactMap.set(header.identifier, artifact);
          } else {
            // 递增版本
            const nextVersionNumber = artifact.versions.length + 1;
            const newVersion: ArtifactVersion = {
              version: nextVersionNumber,
              code: finalCode,
              timestamp: Date.now(),
            };
            artifact.title = header.title || artifact.title;
            artifact.language = header.language || artifact.language;
            artifact.versions.push(newVersion);
          }

          emittedArtifacts.push(artifact);

          this.insideArtifact = false;
          this.currentHeader = null;
          this.artifactCodeBuffer = '';

          cursor += closeIdx + closeTagLen;
        } else {
          // 检查尾部是否疑似闭合标签前缀（如 "</", "</art", "</ant" 等）
          let matchPrefixLen = 0;
          for (let p = Math.min(14, remaining.length); p > 0; p--) {
            const tail = remaining.slice(-p).toLowerCase();
            if ('</artifact>'.startsWith(tail) || '</antartifact>'.startsWith(tail)) {
              matchPrefixLen = p;
              break;
            }
          }

          if (matchPrefixLen > 0) {
            const codeBefore = remaining.slice(0, remaining.length - matchPrefixLen);
            this.artifactCodeBuffer += codeBefore;
            this.buffer = remaining.slice(remaining.length - matchPrefixLen);
            cursor = len;
          } else {
            this.artifactCodeBuffer += remaining;
            cursor = len;
          }
        }
      }
    }

    return {
      textChunk: textOut,
      artifacts: emittedArtifacts,
    };
  }

  /**
   * 结束流式状态机并清空残余缓冲区。
   */
  finish(): ArtifactDemuxResult {
    let textOut = '';
    const emittedArtifacts: ArtifactPayload[] = [];

    if (this.buffer) {
      if (this.insideArtifact) {
        this.artifactCodeBuffer += this.buffer;
      } else {
        textOut += this.buffer;
        this.content += this.buffer;
      }
      this.buffer = '';
    }

    // 若未正常闭合标签，将已收集的代码保存或安全退回
    if (this.insideArtifact && this.currentHeader && this.artifactCodeBuffer) {
      const header = this.currentHeader;
      let artifact = this.artifactMap.get(header.identifier);
      if (!artifact) {
        artifact = {
          identifier: header.identifier,
          title: header.title,
          language: header.language,
          type: header.type as 'code' | 'markdown' | 'html' | 'svg',
          versions: [
            {
              version: 1,
              code: this.artifactCodeBuffer,
              timestamp: Date.now(),
            },
          ],
        };
        this.artifactMap.set(header.identifier, artifact);
      } else {
        artifact.versions.push({
          version: artifact.versions.length + 1,
          code: this.artifactCodeBuffer,
          timestamp: Date.now(),
        });
      }
      emittedArtifacts.push(artifact);
      this.insideArtifact = false;
      this.currentHeader = null;
      this.artifactCodeBuffer = '';
    }

    return {
      textChunk: textOut,
      artifacts: emittedArtifacts,
    };
  }

  /**
   * 获取所有已收集的全局产物列表。
   */
  getArtifacts(): ArtifactPayload[] {
    return Array.from(this.artifactMap.values());
  }

  /**
   * 获取累计纯净正文。
   */
  getContent(): string {
    return this.content;
  }
}
