import { BaseProvider } from "./BaseProvider";
import OpenAI from "openai";
import { ChatMessageProps, UniversalChunkProps } from "../types";
import { convertMessages } from "../hellpler";

export class OpenAiProvider extends BaseProvider {
  private client: OpenAI;

  constructor(apiKey: string, baseURL: string) {
    super();
    this.client = new OpenAI({
      apiKey,
      baseURL,
    });
  }
  async chat(messages: ChatMessageProps[], model: string) {
    // 转换图片
    const convertedMessages = await convertMessages(messages);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const stream = await this.client.chat.completions.create({
      model, // 模型列表：https://help.aliyun.com/zh/model-studio/getting-started/models
      messages: convertedMessages as {
        role: "user" | "assistant";
        content: string;
      }[],
      enable_search: true,
      stream: true,
      enable_thinking: true,
    });
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return {
      async *[Symbol.asyncIterator]() {
        for await (const chunk of stream) {
          yield self.transformResponse(chunk);
        }
      },
    };
  }

  protected transformResponse(
    chunk: OpenAI.Chat.Completions.ChatCompletionChunk
  ): UniversalChunkProps {
    const choice = chunk.choices[0];
    const delta = choice.delta as {
      content?: string;
      reasoning_content?: string;
    };
    return {
      is_end: choice.finish_reason === "stop",
      // result: choice.delta?.content || choice.delta?.reasoning_content || "",
      result: delta.content || delta.reasoning_content || "",
    };
  }
}
