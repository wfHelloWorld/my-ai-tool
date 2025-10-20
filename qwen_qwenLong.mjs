// 千问识图
import OpenAI from "openai";
// import fs from "fs/promises"; // fs/promises将所有金额扣都 promise化 方便调用
import fs from "fs";


// 测试指令 node qwen_qwenLong.mjs
try {
  const openai = new OpenAI({
    // 若没有配置环境变量，请用阿里云百炼API Key将下行替换为：apiKey: "sk-xxx",
    // apiKey: process.env["ALI_API_KEY"], // 在渲染进程中的调用方式
    apiKey: "sk-7b9e0055311243d399c4f2beea7f5518",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  });

  const fileObj = await openai.files.create({
    file: fs.createReadStream("/Users/wf/Desktop/测试模板.docx"),
    purpose: "file-extract",
  });

  // console.log("🚀 ~ fileObj:", fileObj)

  const resp = await openai.chat.completions.create({
    messages: [
      { "role": "system", content: "you are a helpful assistant" },
      { "role": "system", content: `fileid://${fileObj.id}` }, // 传入长文本也是可以的
      {"role": "user", "content": "请帮忙概括这个文件讲述了什么"}
    ],
    model:'qwen-long'
  });
  console.log("🚀 ~ resp:", resp.choices[0].message)

  
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
