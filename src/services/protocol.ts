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
      // console.log(`[SafeFile] Request URL: ${request.url}`);
      let normalizedPath = "";

      try {
        // 方法1：尝试手动提取 path 参数（最稳健，不依赖 URL 类解析 custom protocol 的怪癖）
        // 匹配 ?path= 或 &path= 后面直到行尾或下一个 &
        const match = request.url.match(/[?&]path=([^&]+)/);
        if (match && match[1]) {
          const encodedPath = match[1];
          normalizedPath = decodeURIComponent(encodedPath);
          // console.log(`[SafeFile] Path extracted via regex: ${normalizedPath}`);
        } 
        // 方法2：如果没找到 path 参数，尝试作为旧版格式解析 (safe-file:///C:/...)
        else {
          // 移除协议头
          let rawPath = request.url.replace(/^safe-file:\/\//, '');
          
          // 如果以 / 开头（例如 safe-file:///C:/... 变成 /C:/...），先去掉
          // 注意：保留 query 参数前的部分
          rawPath = rawPath.split('?')[0]; 
          
          // 解码
          rawPath = decodeURIComponent(rawPath);

          // Windows 特殊处理：移除开头的 / (如果是 /C:/... 格式)
          if (process.platform === 'win32' && /^\/[a-zA-Z]:/.test(rawPath)) {
            rawPath = rawPath.slice(1);
          }
          normalizedPath = rawPath;
          // console.log(`[SafeFile] Path extracted via legacy logic: ${normalizedPath}`);
        }

        // 统一规范化路径
        if (normalizedPath) {
          normalizedPath = path.normalize(normalizedPath);
        }

      } catch (e) {
        console.error(`[SafeFile] Critical parse error:`, e);
        return new Response("Invalid URL", { status: 400 });
      }

      if (!normalizedPath) {
        return new Response("Path not found in URL", { status: 400 });
      }

      // 读取文件
      try {
        const data = await fs.readFile(normalizedPath);
        const mimeType = lookup(normalizedPath) || 'application/octet-stream';
        return new Response(data, {
          headers: {
            'Content-Type': String(mimeType),
            'Access-Control-Allow-Origin': '*'
          },
        });
      } catch (err: any) {
        console.error(`[SafeFile] Error loading ${normalizedPath}:`, err);
        return new Response("File not found", { status: 404 });
      }
    });
  }
}