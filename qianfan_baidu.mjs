import { ChatCompletion } from "@baiducloud/qianfan";
// 直接运行可能会出错,因为密钥的传输,之前是放在main.ts中测试


// 千帆大模型测试
const client = new ChatCompletion();
const stream = await client.chat(
  {
    // 多轮对话的数据,百度要求messages中对话的数量是奇数个(一问一答一问)
    messages: [
      { role: "user", content: "你好" },
      { role: "assistant", content: "你好！有什么我可以帮助你的吗？" },
      { role: "user", content: "给我讲一个笑话" },
    ],
    stream: true, // 流式传输
  },
  "ERNIE-Speed-128K" // 调用的模型
);
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
for await (const chunk of stream) {
  console.log(chunk);
}
