import { app } from "electron";
import fs from "fs/promises";
import path from "node:path";
import { lookup } from "mime-types";

/**
 * 适配 wan2.6-image 的 Provider
 * - 主进程使用：读取本地图片 → 转 dataURL → 创建异步任务 → 轮询结果 → 下载生成图片到用户目录
 */
export interface Wan26ImagePayload {
  prompt: string;
  imagePaths?: string[]; // 本地绝对路径或 dataURL（0-4 张）
  n?: number; // 生成数量
  seed?: number; // 随机种子
  watermark?: boolean; // 是否加水印
  size?: string; // 图片尺寸
  apiKey?: string;
  outDirName?: string;
  clientId?: string;
  name?: string;
  model?: string;
  // 参数
  enable_interleave?: boolean; // 图文混排模式 (true) 或 图像编辑模式 (false)
  prompt_extend?: boolean; // 智能改写
  
  // 由外部提供的 URL
  createUrl: string;
  taskBaseUrl?: string;
  taskUrlBuilder?: (taskId: string) => string;
}

export interface Wan26ImageOptions {
  apiKey?: string;
  outDirName?: string; // 默认 images
}

export type Wan26ImageProgress =
  | { stage: "prepared"; imageCount: number; taskId?: string }
  | { stage: "created"; taskId: string; status: string }
  | { stage: "poll"; try: number; status: string; taskId?: string }
  | { stage: "downloading"; index: number; url: string; outPath: string; taskId?: string }
  | { stage: "saved"; index: number; path: string; taskId?: string }
  | { stage: "failed"; taskId?: string; message: string }
  | { stage: "timeout"; taskId?: string }
  | { stage: "error"; taskId?: string; message: string };

export class Wanxiang26ImageProvider {
  private apiKey?: string;
  private outDirName: string;

  constructor(opts: Wan26ImageOptions = {}) {
    this.apiKey = opts.apiKey;
    this.outDirName = opts.outDirName || "images";
  }

