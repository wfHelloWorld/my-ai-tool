import fs from "fs/promises";
import { lookup } from "mime-types";
import { FileService } from "../../services/fileService";

/**
 * 基于首尾图生成
 * 适配 wan2.2-kf2v-flash 的 Provider
 */
export interface Wan22Kf2vFlashPayload {
  prompt?: string;
  negative_prompt?: string;
  template?: string; // 视频特效模板
  firstFramePath: string; // 必填，本地绝对路径
  lastFramePath?: string; // 选填，本地绝对路径
  
  model?: string; // wan2.2-kf2v-flash
  
  // 参数
  resolution?: "720P" | "1080P" | "480P";
  duration?: number;
  prompt_extend?: boolean;
  watermark?: boolean;
  seed?: number;

  apiKey?: string;
  createUrl?: string;
  taskBaseUrl?: string;
  
  clientId?: string;
  name?: string;
}

export type Wan22Kf2vFlashProgress =
  | { stage: "prepared"; message: string; taskId?: string }
  | { stage: "created"; taskId: string; status: string }
  | { stage: "poll"; try: number; status: string; taskId?: string }
  | { stage: "downloading"; url: string; outPath: string; taskId?: string }
  | { stage: "saved"; path: string; taskId?: string }
  | { stage: "failed"; taskId?: string; message: string }
  | { stage: "timeout"; taskId?: string }
  | { stage: "error"; taskId?: string; message: string };

interface VideoInputPayload {
  first_frame_url: string;
  last_frame_url?: string;
  prompt?: string;
  negative_prompt?: string;
  template?: string;
}

interface VideoParameters {
  resolution?: "720P" | "1080P" | "480P";
  duration?: number;
  prompt_extend?: boolean;
  watermark?: boolean;
  seed?: number;
}

interface CreateTaskResponse {
  output?: { task_id?: string };
  code?: number;
  message?: string;
}

interface PollResponse {
  output?: {
    task_status?: string;
    video_url?: string;
    code?: string;
    message?: string;
  };
}

export class Wanxiang22Kf2vFlashProvider {
  private apiKey?: string;
  private fileService: FileService;

  constructor(opts: { apiKey?: string } = {}) {
    this.apiKey = opts.apiKey;
    this.fileService = new FileService();
  }

  /**
   * 执行生视流程
   */
  async generate(payload: Wan22Kf2vFlashPayload, onProgress?: (info: Wan22Kf2vFlashProgress) => void): Promise<string[]> {
    const apiKey = payload.apiKey || this.apiKey;
    if (!apiKey) throw new Error("DASHSCOPE_API_KEY 未提供");

    const createUrl = payload.createUrl || "https://dashscope.aliyuncs.com/api/v1/services/aigc/image2video/video-synthesis";
    const taskBaseUrl = payload.taskBaseUrl || "https://dashscope.aliyuncs.com/api/v1/tasks";
    
    onProgress?.({ stage: "prepared", message: "正在处理输入文件..." });

    // 1. 处理首帧图片 (转Base64)
    if (!payload.firstFramePath) throw new Error("firstFramePath 必填");
    const firstFrameBase64 = await this.fileToDataUrl(payload.firstFramePath);

    // 2. 处理尾帧图片 (转Base64)
    let lastFrameBase64: string | undefined = undefined;
    if (payload.lastFramePath) {
        lastFrameBase64 = await this.fileToDataUrl(payload.lastFramePath);
    }

    // 3. 构建请求体
    const model = payload.model || "wan2.2-kf2v-flash";
    const input: VideoInputPayload = {
      first_frame_url: firstFrameBase64,
    };
    if (lastFrameBase64) input.last_frame_url = lastFrameBase64;
    if (payload.prompt) input.prompt = payload.prompt;
    if (payload.negative_prompt) input.negative_prompt = payload.negative_prompt;
    if (payload.template) input.template = payload.template;

    const parameters: VideoParameters = {};
    if (payload.resolution) parameters.resolution = payload.resolution;
    // duration fixed to 5, but API says parameter is optional and defaults to 5.
    // If user provides it, we send it, but validation is up to API.
    if (payload.duration) parameters.duration = payload.duration;
    if (payload.prompt_extend !== undefined) parameters.prompt_extend = payload.prompt_extend;
    if (payload.watermark !== undefined) parameters.watermark = payload.watermark;
    if (payload.seed !== undefined) parameters.seed = payload.seed;

    const body = {
      model,
      input,
      parameters,
    };

    console.log("[Wan22Kf2vFlashProvider] calling API:", createUrl);
    
    // 4. 发起任务
    const resp = await fetch(createUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Create task failed (${resp.status}): ${errText}`);
    }

    const respJson = await resp.json() as unknown as CreateTaskResponse;
    if (respJson.code) {
      throw new Error(`Create task API error: ${respJson.message || "Unknown"}`);
    }

    const taskId = respJson.output?.task_id;
    if (!taskId) throw new Error("No task_id returned");

    onProgress?.({ stage: "created", taskId, status: "PENDING" });

    // 5. 轮询
    const resultVideoUrl = await this.pollTask(taskBaseUrl, taskId, apiKey, onProgress);

    // 6. 下载
    onProgress?.({ stage: "downloading", url: resultVideoUrl, outPath: "", taskId });
    const savedPath = await this.fileService.saveVideoFromUrl(resultVideoUrl, `wan22-kf2v-${taskId}.mp4`);
    onProgress?.({ stage: "saved", path: savedPath, taskId });

    return [savedPath];
  }

  private async fileToDataUrl(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    const mime = lookup(filePath) || "application/octet-stream";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  }

  private async pollTask(
    baseUrl: string, 
    taskId: string, 
    apiKey: string,
    onProgress?: (info: Wan22Kf2vFlashProgress) => void
  ): Promise<string> {
    let retry = 0;
    const maxRetry = 1000000; // Removed timeout limit
    
    while (retry < maxRetry) {
      retry++;
      await new Promise(r => setTimeout(r, 2000)); // 2s interval

      try {
        const resp = await fetch(`${baseUrl}/${taskId}`, {
          headers: { "Authorization": `Bearer ${apiKey}` }
        });
        
        if (!resp.ok) {
           console.warn(`Poll task ${taskId} failed: ${resp.status}`);
           continue;
        }

    const json = await resp.json() as unknown as PollResponse;
    const status = json.output?.task_status;
        
        onProgress?.({ stage: "poll", try: retry, status: status || "UNKNOWN", taskId });

        if (status === "SUCCEEDED") {
          const videoUrl = json.output?.video_url;
          if (!videoUrl) throw new Error("Task succeeded but no video_url found");
          return videoUrl;
        } else if (status === "FAILED") {
          throw new Error(`Task failed: ${json.output?.code} - ${json.output?.message}`);
        } else if (status === "CANCELED") {
          throw new Error("Task canceled");
        }
        // RUNNING, PENDING, etc. -> continue
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Task failed") || msg.includes("Task canceled")) {
            throw err as Error;
        }
        console.warn(`Poll error: ${msg}`);
      }
    }
    
    onProgress?.({ stage: "timeout", taskId });
    throw new Error("Polling timeout");
  }
}
