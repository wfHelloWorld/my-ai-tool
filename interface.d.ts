import { CreateChatProps, OnUpdatedCallback, AppConfig } from "./src/types";
export interface IElectronAPI {
  startChat: (data: CreateChatProps) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdateMessage: (callback: OnUpdatedCallback) => any;
  showContextMenu: (id: number) => void;
  onDeleteConversation: (callback: (id: number) => void) => void;
  copyImageToUserDir: (sourcePath: string) => Promise<string>;
  getConfig: () => Promise<AppConfig>;
  updateConfig: (config: Partial<AppConfig>) => Promise<AppConfig>;
  onMenuNewConversation: (callback: () => void) => void;
  onMenuOpenSettings: (callback: () => void) => void;
  getFilePath: (file: File) => string;
  onLogMessage: (
    callback: (log: { level: string; message: string }) => void
  ) => void;
}
declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
