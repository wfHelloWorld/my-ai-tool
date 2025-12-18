import { BaseProvider } from "./BaseProvider";
import OpenAI from "openai";
import { ChatMessageProps, UniversalChunkProps, ChatExtraParams } from "../types";
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
	async chat(messages: ChatMessageProps[], model: string, extraParams?: ChatExtraParams) {
		const convertedMessages = await convertMessages(messages);

		const enableSearch = extraParams?.enable_search ?? false;
		const enableThinking = extraParams?.enable_thinking ?? false;
		const presencePenalty = extraParams?.presence_penalty;
		const enablePresencePenalty = extraParams?.enable_presence_penalty ?? false;
		const enableCodeInterpreter = extraParams?.enable_code_interpreter ?? false;
		const searchOptions = extraParams?.search_options;

		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		const stream = await this.client.chat.completions.create({
			model,
			messages: convertedMessages as {
				role: "user" | "assistant";
				content: string;
			}[],
			stream: true,
			...(enableSearch
				? {
					enable_search: true,
					search_options: {
						...(searchOptions?.forced_search !== undefined
							? { forced_search: searchOptions.forced_search }
							: {}),
						...(searchOptions?.search_strategy
							? { search_strategy: searchOptions.search_strategy }
							: {}),
						...(searchOptions?.enable_search_extension !== undefined
							? { enable_search_extension: searchOptions.enable_search_extension }
							: {}),
					},
				}
				: {}),
			...(enableThinking ? { enable_thinking: true } : {}),
			...(enablePresencePenalty && typeof presencePenalty === "number" ? { presence_penalty: presencePenalty } : {}),
			...(enableCodeInterpreter && enableThinking && model === "qwen3-max-preview"
				? { enable_code_interpreter: true }
				: {}),
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
