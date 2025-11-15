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

    let dashscopeUrl = DASHSCOPE_URL || "";
    if (providerName === "阿里云百炼" && data.providerUrl) {
      dashscopeUrl = data.providerUrl;
    }
    console.log("🚀 ~ ChatService ~ handleChatRequest ~ dashscopeUrl:", dashscopeUrl)
    const provider = createProvider(
      providerName,
      DASHSCOPE_API_KEY || "",
      dashscopeUrl,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("请求失败:", error);
      // 将错误反馈到渲染进程，结束 loading 并显示错误信息
      const errMsg = typeof error?.message === 'string' ? error.message : String(error);
      const content: MessagesStreamData = {
        messageId,
        data: {
          is_end: true,
          result: `【错误】${errMsg}`,
        },
      };
      this.mainWindow.webContents.send("update-message", content);
    }
  }
}
