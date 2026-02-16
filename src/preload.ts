// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer, webUtils } from "electron";
import { AppConfig, CreateChatProps, OnUpdatedCallback } from "./types";
import type { Wan25PreviewPayload, Wan25PreviewProgress } from "./providers/imgGen/Wanxiang25PreviewProvider";

import type { Wan26ImagePayload, Wan26ImageProgress } from "./providers/imgGen/Wanxiang2.6ImageProvider";
import type { Wan26I2VPayload, Wan26I2VProgress } from "./providers/video/wan2.6-i2vProvider";
import type { Wan22Kf2vFlashPayload, Wan22Kf2vFlashProgress } from "./providers/video/wan2.2-kf2v-flashProvider";

// 使用TS,这里的接口需把类型添加到window上(interface.d.ts)
contextBridge.exposeInMainWorld("electronAPI", {
  startChat: (data: CreateChatProps) => ipcRenderer.send("start-chat", data),

  onUpdateMessage: (callback: OnUpdatedCallback) =>
    ipcRenderer.on("update-message", (_event, data) => {
      callback(data);
    }),

  getFilePath: (file: File) => webUtils.getPathForFile(file),

  // 优先使用原生路径；若无原生路径（例如压缩后新建的 File），则将文件内容保存到用户目录并返回路径
  ensureImageStored: async (file: File): Promise<string> => {
    const nativePath = webUtils.getPathForFile(file);
    if (nativePath) {
      // 将原生文件复制到用户目录，保证后续访问稳定
      const newPath = await ipcRenderer.invoke("copy-image-to-user-dir", nativePath);
      return newPath;
    }
    // 无原生路径：读取内容并保存到用户目录
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const filename = file.name || `image-${Date.now()}.png`;
    const savedPath = await ipcRenderer.invoke("save-image-blob", { base64, filename });
    return savedPath;
  },

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

  // 缓存：获取 images 目录大小（字节）
  getImagesCacheSize: async (): Promise<number> =>
    ipcRenderer.invoke("get-images-cache-size"),
  // 缓存：清空 images 目录
  clearImagesCache: async (): Promise<{ removedFiles: number; freedBytes: number }> =>
    ipcRenderer.invoke("clear-images-cache"),
  // 获取 images 目录绝对路径（便于在设置页展示与调试）
  getImagesDirPath: async (): Promise<string> =>
    ipcRenderer.invoke("get-images-dir-path"),

  // 打开 images 目录（系统文件管理器）-> 实际上是 Cache 目录
  openImagesDir: async (): Promise<{ success: boolean; error: string | null }> =>
    ipcRenderer.invoke("open-images-dir"),

  // 打开下载/生成图片目录
  openDownloadsDir: async (): Promise<{ success: boolean; error: string | null }> =>
    ipcRenderer.invoke("open-downloads-dir"),

  listDownloadsImages: async (): Promise<
    { name: string; path: string; size: number; mtimeMs: number; isDirectory: boolean }[]
  > => ipcRenderer.invoke("list-downloads-images"),

  // 获取 videos 目录绝对路径
  getVideosDirPath: async (): Promise<string> =>
    ipcRenderer.invoke("get-videos-dir-path"),

  // 打开 videos 目录
  openVideosDir: async (): Promise<{ success: boolean; error: string | null }> =>
    ipcRenderer.invoke("open-videos-dir"),

  listDownloadsVideos: async (): Promise<
    { name: string; path: string; size: number; mtimeMs: number; isDirectory: boolean }[]
  > => ipcRenderer.invoke("list-downloads-videos"),

  // 读取视频文件内容（返回 Buffer）
  readVideoFile: async (filePath: string): Promise<Uint8Array> =>
    ipcRenderer.invoke("read-video-file", filePath),

  // 缩放控制
  getZoomFactor: () => ipcRenderer.invoke("get-zoom-factor"),
  setZoomFactor: (factor: number) => ipcRenderer.invoke("set-zoom-factor", factor),
  onZoomFactorChanged: (callback: (factor: number) => void) =>
    ipcRenderer.on("zoom-factor-changed", (_e, factor) => callback(factor)),

  // 生图：万相2.5预览
  startWan25Preview: (payload: Wan25PreviewPayload): Promise<string[]> =>
    ipcRenderer.invoke("wan25-preview", payload),
  // 生图进度订阅：返回取消订阅函数，便于组件卸载时清理
  onWan25PreviewProgress: (callback: (info: Wan25PreviewProgress) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, info: Wan25PreviewProgress) => callback(info);
    ipcRenderer.on("wan25-preview-progress", handler);
    return () => ipcRenderer.off("wan25-preview-progress", handler);
  },



  // 生图：万相2.6-image
  startWan26Image: (payload: Wan26ImagePayload): Promise<string[]> =>
    ipcRenderer.invoke("wan26-image", payload),
  // 生图进度订阅（万相2.6-image）
  onWan26ImageProgress: (callback: (info: Wan26ImageProgress) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, info: Wan26ImageProgress) => callback(info);
    ipcRenderer.on("wan26-image-progress", handler);
    return () => ipcRenderer.off("wan26-image-progress", handler);
  },

  // 生视频：万相2.6-i2v
  startWan26I2V: (payload: Wan26I2VPayload): Promise<string[]> =>
    ipcRenderer.invoke("wan26-i2v", payload),
  // 生视频进度订阅（万相2.6-i2v）
  onWan26I2VProgress: (callback: (info: Wan26I2VProgress) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, info: Wan26I2VProgress) => callback(info);
    ipcRenderer.on("wan26-i2v-progress", handler);
    return () => ipcRenderer.off("wan26-i2v-progress", handler);
  },

  // 生视频：万相2.2-kf2v-flash
  startWan22Kf2vFlash: (payload: Wan22Kf2vFlashPayload): Promise<string[]> =>
    ipcRenderer.invoke("wan2.2-kf2v-flash", payload),
  // 生视频进度订阅（万相2.2-kf2v-flash）
  onWan22Kf2vFlashProgress: (callback: (info: Wan22Kf2vFlashProgress) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, info: Wan22Kf2vFlashProgress) => callback(info);
    ipcRenderer.on("wan2.2-kf2v-flash-progress", handler);
    return () => ipcRenderer.off("wan2.2-kf2v-flash-progress", handler);
  },


  // 直接缓存图片：传入 base64 与文件名，返回保存后的绝对路径
  saveImageBlob: async (base64: string, filename: string): Promise<string> =>
    ipcRenderer.invoke("save-image-blob", { base64, filename }),
});
