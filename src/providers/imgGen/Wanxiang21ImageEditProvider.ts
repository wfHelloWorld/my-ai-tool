import { app } from "electron";
import fs from "fs/promises";
import path from "node:path";
import { lookup } from "mime-types";

/**
 * 适配 wanx2.1-imageedit 的独立 Provider
 * - 主进程使用：读取本地图片 → 转 dataURL → 创建异步任务 → 轮询结果 → 下载生成图片到用户目录
 */
export interface Wan21ImageEditPayload {
  prompt: string;
  imagePaths: string[]; // 本地绝对路径或 dataURL（第1张作为 base_image_url）
  functionMode: string; // 编辑模式，例如 "instruction", "style_ref" 等
  n?: number; // 生成数量，默认 1
  seed?: number; // 随机种子
  size?: string; // 图片尺寸
  apiKey?: string;
  outDirName?: string;
  clientId?: string;
  name?: string;
  createUrl: string; // https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis
  taskBaseUrl?: string; // https://dashscope.aliyuncs.com/api/v1/tasks
}

export interface Wan21ImageEditOptions {
  apiKey?: string;
  outDirName?: string;
}

export type Wan21ImageEditProgress =
  | { stage: "prepared"; imageCount: number; taskId?: string }
  | { stage: "created"; taskId: string; status: string }
  | { stage: "poll"; try: number; status: string; taskId?: string }
  | { stage: "downloading"; index: number; url: string; outPath: string; taskId?: string }
  | { stage: "saved"; index: number; path: string; taskId?: string }
  | { stage: "failed"; taskId?: string; message: string }
  | { stage: "timeout"; taskId?: string }
  | { stage: "error"; taskId?: string; message: string };

export class Wanxiang21ImageEditProvider {
  private apiKey?: string;
  private outDirName: string;

  constructor(opts: Wan21ImageEditOptions = {}) {
    this.apiKey = opts.apiKey;
    this.outDirName = opts.outDirName || "images";
  }

  async generate(payload: Wan21ImageEditPayload, onProgress?: (info: Wan21ImageEditProgress) => void): Promise<string[]> {
    const apiKey = payload.apiKey || this.apiKey;
    if (!apiKey) throw new Error("DASHSCOPE_API_KEY 未提供");

    const { createUrl, taskBaseUrl } = payload;
    if (!createUrl) throw new Error("createUrl 未提供");

    if (!payload.imagePaths?.length) {
      throw new Error("必须提供参考图片（base_image_url）");
    }

    // 本地图片转 dataURL
    const baseImageUrl = await this.fileToDataUrl(payload.imagePaths[0]);
    onProgress?.({ stage: "prepared", imageCount: 1 });

    const model = "wanx2.1-imageedit";
    console.log(`[Wanxiang21ImageEditProvider] generate start. model=${model}, function=${payload.functionMode}`);

    // 组装请求体
    const body = {
      model,
      input: {
        base_image_url: baseImageUrl,
        prompt: payload.prompt,
      },
      parameters: {
        function: payload.functionMode || "instruction",
        n: payload.n ?? 1,
        ...(payload.seed ? { seed: payload.seed } : {}),
        ...(payload.size ? { size: payload.size } : {}),
      },
    } as const;

    const created = await this.postJson(createUrl, body, apiKey);
    const taskId = created?.output?.task_id;
    if (!taskId) {
      const msg = created?.message || "未返回 task_id";
      throw new Error(`创建任务失败：${msg}`);
    }

    // 任务查询 URL
    let taskUrl: string | undefined;
    if (taskBaseUrl) {
      const base = taskBaseUrl.endsWith("/") ? taskBaseUrl.slice(0, -1) : taskBaseUrl;
      taskUrl = `${base}/${taskId}`;
    }
    if (!taskUrl) throw new Error("taskBaseUrl 未提供");

    let status: string = created?.output?.task_status || "PENDING";
    onProgress?.({ stage: "created", taskId, status });
    let tries = 0;
    const maxTries = 120; // 最长等 20 分钟
    const savedPaths: string[] = [];

    while (status !== "SUCCEEDED" && status !== "FAILED" && tries < maxTries) {
      await this.sleep(10_000); // 10s 轮询一次
      const r = await this.getJson(taskUrl, apiKey);
      const newStatus = r?.output?.task_status || status;
      if (newStatus !== status) {
        console.log(`[Wanxiang21ImageEditProvider] Status changed: ${status} -> ${newStatus} (try ${tries})`);
      }
      status = newStatus;
      onProgress?.({ stage: "poll", try: tries + 1, status, taskId });

      if (status === "SUCCEEDED") {
        console.log("[Wanxiang21ImageEditProvider] Task succeeded. Downloading results...");
        const results: Array<{ url?: string }> = r?.output?.results || [];
        for (let i = 0; i < results.length; i++) {
          const u = results[i]?.url;
          if (!u) continue;
          const out = await this.getOutputPath(i);
          console.log(`[Wanxiang21ImageEditProvider] Downloading image ${i} from ${u}`);
          onProgress?.({ stage: "downloading", index: i, url: u, outPath: out, taskId });
          const saved = await this.downloadToFile(u, out);
          console.log(`[Wanxiang21ImageEditProvider] Saved to ${saved}`);
          onProgress?.({ stage: "saved", index: i, path: saved, taskId });
          savedPaths.push(saved);
        }
        return savedPaths;
      }

      if (status === "FAILED") {
        const msg = typeof r?.output?.message === "string" ? r.output.message : "任务失败";
        console.error("[Wanxiang21ImageEditProvider] Task failed:", msg);
        onProgress?.({ stage: "failed", taskId, message: msg });
        throw new Error(msg);
      }
      tries++;
    }

    if (status !== "SUCCEEDED") {
      console.error("[Wanxiang21ImageEditProvider] Task timeout.");
      onProgress?.({ stage: "timeout", taskId });
      throw new Error("任务超时");
    }
    return savedPaths;
  }

  // ========== 辅助方法 ==========
  private async fileToDataUrl(p: string): Promise<string> {
    if (typeof p === "string" && p.startsWith("data:")) return p;
    const mime = lookup(p) || "image/png";
    const buf = await fs.readFile(p);
    const b64 = buf.toString("base64");
    return `data:${mime};base64,${b64}`;
  }

  private async postJson(
    url: string,
    body: unknown,
    apiKey: string
  ): Promise<{ output?: { task_id?: string; task_status?: string }; message?: string }> {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify(body),
    });
    // 注意：阿里云有时候 400 也会返回 json error message，所以这里先尝试解析
    try {
      const json = await resp.json();
      if (!resp.ok) {
        console.error("[Wanxiang21ImageEditProvider] post error:", json);
      }
      return json;
    } catch (e) {
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${text}`);
      }
      throw e;
    }
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
    const downloadsPath = app.getPath("downloads");
    const dir = this.outDirName ? path.join(downloadsPath, this.outDirName) : downloadsPath;
    await fs.mkdir(dir, { recursive: true });
    const filename = `wan21edit_result_${Date.now()}_${index}.png`;
    return path.join(dir, filename);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
  }
}

export default Wanxiang21ImageEditProvider;
