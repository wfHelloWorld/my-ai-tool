// 1. 抽象类（abstract class）
// 抽象类不能被实例化（不能用 new 创建对象）。
// 抽象类通常作为其他类的基类，提供公共的属性和方法定义。
// 抽象类可以包含具体实现的方法，也可以包含抽象方法（没有实现的方法）。
// 目的是定义一个模板或规范，子类继承后必须实现抽象方法。
// 2. 抽象方法（abstract method）
// 抽象方法只声明方法签名，没有具体实现。
// 3. 抽象方法 这里 transformResponse 是抽象方法，不能有 {} 方法体。
// 抽象方法只声明签名，不写实现。

import { ChatMessageProps, UniversalChunkProps, ChatExtraParams } from "../types";

// 继承抽象类的子类必须实现所有抽象方法，否则子类也必须声明为抽象类。
export abstract class BaseProvider {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	abstract chat(
		messages: ChatMessageProps[],
		modelName: string,
		extraParams?: ChatExtraParams
	): Promise<AsyncIterable<UniversalChunkProps>>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	protected abstract transformResponse(chunk: any): UniversalChunkProps;
}