  /**
   * 执行生图流程：创建任务 → 轮询状态 → 下载结果到本地
   */
  async generate(payload: Wan26ImagePayload, onProgress?: (info: Wan26ImageProgress) => void): Promise<string[]> {
    const apiKey = payload.apiKey || this.apiKey;
    if (!apiKey) throw new Error("DASHSCOPE_API_KEY 未提供");

    const { createUrl, taskBaseUrl, taskUrlBuilder } = payload;
    if (!createUrl) throw new Error("createUrl 未提供");

    const imagePaths = payload.imagePaths || [];
    // 使用图像编辑模式 (enable_interleave=false)，支持文生图和图生图
    // 注意：当 enable_interleave=false 时，input.messages 必须包含至少一张图片
    // 因此如果没有图片，应强制设为 true (纯文生图)；如果有图片，则设为 false (图生图/编辑)
    const enable_interleave = imagePaths.length === 0;
    
    if (imagePaths.length > 4) {
      throw new Error("最多支持 4 张参考图");
    }

    // 本地图片转 dataURL
    const images = [] as string[];
    for (const p of imagePaths) {
      images.push(await this.fileToDataUrl(p));
    }
    onProgress?.({ stage: "prepared", imageCount: images.length });

    const model = payload.model || "wan2.6-image";
    console.log(`[Wanxiang26ImageProvider] generate start. model=${model}, prompt=${payload.prompt?.slice(0, 50)}...`);

    // 构建 input.messages.content
    const contentArr: Array<{ text?: string; image?: string }> = [
      { text: payload.prompt }
    ];
    
    // 添加图片
    for (const imgData of images) {
      contentArr.push({ image: imgData });
    }

    // 组装请求体
    const body: {
      model: string;
      input: {
        messages: Array<{
          role: string;
          content: Array<{ text?: string; image?: string }>;
        }>;
      };
      parameters: {
        seed?: number;
        watermark: boolean;
        size: string;
        enable_interleave: boolean;
        prompt_extend: boolean;
        n?: number;
        max_images?: number;
      };
    } = {
      model,
      input: {
        messages: [
          {
            role: "user",
            content: contentArr
          }
        ]
      },
      parameters: {
        seed: payload.seed,
        watermark: payload.watermark ?? false,
        size: payload.size || "1280*1280",
        enable_interleave: enable_interleave,
        prompt_extend: payload.prompt_extend ?? true,
      },
    };

    // 处理 n
    // enable_interleave=true 时，API要求用 max_images
    // enable_interleave=false 时，API要求用 n
    if (enable_interleave) {
      body.parameters.n = 1;
      if (payload.n && payload.n > 1) {
        body.parameters.max_images = payload.n;
      }
    } else {
      body.parameters.n = payload.n ?? 1;
    }

    // 去除 undefined 属性
    if (body.parameters.seed === undefined) delete body.parameters.seed;

    const created = await this.postJson(createUrl, body, apiKey);
    const taskId = created?.output?.task_id;
    if (!taskId) throw new Error(created?.message || "创建任务失败：未返回 task_id");

    // 任务查询 URL
    let taskUrl: string | undefined;
    if (typeof taskUrlBuilder === "function") {
      taskUrl = taskUrlBuilder(taskId);
    } else if (taskBaseUrl) {
      const base = taskBaseUrl.endsWith("/") ? taskBaseUrl.slice(0, -1) : taskBaseUrl;
      taskUrl = `${base}/${taskId}`;
    }
    if (!taskUrl) throw new Error("task 查询 URL 未提供");

    let status: string = created?.output?.task_status || "PENDING";
    onProgress?.({ stage: "created", taskId, status });
    let tries = 0;
    const maxTries = 1000000; // Removed timeout limit
    const savedPaths: string[] = [];

    while (status !== "SUCCEEDED" && status !== "FAILED" && tries < maxTries) {
      await this.sleep(10_000);
      const r = await this.getJson(taskUrl, apiKey);
      const newStatus = r?.output?.task_status || status;
      if (newStatus !== status) {
        console.log(`[Wanxiang26ImageProvider] Status changed: ${status} -> ${newStatus} (try ${tries})`);
      }
      status = newStatus;
      onProgress?.({ stage: "poll", try: tries + 1, status, taskId });

      if (status === "SUCCEEDED") {
        const choices = r?.output?.choices || [];
        console.log(`[Wanxiang26ImageProvider] SUCCEEDED. Choices count: ${choices.length}`);
        
        // 根据文档: choices[].message.content[].image
        const imgUrls: string[] = [];
        
        if (Array.isArray(choices)) {
          for (const choice of choices) {
            const msgs = choice.message?.content || [];
            if (Array.isArray(msgs)) {
              for (const item of msgs) {
                // 兼容可能的字段名并去除空白
                const url = item.image || item.img || item.url;
                if (url && typeof url === "string") {
                  imgUrls.push(url.trim());
                } else if (item.type === "image") {
                   console.warn("[Wanxiang26ImageProvider] Image item found but no url:", item);
                }
              }
            }
          }
        }
        
        if (imgUrls.length === 0) {
           console.warn("[Wanxiang26ImageProvider] No images found in SUCCEEDED response:", JSON.stringify(r?.output));
        } else {
           console.log(`[Wanxiang26ImageProvider] Found ${imgUrls.length} images.`);
        }
        
        // 下载图片
        let idx = 0;
        for (const url of imgUrls) {
          idx++;
          const ext = ".png";
          const filename = `wan26-${taskId}-${idx}-${Date.now()}${ext}`;
          const downloadDir = app.getPath("downloads");
          const saveDir = path.join(downloadDir, this.outDirName);
          await fs.mkdir(saveDir, { recursive: true });
          const savePath = path.join(saveDir, filename);

          onProgress?.({ stage: "downloading", index: idx, url, outPath: savePath, taskId });
          console.log(`[Wanxiang26ImageProvider] Downloading image ${idx}: ${url} -> ${savePath}`);
          await this.downloadImage(url, savePath);
          savedPaths.push(savePath);
          onProgress?.({ stage: "saved", index: idx, path: savePath, taskId });
        }
        return savedPaths;
      } else if (status === "FAILED") {
        const msg = r?.output?.message || "Unknown error";
        onProgress?.({ stage: "failed", taskId, message: msg });
        throw new Error(`Task failed: ${msg}`);
      }

      tries++;
    }

    onProgress?.({ stage: "timeout", taskId });
    throw new Error("Task timed out");
  }

  // --- Helpers ---

  private async fileToDataUrl(filePath: string): Promise<string> {
    if (filePath.startsWith("data:")) return filePath;
    const p = filePath.startsWith("file://") ? filePath.slice(7) : filePath;
    const buf = await fs.readFile(p);
    const mime = lookup(p) || "application/octet-stream";
    return `data:${mime};base64,${buf.toString("base64")}`;
  }

  private async postJson(url: string, body: unknown, apiKey: string) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || `HTTP ${res.status}`);
    }
    return json;
  }

  private async getJson(url: string, apiKey: string) {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || `HTTP ${res.status}`);
    }
    return json;
  }

  private async downloadImage(url: string, savePath: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    await fs.writeFile(savePath, Buffer.from(arrayBuffer));
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
