import { BrowserWindow, ipcMain, shell } from 'electron';
import { ChatService } from './chatService';
import { FileService } from './fileService';
import { configManager } from '../config';
import { CreateChatProps } from '../types';
import { updateMenu, createContextMenu } from '../menu';
import { Wanxiang25PreviewProvider } from "../providers/imgGen/Wanxiang25PreviewProvider";
import { Wanxiang21ImageEditProvider, Wan21ImageEditProgress } from "../providers/imgGen/Wanxiang21ImageEditProvider";

/**
 * IPC服务，负责处理主进程和渲染进程之间的通信
 */
export class IpcService {
  private mainWindow: BrowserWindow;
  private chatService: ChatService;
  private fileService: FileService;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.chatService = new ChatService(mainWindow);
    this.fileService = new FileService();
    this.setupIpcHandlers();
  }

  /**
   * 设置IPC处理程序
   */
  private setupIpcHandlers() {
    this.setupChatHandlers();
    this.setupFileHandlers();
    this.setupConfigHandlers();
    this.setupContextMenuHandlers();
    this.setupZoomHandlers();
    this.setupImageGenHandlers();
  }

  /**
   * 设置聊天相关的IPC处理程序
   */
  private setupChatHandlers() {
    ipcMain.on("start-chat", async (event, data: CreateChatProps) => {
      await this.chatService.handleChatRequest(data);
    });
  }

  /**
   * 设置文件相关的IPC处理程序
   */
  private setupFileHandlers() {
    ipcMain.handle(
      "copy-image-to-user-dir",
      async (event, sourcePath: string) => {
        return await this.fileService.copyImageToUserDir(sourcePath);
      }
    );

    // 保存渲染进程传来的图片 base64 到用户目录
    ipcMain.handle(
      "save-image-blob",
      async (event, payload: { base64: string; filename: string }) => {
        const { base64, filename } = payload;
        return await this.fileService.saveImageFromBase64(base64, filename);
      }
    );

    // 获取 images 缓存目录大小（字节）
    ipcMain.handle("get-images-cache-size", async () => {
      return await this.fileService.getImagesCacheSize();
    });

    // 清空 images 缓存目录（保留目录）
    ipcMain.handle("clear-images-cache", async () => {
      return await this.fileService.clearImagesCache();
    });

    // 获取 images 目录绝对路径（便于在设置页展示与调试）
    ipcMain.handle("get-images-dir-path", async () => {
      return this.fileService.getImagesDirPath();
    });

    // 打开输出图片目录（系统“下载”目录下的 images 子目录）
    // 注意：此方法现已更名为 open-downloads-dir 以避免歧义，保留此旧名称但指向缓存目录供 Settings 使用
    ipcMain.handle("open-images-dir", async () => {
      const dir = this.fileService.getImagesDirPath();
      const result = await shell.openPath(dir);
      return { success: result === "", error: result || null };
    });

    // 打开下载/生成图片目录
    ipcMain.handle("open-downloads-dir", async () => {
      const dir = this.fileService.getDownloadsImagesDirPath();
      const result = await shell.openPath(dir);
      return { success: result === "", error: result || null };
    });
  }

  /**
   * 设置配置相关的IPC处理程序
   */
  private setupConfigHandlers() {
    ipcMain.handle("get-config", () => {
      return configManager.getConfig();
    });

    ipcMain.handle("update-config", async (event, newConfig) => {
      // 比较之前的语言设置以检测变化
      const previousConfig = await configManager.getConfig();
      const updatedConfig = await configManager.update(newConfig);
      
      if (
        newConfig &&
        typeof newConfig.language === "string" &&
        newConfig.language !== previousConfig.language
      ) {
        updateMenu(this.mainWindow);
      }
      
      return updatedConfig;
    });
  }

  /**
   * 设置上下文菜单相关的IPC处理程序
   */
  private setupContextMenuHandlers() {
    ipcMain.on("show-context-menu", (event, id: number) => {
      createContextMenu(this.mainWindow, id);
      // console.log("show-context-menu", id);
    });
  }

  /**
   * 设置缩放相关的IPC处理程序
   */
  private setupZoomHandlers() {
    ipcMain.handle("get-zoom-factor", () => {
      return this.mainWindow.webContents.getZoomFactor();
    });

    ipcMain.handle("set-zoom-factor", async (event, factor: number) => {
      // Chromium 使用 zoomLevel（以 1.2 为底的指数映射）
      // 将传入的 factor 量化到最近的 zoomLevel，以避免某些倍率下页面不变化
      const level = Math.round(Math.log(Math.max(0.2, Math.min(factor, 5))) / Math.log(1.2));
      // 为安全起见限制 level 范围（通常 -10 到 10 足够）
      const clampedLevel = Math.max(-10, Math.min(level, 10));
      this.mainWindow.webContents.setZoomLevel(clampedLevel);

      // 获取实际生效的缩放因子
      const effectiveFactor = this.mainWindow.webContents.getZoomFactor();

      // 同步到配置文件，并通知渲染进程更新
      await configManager.update({ fontSize: effectiveFactor });
      this.mainWindow.webContents.send("zoom-factor-changed", effectiveFactor);
      return effectiveFactor;
    });
  }

  /**
   * 设置生图相关的IPC处理程序（万相2.5预览）
   */
  private setupImageGenHandlers() {
    ipcMain.handle("wan25-preview", async (event, payload) => {
      try {
        const cfg = await configManager.getConfig();
        const apiKey = payload?.apiKey || cfg.DASHSCOPE_API_KEY;
        const provider = new Wanxiang25PreviewProvider({ apiKey });
        console.log("[wan25-preview] payload:", {
          ...payload,
          apiKey: apiKey ? `${String(apiKey).slice(0, 4)}***${String(apiKey).slice(-4)}` : "<missing>",
        });
        const clientId = payload?.clientId;
        const name = payload?.name;
        const result = await provider.generate(payload, (info) => {
          try {
            event.sender.send("wan25-preview-progress", { ...info, clientId, name });
          } catch (e) {
            console.warn("[wan25-preview] progress send failed:", String(e));
          }
        });
        console.log("[wan25-preview] result paths:", result);
        return result;
      } catch (err) {
        console.error("[wan25-preview] error:", err);
        try {
          event.sender.send("wan25-preview-progress", { stage: "error", message: err instanceof Error ? err.message : String(err), clientId: payload?.clientId, name: payload?.name });
        } catch (e) {
          console.warn("[wan25-preview] progress send failed in error:", String(e));
        }
        throw err;
      }
    });

    ipcMain.handle("wan21-imageedit", async (event, payload) => {
      try {
        const cfg = await configManager.getConfig();
        const apiKey = payload?.apiKey || cfg.DASHSCOPE_API_KEY;
        const provider = new Wanxiang21ImageEditProvider({ apiKey });
        console.log("[wan21-imageedit] payload:", {
          ...payload,
          apiKey: apiKey ? `${String(apiKey).slice(0, 4)}***${String(apiKey).slice(-4)}` : "<missing>",
        });
        const clientId = payload?.clientId;
        const name = payload?.name;
        const result = await provider.generate(payload, (info: Wan21ImageEditProgress) => {
          try {
            event.sender.send("wan21-imageedit-progress", { ...info, clientId, name });
          } catch (e) {
            console.warn("[wan21-imageedit] progress send failed:", String(e));
          }
        });
        console.log("[wan21-imageedit] result paths:", result);
        return result;
      } catch (err) {
        console.error("[wan21-imageedit] error:", err);
        try {
          event.sender.send("wan21-imageedit-progress", { stage: "error", message: err instanceof Error ? err.message : String(err), clientId: payload?.clientId, name: payload?.name });
        } catch (e) {
          console.warn("[wan21-imageedit] progress send failed in error:", String(e));
        }
        throw err;
      }
    });
  }
}
