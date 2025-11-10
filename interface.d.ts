export {}; // Ensure this file is treated as a module

declare global {
  interface Window {
    electronAPI: {
      startChat: (data: import('./src/types').CreateChatProps) => void;
      onUpdateMessage: (callback: import('./src/types').OnUpdatedCallback) => void;
      getFilePath: (file: File) => string;
      // 新增：确保图片存在于用户目录（若无原生路径则保存后返回）
      ensureImageStored: (file: File) => Promise<string>;
      copyImageToUserDir: (sourcePath: string) => Promise<string>;
      
      // 缓存相关（跨平台）
      getImagesCacheSize: () => Promise<number>;
      clearImagesCache: () => Promise<{ removedFiles: number; freedBytes: number }>;
      getImagesDirPath: () => Promise<string>;
      // 新增：打开 images 目录
      openImagesDir: () => Promise<{ success: boolean; error: string | null }>;

      onLogMessage: (callback: (log: { level: string; message: string }) => void) => void;
      getConfig: () => Promise<import('./src/types').AppConfig>;
      updateConfig: (config: Partial<import('./src/types').AppConfig>) => Promise<import('./src/types').AppConfig>;
      showContextMenu: (id: number) => void;
      onMenuNewConversation: (callback: () => void) => void;
      onMenuOpenSettings: (callback: () => void) => void;
      onDeleteConversation: (callback: (id: number) => void) => void;
      // zoom
      getZoomFactor: () => Promise<number>;
      setZoomFactor: (factor: number) => Promise<number>;
      onZoomFactorChanged: (callback: (factor: number) => void) => void;
    };
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $t: (key: string) => string;
  }
}
