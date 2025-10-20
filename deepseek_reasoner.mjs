import OpenAI from "openai";
// import fs from "fs/promises"; // fs/promises将所有金额扣都 promise化 方便调用
import fs from "fs";

// 测试指令 node deepseek_reasoner.mjs
try {
  const openai = new OpenAI({
    apiKey: "sk-e3a498e6f83045ee8d1146208e1e22e3",
    baseURL: "https://api.deepseek.com",
  });

  // console.log("🚀 ~ fileObj:", fileObj)

  const stream = await openai.chat.completions.create({
    messages: [
      { role: "user", content: "我的蓝牙耳机坏了,应该去看牙医么" },
    ],
    stream: true,
    enable_search: true,

    model: "deepseek-reasoner",
  });
  // console.log(stream.choices[0].message);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  for await (const chunk of stream) {
    console.log(chunk.choices[0]);
  }
} catch (error) {
  console.log(`错误信息：${error}`);
}
