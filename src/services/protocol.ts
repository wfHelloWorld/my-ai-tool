import { protocol, net } from 'electron';
import url from 'url';
import path from 'node:path';
import { lookup } from 'mime-types';
import fs from 'fs/promises';

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
      console.log(`[SafeFile] Request URL: ${request.url}`);

      let normalizedPath = "";
      try {
        const urlObj = new URL(request.url);
        if (urlObj.searchParams.has("path")) {
          // 优先使用 query 参数传递的路径，这种方式最稳健，避免了 URL 路径解析的各种坑
          normalizedPath = urlObj.searchParams.get("path") || "";
          console.log(`[SafeFile] Path from query param: ${normalizedPath}`);
        } else {
          // 兼容旧的 URL 格式: safe-file:///C:/...
          // 提取路径部分
          // request.url 格式通常为: safe-file:///C:/Users/...
          // slice("safe-file://".length) -> /C:/Users/...
          let rawPath = request.url.slice("safe-file://".length);
          
          // 解码 (将 %20 等转回原始字符)
          rawPath = decodeURIComponent(rawPath);

          // Windows下，rawPath可能是 /C:\Users\... 这种形式，path.normalize会保留开头的/导致解析错误
          // 如果是 Windows 且路径以 / 开头后接盘符，去掉开头的 /
          if (process.platform === 'win32' && /^\/[a-zA-Z]:/.test(rawPath)) {
            rawPath = rawPath.slice(1);
          }
          console.log(`[SafeFile] Decoded Raw Path (Legacy): ${rawPath}`);
          normalizedPath = path.normalize(rawPath);
        }
      } catch (e) {
        console.error(`[SafeFile] URL parse error:`, e);
        // Fallback for malformed URLs
        let rawPath = request.url.slice("safe-file://".length);
        rawPath = decodeURIComponent(rawPath);
        if (process.platform === 'win32' && /^\/[a-zA-Z]:/.test(rawPath)) {
            rawPath = rawPath.slice(1);
        }
        normalizedPath = path.normalize(rawPath);
      }

      console.log(`[SafeFile] Final Normalized Path: ${normalizedPath}`);

      // 读取文件并返回响应，避免在不同平台上对 file:// 的支持差异
      try {
        const data = await fs.readFile(normalizedPath);
        const mimeType = lookup(normalizedPath) || 'application/octet-stream';
        console.log(`[SafeFile] Serving file via fs.readFile: ${normalizedPath} (${mimeType})`);
        
        return new Response(data, {
          headers: {
            'Content-Type': String(mimeType),
            'Access-Control-Allow-Origin': '*'
          },
        });
      } catch (err: any) {
        console.error(`[SafeFile] Error loading ${normalizedPath}:`, err);
        const message = err?.message || 'File not found';
        // 兜底：返回 404 与简短说明，便于调试
        return new Response(message, { status: 404 });
      }
    });
  }
}