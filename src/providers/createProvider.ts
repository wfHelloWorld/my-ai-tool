import { BaseProvider } from "./BaseProvider";
import { QianfanProvider } from "./QianfanProvider";
import { OpenAiProvider } from "./OpenAiProvider";

/**
 * 创建实例
 * @param providerName 模型的具体代码名称
 * @param DASHSCOPE_API_KEY 阿里密钥
 * @param QIANFAN_ACCESS_KEY 百度密钥(弃用)
 * @param QIANFAN_SECRET_KEY 百度密钥(弃用)
 * @param DEEPSEEK_API_KEY deepseek密钥
 * @returns providers 实例
 */
export function createProvider(
  providerName: string,
  DASHSCOPE_API_KEY: string,
  DASHSCOPE_URL: string,
  // QIANFAN_ACCESS_KEY?: string,
  // QIANFAN_SECRET_KEY?: string,
  DEEPSEEK_API_KEY: string,
  DEEPSEEK_URL: string
): BaseProvider {
  switch (providerName) {
    // case "百度智能云":
    //   if (QIANFAN_ACCESS_KEY && QIANFAN_SECRET_KEY) {
    //     return new QianfanProvider(QIANFAN_ACCESS_KEY, QIANFAN_SECRET_KEY);
    //   } else {
    //     throw new Error(`密钥错误`);
    //   }
    case "阿里云百炼":
      if (DASHSCOPE_API_KEY) {
        return new OpenAiProvider(
          DASHSCOPE_API_KEY,
          DASHSCOPE_URL
          // "https://dashscope.aliyuncs.com/compatible-mode/v1"
        );
      } else {
        throw new Error(`密钥错误`);
      }
    case "deepseek":
      if (DEEPSEEK_API_KEY) {
        return new OpenAiProvider(
          DEEPSEEK_API_KEY,
          DEEPSEEK_URL
          // "https://api.deepseek.com"
        );
      } else {
        throw new Error(`密钥错误`);
      }
    default:
      throw new Error(`不支持的提供商: ${providerName}`);
  }
}
