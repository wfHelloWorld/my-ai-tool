import { app, BrowserWindow, protocol } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import dotenv from "dotenv";
import { updateElectronApp } from "update-electron-app";
import { createMenu } from "./menu";
import { LoggerService } from "./services/logger";
import { ProtocolService } from "./services/protocol";
import { IpcService } from "./services/ipcService";
import { configManager } from "./config";

// 加载环境变量
dotenv.config();

// 注册自定义协议的特权
// 必须在 app ready 事件之前调用
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'safe-file',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

// 处理Windows安装/卸载时创建/删除快捷方式
if (started) {
  app.quit();
}

// 全局日志服务实例，避免重复覆盖 console 并在窗口生命周期中切换
let loggerService: LoggerService | null = null;

/**
 * 创建主窗口并初始化应用
 */
const createWindow = async () => {
  // 初始化配置
  await configManager.getConfig();

  // 创建浏览器窗口
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    // 隐藏系统标题文本（macOS）
    titleBarStyle: 'hiddenInset',
    // 在 Windows/macOS 上启用标题栏覆盖，通常不会显示窗口标题文本
    titleBarOverlay: true,
    // title: "我的AI创作工具", // 不显示标题，保留注释方便回退
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      // 启用 webSecurity (默认 true)，因为我们已通过 safe-file:// 协议和 IPC 安全地处理本地资源
      webSecurity: true,
    },
  });

  // 初始化菜单
  createMenu(mainWindow);
  
  // 初始化服务
  const protocolService = new ProtocolService();
  protocolService.registerProtocolHandlers();
  
  // 保持一个全局的 LoggerService，窗口重建时只切换引用
  if (!loggerService) {
    loggerService = new LoggerService(mainWindow);
  } else {
    loggerService.setWindow(mainWindow);
  }
  
  const ipcService = new IpcService(mainWindow);

  // 窗口加载完成后发送测试日志
  mainWindow.webContents.on("did-finish-load", () => {
    loggerService?.sendTestLogs();
  });

  // 当窗口关闭时清空日志服务的窗口引用
  mainWindow.on("closed", () => {
    loggerService?.setWindow(null);
  });

  // 加载应用的HTML
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // 更稳健的开发模式检测：仅在未打包且存在 Vite Dev Server 时打开
  if (!app.isPackaged && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools({ mode: "detach" }); // 独立打开一个调试工具窗口
  }
};

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.on("ready", createWindow);

// 当所有窗口关闭时退出应用，在macOS上除外
// 在macOS上，应用及其菜单栏通常会保持活动状态，直到用户使用Cmd + Q明确退出
app.on("window-all-closed", () => {
  // 在所有平台上，当最后一个窗口关闭时直接退出应用
  app.quit();
});

// 在macOS上，当点击dock图标并且没有其他窗口打开时，
// 通常会在应用程序中重新创建一个窗口
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.


// 在生产环境集成自动更新（使用 update.electronjs.org）
// 读取 .env 中的仓库信息与更新检查间隔
try {
  if (app.isPackaged) {
    const owner = process.env.GITHUB_OWNER;
    const repoName = process.env.GITHUB_REPO;
    const repo = owner && repoName ? `${owner}/${repoName}` : undefined;
    const updateInterval = process.env.UPDATE_INTERVAL || "1 hour"; // 例如 "10 minutes"、"1 hour"
    updateElectronApp({
      repo,
      updateInterval,
      // logger: console, // 调试时可启用，输出检查更新日志
      // notifyUser: true, // 如需弹窗提示用户更新
    });
  }
} catch (err) {
  console.warn("auto-update init failed:", err);
}