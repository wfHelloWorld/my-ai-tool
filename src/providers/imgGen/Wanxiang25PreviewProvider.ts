import { app } from "electron";
import fs from "fs/promises";
import path from "node:path";
import { lookup } from "mime-types";

/**
 * 适配 qwen_wanxiang2.5.mjs 的完全独立 Provider
 * - 主进程使用：读取本地图片 → 转 dataURL → 创建异步任务 → 轮询结果 → 下载生成图片到用户目录
 * - 不依赖项目其它 Provider/Service，可单独实例化与调用
 */
export interface Wan25PreviewPayload {
  prompt: string;
  imagePaths: string[]; // 本地绝对路径或 dataURL（1 或 2 张）
  n?: number; // 生成数量，默认 1
  seed?: number; // 随机种子，默认随机
  watermark?: boolean; // 是否加水印，默认 false
  size?: string; // 图片尺寸（可选），例如 1280x1280
  apiKey?: string; // 可覆盖构造函数传入的 key
  outDirName?: string; // 输出子目录名（默认 images）
  // 由外部提供的 URL，不在本文件拼接 endpoint
  createUrl: string; // 创建异步任务的完整 URL
  taskBaseUrl?: string; // 查询任务状态的基础 URL，例如 https://xxx/api/v1/tasks
  taskUrlBuilder?: (taskId: string) => string; // 自定义拼接函数（优先使用）
}

export interface Wan25PreviewOptions {
  apiKey?: string;
  outDirName?: string; // 默认 images
}

export type Wan25PreviewProgress =
  | { stage: "prepared"; imageCount: number }
  | { stage: "created"; taskId: string; status: string }
  | { stage: "poll"; try: number; status: string }
  | { stage: "downloading"; index: number; url: string; outPath: string }
  | { stage: "saved"; index: number; path: string }
  | { stage: "failed"; taskId?: string; message: string }
  | { stage: "timeout"; taskId?: string };

export class Wanxiang25PreviewProvider {
  private apiKey?: string;
  private outDirName: string;

  constructor(opts: Wan25PreviewOptions = {}) {
    this.apiKey = opts.apiKey;
    this.outDirName = opts.outDirName || "images";
  }

  /**
   * 执行预览生图流程：创建任务 → 轮询状态 → 下载结果到本地
   * 返回：保存后的本地绝对路径数组
   */
  async generate(payload: Wan25PreviewPayload, onProgress?: (info: Wan25PreviewProgress) => void): Promise<string[]> {
    const apiKey = payload.apiKey || this.apiKey;
    if (!apiKey) throw new Error("DASHSCOPE_API_KEY 未提供");

    // URL 由外部传入，不在此文件做过多逻辑
    const { createUrl, taskBaseUrl, taskUrlBuilder } = payload;
    if (!createUrl) throw new Error("createUrl 未提供");

    if (!payload.imagePaths?.length) {
      throw new Error("至少需要提供一张图片（路径或 dataURL）");
    }

    // 本地图片转 dataURL
    const images = [] as string[];
    for (const p of payload.imagePaths.slice(0, 3)) {
      images.push(await this.fileToDataUrl(p));
    }
    onProgress?.({ stage: "prepared", imageCount: images.length });

    // 组装请求体（与 mjs 保持一致，允许参数覆盖）
    const body = {
      model: "wan2.5-i2i-preview",
      input: {
        prompt: payload.prompt,
        images,
      },
      parameters: {
        n: payload.n ?? 1,
        seed: payload.seed ?? Math.floor(Math.random() * 2147483647),
        watermark: payload.watermark ?? false,
        ...(payload.size ? { size: payload.size } : {}),
      },
    } as const;

    const created = await this.postJson(createUrl, body, apiKey);
    const taskId = created?.output?.task_id;
    if (!taskId) throw new Error("创建任务失败：未返回 task_id");
    // 任务查询 URL：优先使用外部函数，其次使用外部提供的基础 URL
    let taskUrl: string | undefined;
    if (typeof taskUrlBuilder === "function") {
      taskUrl = taskUrlBuilder(taskId);
    } else if (taskBaseUrl) {
      const base = taskBaseUrl.endsWith("/") ? taskBaseUrl.slice(0, -1) : taskBaseUrl;
      taskUrl = `${base}/${taskId}`;
    }
    if (!taskUrl) throw new Error("task 查询 URL 未提供（taskUrlBuilder 或 taskBaseUrl）");

    let status: string = created?.output?.task_status || "PENDING";
    onProgress?.({ stage: "created", taskId, status });
    let tries = 0;
    const maxTries = 60; // 最长等 10 分钟（每次 10s）
    const savedPaths: string[] = [];

    while (status !== "SUCCEEDED" && status !== "FAILED" && tries < maxTries) {
      await this.sleep(10_000);
      const r = await this.getJson(taskUrl, apiKey);
      status = r?.output?.task_status || status;
      onProgress?.({ stage: "poll", try: tries + 1, status });

      if (status === "SUCCEEDED") {
        const results: Array<{ url?: string }> = r?.output?.results || [];
        for (let i = 0; i < results.length; i++) {
          const u = results[i]?.url;
          if (!u) continue;
          const out = await this.getOutputPath(i);
          onProgress?.({ stage: "downloading", index: i, url: u, outPath: out });
          const saved = await this.downloadToFile(u, out);
          onProgress?.({ stage: "saved", index: i, path: saved });
          savedPaths.push(saved);
        }
        return savedPaths;
      }

      if (status === "FAILED") {
        const msg = typeof r?.output?.message === "string" ? r.output.message : "任务失败";
        onProgress?.({ stage: "failed", taskId, message: msg });
        throw new Error(msg);
      }
      tries++;
    }

    if (status !== "SUCCEEDED") {
      onProgress?.({ stage: "timeout", taskId });
      throw new Error("任务超时");
    }
    return savedPaths;
  }

  // ========== 辅助方法 ==========
  private async fileToDataUrl(p: string): Promise<string> {
    // 若已是 dataURL，直接返回
    if (typeof p === "string" && p.startsWith("data:")) return p;
    // 与识图模块一致：fs.readFile + mime-types.lookup 生成 dataURL
    const mime = lookup(p) || "image/png";
    const buf = await fs.readFile(p);
    const b64 = buf.toString("base64");
    return `data:${mime};base64,${b64}`;
  }

  private async postJson(
    url: string,
    body: unknown,
    apiKey: string
  ): Promise<{ output?: { task_id?: string; task_status?: string } }> {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${text}`);
    }
    return resp.json();
  }

  private async getJson(
    url: string,
    apiKey: string
  ): Promise<{
    output?: {
      task_status?: string;
      results?: Array<{ url?: string }>;
      message?: string;
    };
  }> {
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${text}`);
    }
    return resp.json();
  }

  private async downloadToFile(url: string, outPath: string): Promise<string> {
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`下载失败 ${resp.status}`);
    const buf = Buffer.from(await resp.arrayBuffer());
    await fs.writeFile(outPath, buf);
    return outPath;
  }

  private async getOutputPath(index: number): Promise<string> {
    // 使用系统默认“下载”目录
    const downloadsPath = app.getPath("downloads");
    const dir = this.outDirName ? path.join(downloadsPath, this.outDirName) : downloadsPath;
    await fs.mkdir(dir, { recursive: true });
    const filename = `wan25_result_${Date.now()}_${index}.png`;
    return path.join(dir, filename);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
  }
}

export default Wanxiang25PreviewProvider;