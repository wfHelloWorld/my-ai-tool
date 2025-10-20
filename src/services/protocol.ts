import { protocol, net } from 'electron';
import { lookup } from 'mime-types';
import url from 'url';

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
      const filePath = decodeURIComponent(
        request.url.slice("safe-file://".length)
      );
      
      // 使用url和net直接访问本地文件
      const newFilePath = url.pathToFileURL(filePath).toString();
      console.log(newFilePath);
      return net.fetch(newFilePath);
    });
  }
}