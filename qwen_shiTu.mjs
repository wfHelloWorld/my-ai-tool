// 千问识图
import OpenAI from "openai";
import fs from "fs/promises"; // fs/promises将所有金额扣都 promise化 方便调用

// 测试指令 node qwen_shiTu.mjs
try {
  const openai = new OpenAI({
    // 若没有配置环境变量，请用阿里云百炼API Key将下行替换为：apiKey: "sk-xxx",
    // apiKey: process.env["ALI_API_KEY"], // 在渲染进程中的调用方式
    apiKey: "sk-7b9e0055311243d399c4f2beea7f5518",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  });
  const imageBuffer = await fs.readFile(
    "/Users/wf/Desktop/iShot_2025-03-09_12.45.31.png"
  );
  const base64Image = imageBuffer.toString("base64");
  const stream = await openai.chat.completions.create({
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "图中是什么?" },

          {
            type: "image_url",
            image_url: { url: `data:image/png;base64,${base64Image}` },
          },
        ],
      },
    ],
    // stream: true, // 流式传输
    model: "qwen-vl-plus",
  });
  console.log("🚀 ~ createWindow ~ resp:", stream.choices[0].message);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  // for await (const chunk of stream) {
  //   console.log(chunk.choices[0]);
  // }
} catch (error) {
  console.log(`错误信息：${error}`);
  console.log(
    "请参考文档：https://help.aliyun.com/zh/model-studio/developer-reference/error-code"
  );
}
