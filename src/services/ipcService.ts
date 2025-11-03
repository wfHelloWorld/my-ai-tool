import { BrowserWindow, ipcMain } from 'electron';
import { ChatService } from './chatService';
import { FileService } from './fileService';
import { configManager } from '../config';
import { CreateChatProps } from '../types';
import { updateMenu, createContextMenu } from '../menu';

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
}