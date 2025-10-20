import { BrowserWindow } from 'electron';
import { CreateChatProps, MessagesStreamData } from '../types';
import { createProvider } from '../providers/createProvider';
import { configManager } from '../config';

/**
 * 聊天服务，负责处理与AI提供商的通信
 */
export class ChatService {
  private mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  /**
   * 处理聊天请求
   */
  async handleChatRequest(data: CreateChatProps) {
    const { providerName, messages, messageId, selectedModel } = data;
    console.log("发起对话");

    // 获取密钥
    const { DASHSCOPE_API_KEY, DASHSCOPE_URL, DEEPSEEK_API_KEY, DEEPSEEK_URL } =
      await configManager.getConfig();

    const provider = createProvider(
      providerName,
      DASHSCOPE_API_KEY || "",
      DASHSCOPE_URL || "",
      DEEPSEEK_API_KEY || "",
      DEEPSEEK_URL || ""
    );

    try {
      const stream = await provider.chat(messages, selectedModel);
      for await (const chunk of stream) {
        const content: MessagesStreamData = {
          messageId,
          data: chunk,
        };
        this.mainWindow.webContents.send("update-message", content);
      }
    } catch (error) {
      console.error("请求失败:", error);
    }
  }
}