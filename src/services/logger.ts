import { BrowserWindow } from 'electron';

/**
 * 日志服务，负责处理日志记录和发送到渲染进程
 */
export class LoggerService {
  private mainWindow: BrowserWindow | null;
  private originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.setupConsoleOverrides();
    // 当窗口被销毁时，清空引用，避免向已销毁的 webContents 发送消息
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  /**
   * 切换或清空窗口引用
   */
  public setWindow(win: BrowserWindow | null) {
    this.mainWindow = win;
  }

  /**
   * 释放：恢复原始 console 方法
   */
  public dispose() {
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
  }

  /**
   * 发送日志给渲染进程
   */
  sendLogToRenderer(level: "info" | "warn" | "error", message: string) {
    try {
      const win = this.mainWindow;
      if (!win || win.isDestroyed()) return;
      const wc = win.webContents;
      if (!wc || wc.isDestroyed()) return;
      wc.send("log-message", { level, message });
    } catch (_) {
      // 在窗口销毁或不可用时可能抛错，这里安全吞掉
    }
  }

  /**
   * 设置控制台方法的重写
   */
  private setupConsoleOverrides() {
    this.overrideConsoleMethod("log", "info");
    this.overrideConsoleMethod("warn", "warn");
    this.overrideConsoleMethod("error", "error");
  }

  /**
   * 重写控制台方法
   */
  private overrideConsoleMethod(
    methodName: "log" | "warn" | "error",
    level: "info" | "warn" | "error"
  ) {
    const originalMethod = this.originalConsole[methodName];
    console[methodName] = (...args: any[]) => {
      originalMethod(...args);
      this.sendLogToRenderer(level, args.map(String).join(" "));
    };
  }

  /**
   * 发送测试日志
   */
  sendTestLogs() {
    console.log("窗口加载完成");
    console.warn("警告测试");
    console.error("错误测试");
  }
}