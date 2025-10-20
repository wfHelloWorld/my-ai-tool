// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer, webUtils } from "electron";
import { AppConfig, CreateChatProps, OnUpdatedCallback } from "./types";

// 使用TS,这里的接口需把类型添加到window上(interface.d.ts)
contextBridge.exposeInMainWorld("electronAPI", {
  startChat: (data: CreateChatProps) => ipcRenderer.send("start-chat", data),

  onUpdateMessage: (callback: OnUpdatedCallback) =>
    ipcRenderer.on("update-message", (_event, data) => {
      callback(data);
    }),

  getFilePath: (file: File) => webUtils.getPathForFile(file),

  copyImageToUserDir: (sourcePath: string) =>
    ipcRenderer.invoke("copy-image-to-user-dir", sourcePath),

  onLogMessage: (
    callback: (log: { level: string; message: string }) => void
  ) => {
    ipcRenderer.on("log-message", (_event, log) => {
      callback(log);
    });
  },
  getConfig: () => ipcRenderer.invoke("get-config"),
  updateConfig: (config: Partial<AppConfig>) =>
    ipcRenderer.invoke("update-config", config),
  showContextMenu: (id: number) => ipcRenderer.send("show-context-menu", id),
  // 从menu触发新建聊天
  onMenuNewConversation: (callback: () => void) =>
    ipcRenderer.on("menu-new-conversation", () => callback()),
  // 从menu触发打开设置
  onMenuOpenSettings: (callback: () => void) =>
    ipcRenderer.on("menu-open-settings", () => callback()),
  // 从右键菜单触发删除聊天
  onDeleteConversation: (callback: (id: number) => void) =>
    ipcRenderer.on("delete-conversation", (_event, id) => callback(id)),
});
