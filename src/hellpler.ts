// 工具类相关函数
import fs from "fs/promises";
import { ChatMessageProps } from "./types";
import { lookup } from "mime-types";

/**
 * 处理存在 imagePath的信息,目前只有处理含有 firstImagePath 的逻辑
 * @param messages messages信息
 * @returns 处理后的数据
 */
export async function convertMessages(messages: ChatMessageProps[]) {
  const convertedMesages = [];
  for (const message of messages) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let convertedContent: string | any[];
    // 如果有图片
    if (message.firstImagePath) {
      const imageBuffer = await fs.readFile(message.firstImagePath);
      const base64Image = imageBuffer.toString("base64");
      const mimeType = lookup(message.firstImagePath);
      convertedContent = [
        { type: "text", text: message.content || "" },

        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${base64Image}` },
        },
      ];
    } else {
      // 不存在图片
      convertedContent = message.content;
    }
    const { role } = message;
    convertedMesages.push({
      role,
      content: convertedContent,
    });
  }
  return convertedMesages;
}
