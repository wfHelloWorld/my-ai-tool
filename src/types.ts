export interface ConversationPorps {
  id: number;
  title: string;
  selectedModel: string;
  createdAt: string;
  updatedAt: string;
  providerId: number; // 使用哪一个AI模型创建的对话
}

export interface ProviderProps {
  id: number;
  name: string;
  title?: string;
  desc?: string;
  avatar?: string; // 图标
  createdAt: string;
  updatedAt: string;
  label: string;
  type: string; // 分类 文字,识图等
}

export type MessageStatus = "loading" | "streaming" | "finished";

export interface MessageProps {
  id: number;
  content: string;
  // reasoning_content: string;
  type: "question" | "answer";
  conversationId: number;
  status?: MessageStatus;
  createdAt: string;
  updatedAt: string;
  firstImagePath?: string;
  lastImagePath?: string;
}

export interface ChatMessageProps {
  role: string;
  content: string;
  firstImagePath?: string;
  lastImagePath?: string;
}

export interface CreateChatProps {
  messages: ChatMessageProps[];
  providerName: string;
  selectedModel: string;
  messageId: number;
}

export interface MessagesStreamData {
  messageId: number;
  data: {
    is_end: boolean;
    result: string;
  };
}

export type OnUpdatedCallback = (data: MessagesStreamData) => void;

export interface MessageListInstance {
  ref: HTMLDivElement;
}

/**
 * 通用大模型返回数据
 */
export interface UniversalChunkProps {
  is_end: boolean;
  result: string;
}
export interface BaiduChunkProps {
  is_end: boolean;
  result: string;
}

export interface AppConfig {
  language: "zh" | "en";
  fontSize: number;
  DASHSCOPE_API_KEY?: string;
  DASHSCOPE_URL?: string;
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_URL?: string;
}

export const DEFAULT_CONFIG: AppConfig = {
  language: "zh",
  fontSize: 1.00,
  DASHSCOPE_URL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  DEEPSEEK_URL: "https://api.deepseek.com",
};
