import { BaseProvider } from "./BaseProvider";
import { ChatCompletion } from "@baiducloud/qianfan";
import { BaiduChunkProps, ChatMessageProps, ChatExtraParams } from "../types";

export class QianfanProvider extends BaseProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any;
  constructor(accessKey: string, secretKey: string) {
    super();
    this.client = new ChatCompletion({
      QIANFAN_ACCESS_KEY: accessKey,
      QIANFAN_SECRET_KEY: secretKey,
      ENABLE_OAUTH: false,
    });
  }
	async chat(messages: ChatMessageProps[], model: string, _extraParams?: ChatExtraParams) {
    const stream = await this.client.chat(
      {
        messages: messages as {
          role: "user" | "assistant";
          content: string;
        }[],
        stream: true,
      },
      model
    );

    // return stream;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this; // 这里初始化 self
    return {
      async *[Symbol.asyncIterator]() {
        for await (const chunk of stream) {
          yield self.transformResponse(chunk);
        }
      },
    };
  }

  protected transformResponse(chunk: BaiduChunkProps): BaiduChunkProps {
    return {
      is_end: chunk.is_end,
      result: chunk.result,
    };
  }
}
