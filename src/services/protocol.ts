import { protocol, net } from 'electron';
import url from 'url';
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
    protocol.handle("safe-file", (request) => {
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

      // 使用 net.fetch 读取 file:// 协议，Electron 会自动处理 Range 请求和 MIME 类型
      // 这是支持视频播放（流式传输/拖动进度条）的最佳实践
      const fileUrl = url.pathToFileURL(normalizedPath).toString();
      
      console.log(`[SafeFile] Serving via net.fetch: ${fileUrl}`);

      return net.fetch(fileUrl).catch((err: unknown) => {
        console.error(`[SafeFile] Error loading ${normalizedPath}:`, err);
        return new Response('File not found', { status: 404 });
      });
    });
  }
}