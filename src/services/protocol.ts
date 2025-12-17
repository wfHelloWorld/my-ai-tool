import { protocol } from 'electron';
import { lookup } from 'mime-types';
import url from 'url';
import fs from 'fs/promises';
import path from 'node:path';

/**
 * 协议处理服务，负责处理自定义协议
 */
export class ProtocolService {
  /**
   * 注册自定义协议处理器
   */
  registerProtocolHandlers() {
    this.registerSafeFileProtocol();
  }

  /**
   * 注册安全文件协议处理器
   * 用于安全地加载本地文件
   */
  private registerSafeFileProtocol() {
    protocol.handle("safe-file", async (request) => {
      // 取出自定义协议后的原始本地路径，并进行解码与规范化（Windows 下处理反斜杠与盘符）
      let rawPath = decodeURIComponent(
        request.url.slice("safe-file://".length)
      );

      // Windows下，rawPath可能是 /C:\Users\... 这种形式，path.normalize会保留开头的/导致解析错误
      // 如果是 Windows 且路径以 / 开头后接盘符，去掉开头的 /
      if (process.platform === 'win32' && /^\/[a-zA-Z]:/.test(rawPath)) {
        rawPath = rawPath.slice(1);
      }

      const normalizedPath = path.normalize(rawPath);

      // 读取文件并返回响应，避免在不同平台上对 file:// 的支持差异
      try {
        const data = await fs.readFile(normalizedPath);
        const mimeType = lookup(normalizedPath) || 'application/octet-stream';
        return new Response(data, {
          headers: {
            'Content-Type': String(mimeType),
          },
        });
      } catch (err: any) {
        const message = err?.message || 'File not found';
        // 兜底：返回 404 与简短说明，便于调试
        return new Response(message, { status: 404 });
      }
    });
  }
}